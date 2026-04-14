const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const pool = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// =====================
// Upload attachment lesson
// =====================
const uploadDir = path.resolve(__dirname, "..", "..", "public", "uploads", "lessons");

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
    const base =
      sanitizeFilename(path.basename(file.originalname, ext)).slice(0, 50) || "file";
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
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) return cb(new Error("File tidak ditemukan"));
    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error("File harus gambar, PDF, atau PowerPoint"));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
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

// helper safe query
async function queryRows(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getCourseById(courseId) {
  const rows = await queryRows("SELECT * FROM courses WHERE id = ?", [courseId]);
  return rows[0] || null;
}

async function getSessionsByCourse(courseId) {
  const rows = await queryRows("SELECT * FROM sessions WHERE course_id = ?", [
    courseId,
  ]);
  return rows.sort((a, b) => Number(a.id) - Number(b.id));
}

async function getLessonsBySession(sessionId) {
  const rows = await queryRows("SELECT * FROM lessons WHERE session_id = ?", [
    sessionId,
  ]);
  return rows.sort((a, b) => Number(a.id) - Number(b.id));
}

// =====================
// GET course + sessions + lessons
// =====================
router.get("/courses/:courseId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const sessions = await getSessionsByCourse(courseId);
    const sessionIds = sessions.map((s) => s.id);

    let lessons = [];
    if (sessionIds.length > 0) {
      const [lessonRows] = await pool.query(
        "SELECT * FROM lessons WHERE session_id IN (?)",
        [sessionIds]
      );
      lessons = lessonRows;
    }

    const sessionsWithLessons = sessions.map((s) => ({
      ...s,
      lessons: lessons.filter((l) => Number(l.session_id) === Number(s.id)),
    }));

    return res.json({
      course,
      sessions: sessionsWithLessons,
    });
  } catch (err) {
    console.error("GET /api/admin/materials/courses/:courseId error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

// =====================
// GET sessions by course
// =====================
router.get(
  "/courses/:courseId/sessions",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const sessions = await getSessionsByCourse(courseId);

      return res.json({ sessions });
    } catch (err) {
      console.error(
        "GET /api/admin/materials/courses/:courseId/sessions error:",
        err
      );
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================
// POST session
// =====================
router.post(
  "/courses/:courseId/sessions",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title } = req.body;

      if (!title || !String(title).trim()) {
        return res.status(400).json({ message: "Judul session wajib diisi" });
      }

      const [result] = await pool.query(
        `INSERT INTO sessions (course_id, title)
         VALUES (?, ?)`,
        [courseId, String(title).trim()]
      );

      const rows = await queryRows("SELECT * FROM sessions WHERE id = ?", [
        result.insertId,
      ]);

      return res.status(201).json({ session: rows[0] });
    } catch (err) {
      console.error(
        "POST /api/admin/materials/courses/:courseId/sessions error:",
        err
      );
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================
// PUT session
// =====================
router.put("/sessions/:sessionId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;

    const existing = await queryRows("SELECT * FROM sessions WHERE id = ?", [
      sessionId,
    ]);

    if (!existing.length) {
      return res.status(404).json({ message: "Session tidak ditemukan" });
    }

    await pool.query("UPDATE sessions SET title = ? WHERE id = ?", [
      title ?? existing[0].title,
      sessionId,
    ]);

    const rows = await queryRows("SELECT * FROM sessions WHERE id = ?", [
      sessionId,
    ]);

    return res.json({ session: rows[0] });
  } catch (err) {
    console.error("PUT /api/admin/materials/sessions/:sessionId error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

// =====================
// DELETE session
// =====================
router.delete(
  "/sessions/:sessionId",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const lessons = await queryRows(
        "SELECT * FROM lessons WHERE session_id = ?",
        [sessionId]
      );

      lessons.forEach((lesson) => deleteFileByUrl(lesson.attachment_url));

      await pool.query("DELETE FROM lessons WHERE session_id = ?", [sessionId]);
      await pool.query("DELETE FROM sessions WHERE id = ?", [sessionId]);

      return res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/admin/materials/sessions/:sessionId error:", err);
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================
// GET lessons by session
// =====================
router.get(
  "/sessions/:sessionId/lessons",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const lessons = await getLessonsBySession(sessionId);
      return res.json({ lessons });
    } catch (err) {
      console.error(
        "GET /api/admin/materials/sessions/:sessionId/lessons error:",
        err
      );
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================
// POST lesson
// =====================
router.post(
  "/sessions/:sessionId/lessons",
  authMiddleware,
  adminOnly,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { title, content_type = "article", content = "" } = req.body;

      if (!title || !String(title).trim()) {
        return res.status(400).json({ message: "Judul lesson wajib diisi" });
      }

      const attachment_url = req.file
        ? `/uploads/lessons/${req.file.filename}`
        : null;

      const [result] = await pool.query(
        `INSERT INTO lessons
         (session_id, title, content_type, content, attachment_url)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, String(title).trim(), content_type, content, attachment_url]
      );

      const rows = await queryRows("SELECT * FROM lessons WHERE id = ?", [
        result.insertId,
      ]);

      return res.status(201).json({ lesson: rows[0] });
    } catch (err) {
      console.error(
        "POST /api/admin/materials/sessions/:sessionId/lessons error:",
        err
      );
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================
// PUT lesson
// =====================
router.put(
  "/lessons/:lessonId",
  authMiddleware,
  adminOnly,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { lessonId } = req.params;
      const { title, content_type = "article", content = "" } = req.body;

      const existing = await queryRows("SELECT * FROM lessons WHERE id = ?", [
        lessonId,
      ]);

      if (!existing.length) {
        return res.status(404).json({ message: "Lesson tidak ditemukan" });
      }

      const lesson = existing[0];

      let attachment_url = lesson.attachment_url;

      if (req.file && req.file.filename) {
        if (lesson.attachment_url) deleteFileByUrl(lesson.attachment_url);
        attachment_url = `/uploads/lessons/${req.file.filename}`;
      }

      await pool.query(
        `UPDATE lessons
         SET title = ?, content_type = ?, content = ?, attachment_url = ?
         WHERE id = ?`,
        [
          title ?? lesson.title,
          content_type ?? lesson.content_type,
          content ?? lesson.content,
          attachment_url,
          lessonId,
        ]
      );

      const rows = await queryRows("SELECT * FROM lessons WHERE id = ?", [
        lessonId,
      ]);

      return res.json({ lesson: rows[0] });
    } catch (err) {
      console.error("PUT /api/admin/materials/lessons/:lessonId error:", err);
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================
// DELETE lesson
// =====================
router.delete(
  "/lessons/:lessonId",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { lessonId } = req.params;

      const existing = await queryRows(
        "SELECT * FROM lessons WHERE id = ?",
        [lessonId]
      );

      if (!existing.length) {
        return res.status(404).json({ message: "Lesson tidak ditemukan" });
      }

      deleteFileByUrl(existing[0].attachment_url);
      await pool.query("DELETE FROM lessons WHERE id = ?", [lessonId]);

      return res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/admin/materials/lessons/:lessonId error:", err);
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
);

module.exports = router;