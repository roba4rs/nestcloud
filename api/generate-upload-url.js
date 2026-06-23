const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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

const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

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

    const { fileName, mimeType, size, folderId } = req.body || {};

    if (!fileName || !size) {
      return res.status(400).json({ error: "fileName and size are required" });
    }

    // 2. Re-check storage_limit vs used_bytes server-side (not authoritative on frontend)
    const { data: storageRow, error: storageError } = await supabase
      .from("user_storage")
      .select("used_bytes, storage_limit, plan_active")
      .eq("user_id", userId)
      .single();

    if (storageError || !storageRow) {
      return res.status(500).json({ error: "Could not load storage record" });
    }

    if (!storageRow.plan_active) {
      return res.status(403).json({ error: "Plan inactive — uploads disabled" });
    }

    if (storageRow.used_bytes + size > storageRow.storage_limit) {
      return res.status(403).json({ error: "Storage limit exceeded" });
    }

    // 3. Generate a unique r2Key
    const r2Key = `${userId}/${Date.now()}-${fileName}`;

    // 4. Files under 100MB: single presigned PUT URL
    if (size < MULTIPART_THRESHOLD) {
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: r2Key,
        ContentType: mimeType || "application/octet-stream",
      });

      const url = await getSignedUrl(r2, command, { expiresIn: 3600 });

      return res.status(200).json({ url, r2Key });
    }

    // 5. Files 100MB+: multipart upload initiation — NOT YET IMPLEMENTED (step 6)
    return res.status(501).json({
      error: "Multipart upload not yet implemented for files 100MB+",
    });
  } catch (err) {
    console.error("generate-upload-url error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};