const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
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
    // 1. Verify user via Supabase service role
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

    const { fileId, r2Key } = req.body || {};

    if (!fileId || !r2Key) {
      return res.status(400).json({ error: "fileId and r2Key are required" });
    }

    // 2. Verify user owns the file
    const { data: fileRow, error: fileError } = await supabase
      .from("files")
      .select("id, user_id, r2_key, size")
      .eq("id", fileId)
      .single();

    if (fileError || !fileRow) {
      return res.status(404).json({ error: "File not found" });
    }

    if (fileRow.user_id !== userId) {
      return res.status(403).json({ error: "You do not own this file" });
    }

    if (fileRow.r2_key !== r2Key) {
      return res.status(400).json({ error: "r2Key does not match file record" });
    }

    // 3. Delete R2 object
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileRow.r2_key,
      })
    );

    // 4. Delete Supabase files row
    const { error: deleteRowError } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId);

    if (deleteRowError) {
      console.error("delete-file: failed to delete files row:", deleteRowError);
      return res.status(500).json({
        error: "R2 object deleted but failed to remove file record",
      });
    }

    // 5. Decrement user_storage.used_bytes atomically via RPC
    const { error: rpcError } = await supabase.rpc("decrement_storage", {
      user_id: userId,
      bytes: fileRow.size,
    });

    if (rpcError) {
      console.error("delete-file: decrement_storage RPC failed:", rpcError);
      return res.status(500).json({
        error: "File deleted but storage usage could not be updated",
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("delete-file error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};