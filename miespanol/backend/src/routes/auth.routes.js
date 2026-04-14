const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { authMiddleware } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "rahasia_miespanol";

const avatarDir = path.resolve(__dirname, "..", "..", "public", "uploads", "avatars");

if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 40);
    const rnd = crypto.randomBytes(4).toString("hex");
    cb(null, `${Date.now()}-${rnd}-${base}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Avatar harus gambar"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function deleteOldAvatar(photoUrl) {
  try {
    if (!photoUrl) return;
    const oldPath = path.resolve(
      __dirname,
      "..",
      "..",
      "public",
      String(photoUrl).replace(/^\/+/, "")
    );
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  } catch (e) {
    console.warn("hapus avatar lama gagal:", e.message);
  }
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    const [r] = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hash]
    );

    const token = jwt.sign(
      { id: r.insertId, role: "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("REGISTER error:", err);
    res.status(400).json({ error: "Email already used" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) return res.status(401).json({ error: "Invalid login" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid login" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error("LOGIN error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, photo FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    return res.json({ user: rows[0] });
  } catch (err) {
    console.error("GET /me error:", err);
    return res.status(500).json({ message: "Gagal mengambil data user" });
  }
});

router.put("/me", authMiddleware, avatarUpload.single("photo"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const [rows] = await pool.query(
      "SELECT id, name, email, role, photo FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const user = rows[0];
    let photo = user.photo || null;

    if (req.file) {
      if (user.photo) deleteOldAvatar(user.photo);
      photo = `/uploads/avatars/${req.file.filename}`;
    }

    await pool.query(
      "UPDATE users SET name = ?, photo = ? WHERE id = ?",
      [name?.trim() || user.name, photo, userId]
    );

    const [fresh] = await pool.query(
      "SELECT id, name, email, role, photo FROM users WHERE id = ?",
      [userId]
    );

    return res.json({ user: fresh[0] });
  } catch (err) {
    console.error("PUT /me error:", err);
    return res.status(500).json({
      message: "Gagal update profil",
      error: err.message,
    });
  }
});

module.exports = router;