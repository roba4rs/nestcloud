const {
    S3Client,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
  } = require("@aws-sdk/client-s3");
  const { createClient } = require("@supabase/supabase-js");
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  
  module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
  
    try {
      // 1. Verify user
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  
      if (!token) {
        return res.status(401).json({ error: "Missing bearer token" });
      }
  
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
  
      if (authError || !userData?.user) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
  
      const userId = userData.user.id;
  
      // 2. Validate body
      // parts: [{ partNumber: number, etag: string }]
      const { r2Key, uploadId, parts, fileName, mimeType, size, folderId } = req.body || {};
  
      if (!r2Key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ error: "r2Key, uploadId, and parts are required" });
      }
  
      if (!fileName || !size) {
        return res.status(400).json({ error: "fileName and size are required" });
      }
  
      // 3. Sanity-check that this r2Key belongs to this user
      // (key format: `${userId}/${timestamp}-${fileName}`)
      if (!r2Key.startsWith(`${userId}/`)) {
        return res.status(403).json({ error: "r2Key does not belong to this user" });
      }
  
      // 4. Complete the multipart upload on R2
      let completeError = null;
      try {
        await r2.send(
          new CompleteMultipartUploadCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2Key,
            UploadId: uploadId,
            MultipartUpload: {
              // R2/S3 requires parts sorted by partNumber
              Parts: parts
                .slice()
                .sort((a, b) => a.partNumber - b.partNumber)
                .map((p) => ({
                  PartNumber: p.partNumber,
                  ETag: p.etag,
                })),
            },
          })
        );
      } catch (err) {
        completeError = err;
      }
  
      if (completeError) {
        // Try to abort the dangling upload so it doesn't consume R2 storage
        try {
          await r2.send(
            new AbortMultipartUploadCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: r2Key,
              UploadId: uploadId,
            })
          );
        } catch (abortErr) {
          console.error("complete-multipart-upload: abort also failed:", abortErr);
        }
        console.error("complete-multipart-upload: CompleteMultipartUpload failed:", completeError);
        return res.status(500).json({ error: "Failed to complete multipart upload" });
      }
  
      // 5. Insert the files row into Supabase
      const { data: fileRow, error: insertError } = await supabase
        .from("files")
        .insert({
          user_id: userId,
          folder_id: folderId || null,
          name: fileName,
          size: size,
          mime_type: mimeType || "application/octet-stream",
          r2_key: r2Key,
        })
        .select()
        .single();
  
      if (insertError) {
        // Object is committed to R2 but DB row failed — log for manual reconciliation
        console.error(
          "complete-multipart-upload: R2 upload committed but files row insert failed:",
          insertError,
          { r2Key, userId, fileName }
        );
        return res.status(500).json({
          error: "Upload committed to storage but file record could not be saved. Contact support.",
        });
      }
  
      // 6. Increment user_storage.used_bytes
      const { error: storageError } = await supabase.rpc("increment_storage", {
        user_id: userId,
        bytes: size,
      });
  
      if (storageError) {
        // Non-fatal: the file is saved, storage counter is just stale
        console.error(
          "complete-multipart-upload: increment_storage RPC failed (file saved OK):",
          storageError
        );
      }
  
      return res.status(200).json({ file: fileRow });
    } catch (err) {
      console.error("complete-multipart-upload error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };