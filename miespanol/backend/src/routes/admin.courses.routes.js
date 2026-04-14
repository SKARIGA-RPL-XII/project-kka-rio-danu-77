const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const { upload } = require("../middleware/upload");
const pool = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

function thumbUrlToPath(thumbnail_url) {
  if (!thumbnail_url) return null;
  const rel = String(thumbnail_url).replace(/^\/+/, "");
  return path.resolve(__dirname, "..", "..", "public", rel);
}

router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM courses ORDER BY id DESC");
    return res.json(rows);
  } catch (err) {
    console.error("GET /api/admin/courses error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM courses WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Course not found" });
    return res.json({ course: rows[0] });
  } catch (err) {
    console.error("GET /api/admin/courses/:id error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/", authMiddleware, adminOnly, upload.single("thumbnail"), async (req, res) => {
  try {
    const {
      title,
      description = "",
      category = "learning",
      status = "draft",
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Title wajib diisi" });
    }

    const thumbnail_url = req.file ? `/uploads/courses/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO courses (title, description, category, thumbnail_url, status)
       VALUES (?, ?, ?, ?, ?)`,
      [String(title).trim(), description, category, thumbnail_url, status]
    );

    const [rows] = await pool.query("SELECT * FROM courses WHERE id = ?", [result.insertId]);
    return res.status(201).json({ course: rows[0] });
  } catch (err) {
    console.error("POST /api/admin/courses error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/:id", authMiddleware, adminOnly, upload.single("thumbnail"), async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, category, status } = req.body;

    const [existing] = await pool.query("SELECT * FROM courses WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ message: "Course not found" });

    const course = existing[0];
    let thumbnail_url = course.thumbnail_url;

    if (req.file && req.file.filename) {
      if (course.thumbnail_url) {
        const oldPath = thumbUrlToPath(course.thumbnail_url);
        try {
          if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn("delete old thumb failed:", e.message);
        }
      }
      thumbnail_url = `/uploads/courses/${req.file.filename}`;
    }

    await pool.query(
      `UPDATE courses
       SET title = ?, description = ?, category = ?, thumbnail_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title ?? course.title,
        description ?? course.description,
        category ?? course.category,
        thumbnail_url,
        status ?? course.status,
        id,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM courses WHERE id = ?", [id]);
    return res.json({ course: rows[0] });
  } catch (err) {
    console.error("PUT /api/admin/courses/:id error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await pool.query("SELECT thumbnail_url FROM courses WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Not found" });

    const thumbnail_url = rows[0].thumbnail_url;
    if (thumbnail_url) {
      const fp = thumbUrlToPath(thumbnail_url);
      try {
        if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (e) {
        console.warn("Failed deleting thumbnail file:", e.message);
      }
    }

    await pool.query("DELETE FROM courses WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/courses/:id error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;