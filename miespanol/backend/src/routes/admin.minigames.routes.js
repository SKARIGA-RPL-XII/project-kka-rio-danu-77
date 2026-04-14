const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const pool = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

const uploadDir = path.resolve(__dirname, "..", "..", "public", "uploads", "minigames");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function sanitizeFilename(name) {
  return String(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeFilename(path.basename(file.originalname, ext)).slice(0, 50) || "file";
    const rnd = crypto.randomBytes(4).toString("hex");
    cb(null, `${Date.now()}-${rnd}-${base}${ext}`);
  },
});

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) return cb(new Error("File tidak ditemukan"));
    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error("Thumbnail harus berupa gambar"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function publicUrlToPath(publicUrl) {
  if (!publicUrl) return null;
  const rel = String(publicUrl).replace(/^\/+/, "");
  return path.resolve(__dirname, "..", "..", "public", rel);
}

function deleteFileByUrl(publicUrl) {
  try {
    const fp = publicUrlToPath(publicUrl);
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch (e) {
    console.warn("delete file failed:", e.message);
  }
}

async function queryRows(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

function parseConfig(config) {
  if (!config) return {};
  if (typeof config === "object") return config;
  if (typeof config !== "string") return {};
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

function normalizeCorrectOption(value) {
  const v = String(value || "").trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(v)) return v;
  return null;
}

function normalizeMinigameRow(row) {
  const cfg = parseConfig(row.config);

  return {
    ...row,
    status: cfg.status || "draft",
    thumbnail_url: cfg.thumbnail_url || null,
    question: cfg.question || "",
    option_a: cfg.option_a || "",
    option_b: cfg.option_b || "",
    option_c: cfg.option_c || "",
    option_d: cfg.option_d || "",
    correct_option: normalizeCorrectOption(cfg.correct_option),
  };
}

function buildConfigFromBody(body, oldConfig = {}) {
  const current = parseConfig(oldConfig);

  const status = body.status || current.status || "draft";
  const question = body.question ?? current.question ?? "";
  const option_a = body.option_a ?? current.option_a ?? "";
  const option_b = body.option_b ?? current.option_b ?? "";
  const option_c = body.option_c ?? current.option_c ?? "";
  const option_d = body.option_d ?? current.option_d ?? "";
  const correct_option = normalizeCorrectOption(body.correct_option ?? current.correct_option ?? "A");

  return {
    status,
    thumbnail_url: current.thumbnail_url || null,
    question: String(question).trim(),
    option_a: String(option_a).trim(),
    option_b: String(option_b).trim(),
    option_c: String(option_c).trim(),
    option_d: String(option_d).trim(),
    correct_option,
  };
}

router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await queryRows("SELECT * FROM minigames ORDER BY id DESC");
    return res.json({ minigames: rows.map(normalizeMinigameRow) });
  } catch (err) {
    console.error("GET /api/admin/minigames error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await queryRows("SELECT * FROM minigames WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Minigame tidak ditemukan" });
    return res.json({ minigame: normalizeMinigameRow(rows[0]) });
  } catch (err) {
    console.error("GET /api/admin/minigames/:id error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/", authMiddleware, adminOnly, upload.single("thumbnail"), async (req, res) => {
  try {
    const { title, description = "", points_reward = 10, difficulty = 1 } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Judul minigame wajib diisi" });
    }

    if (!req.body.question || !String(req.body.question).trim()) {
      return res.status(400).json({ message: "Soal wajib diisi" });
    }

    const normalizedCorrect = normalizeCorrectOption(req.body.correct_option);
    if (!normalizedCorrect) {
      return res.status(400).json({ message: "Jawaban benar harus A, B, C, atau D" });
    }

    const options = [req.body.option_a, req.body.option_b, req.body.option_c, req.body.option_d];
    if (options.some((v) => !v || !String(v).trim())) {
      return res.status(400).json({ message: "Semua opsi A, B, C, dan D wajib diisi" });
    }

    const thumbnail_url = req.file ? `/uploads/minigames/${req.file.filename}` : null;

    const config = {
      status: req.body.status || "draft",
      thumbnail_url,
      question: String(req.body.question).trim(),
      option_a: String(req.body.option_a).trim(),
      option_b: String(req.body.option_b).trim(),
      option_c: String(req.body.option_c).trim(),
      option_d: String(req.body.option_d).trim(),
      correct_option: normalizedCorrect,
    };

    const [result] = await pool.query(
      `INSERT INTO minigames
       (title, description, config, points_reward, difficulty)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        description,
        JSON.stringify(config),
        Number(points_reward) || 10,
        Number(difficulty) || 1,
      ]
    );

    const rows = await queryRows("SELECT * FROM minigames WHERE id = ?", [result.insertId]);
    return res.status(201).json({ minigame: normalizeMinigameRow(rows[0]) });
  } catch (err) {
    console.error("POST /api/admin/minigames error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/:id", authMiddleware, adminOnly, upload.single("thumbnail"), async (req, res) => {
  try {
    const id = req.params.id;

    const rows = await queryRows("SELECT * FROM minigames WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Minigame tidak ditemukan" });

    const old = rows[0];
    const oldConfig = parseConfig(old.config);

    if (!req.body.question || !String(req.body.question).trim()) {
      return res.status(400).json({ message: "Soal wajib diisi" });
    }

    const normalizedCorrect = normalizeCorrectOption(req.body.correct_option ?? oldConfig.correct_option);
    if (!normalizedCorrect) {
      return res.status(400).json({ message: "Jawaban benar harus A, B, C, atau D" });
    }

    const nextConfig = buildConfigFromBody(req.body, oldConfig);

    if (!nextConfig.question) {
      return res.status(400).json({ message: "Soal wajib diisi" });
    }

    const options = [nextConfig.option_a, nextConfig.option_b, nextConfig.option_c, nextConfig.option_d];
    if (options.some((v) => !v || !String(v).trim())) {
      return res.status(400).json({ message: "Semua opsi A, B, C, dan D wajib diisi" });
    }

    let thumbnail_url = nextConfig.thumbnail_url || null;

    if (req.file && req.file.filename) {
      if (oldConfig.thumbnail_url) deleteFileByUrl(oldConfig.thumbnail_url);
      thumbnail_url = `/uploads/minigames/${req.file.filename}`;
    }

    nextConfig.thumbnail_url = thumbnail_url;
    nextConfig.status = req.body.status || oldConfig.status || "draft";
    nextConfig.correct_option = normalizedCorrect;

    await pool.query(
      `UPDATE minigames
       SET title = ?,
           description = ?,
           config = ?,
           points_reward = ?,
           difficulty = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        req.body.title ?? old.title,
        req.body.description ?? old.description,
        JSON.stringify(nextConfig),
        Number(req.body.points_reward ?? old.points_reward ?? 10) || 10,
        Number(req.body.difficulty ?? old.difficulty ?? 1) || 1,
        id,
      ]
    );

    const fresh = await queryRows("SELECT * FROM minigames WHERE id = ?", [id]);
    return res.json({ minigame: normalizeMinigameRow(fresh[0]) });
  } catch (err) {
    console.error("PUT /api/admin/minigames/:id error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;

    const rows = await queryRows("SELECT * FROM minigames WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Minigame tidak ditemukan" });

    const cfg = parseConfig(rows[0].config);
    if (cfg.thumbnail_url) {
      deleteFileByUrl(cfg.thumbnail_url);
    }

    await pool.query("DELETE FROM minigames WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/minigames/:id error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;