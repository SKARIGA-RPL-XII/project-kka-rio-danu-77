// backend/src/middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// target folder: backend/public/uploads/courses
const uploadDir = path.resolve(__dirname, "..", "public", "uploads", "courses");

// pastikan folder ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("[upload] created folder:", uploadDir);
}

// sanitize filename (hapus karakter aneh)
function sanitizeFilename(name) {
  return name
    .normalize("NFKD")                 // normalisasi unicode
    .replace(/[\u0300-\u036f]/g, "")   // hapus diakritik
    .replace(/[^a-zA-Z0-9.\-_]/g, "-") // ganti karakter tak aman jadi '-'
    .replace(/-+/g, "-")               // gabung '-'
    .replace(/^\-+|\-+$/g, "");        // trim '-'
}

// storage config: pakai diskStorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    // ambil base name tanpa ext lalu sanitize
    const base = sanitizeFilename(path.basename(file.originalname, ext)).substring(0, 60) || "file";
    // tambahkan timestamp + random hex agar unik
    const rnd = crypto.randomBytes(4).toString("hex");
    const filename = `${Date.now()}-${rnd}-${base}${ext}`;
    cb(null, filename);
  },
});

// allowed mime/extension check (basic)
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  // "image/svg+xml" // hati-hati SVG karena XSS, enable hanya jika yakin aman
];

function fileFilter(req, file, cb) {
  if (!file || !file.mimetype) return cb(new Error("No file provided"), false);
  if (ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error("Only image files are allowed (jpg, png, gif, webp, avif)"), false);
}

// limits: max 5 MB (sesuaikan jika perlu)
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES },
});

module.exports = {
  upload,       // gunakan upload.single('thumbnail') atau upload.array(...)
  uploadDir,    // berguna untuk debugging / serve static
};
