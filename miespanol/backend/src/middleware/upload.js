// backend/src/middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Simpan file ke:
// backend/public/uploads/courses
const uploadDir = path.resolve(__dirname, "..", "..", "public", "uploads", "courses");

// pastikan folder ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("[upload] folder dibuat:", uploadDir);
}

// bersihkan nama file agar aman
function sanitizeFilename(name) {
  return String(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = sanitizeFilename(path.basename(file.originalname, ext)).slice(0, 60) || "file";
    const randomPart = crypto.randomBytes(4).toString("hex");
    const finalName = `${Date.now()}-${randomPart}-${baseName}${ext}`;
    cb(null, finalName);
  },
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

function fileFilter(req, file, cb) {
  if (!file || !file.mimetype) {
    return cb(new Error("File tidak ditemukan"));
  }

  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error("Hanya file gambar yang diperbolehkan"));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = {
  upload,
  uploadDir,
};