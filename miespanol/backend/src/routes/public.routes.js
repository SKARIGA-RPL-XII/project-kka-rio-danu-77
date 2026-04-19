const express = require("express");
const router = express.Router();
const pool = require("../db");

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

router.get("/courses", async (req, res) => {
  try {
    const courses = await query(
      `SELECT id, title, description, category, thumbnail_url, status, created_at
       FROM courses
       WHERE status = 'published'
       ORDER BY created_at DESC`
    );

    return res.json({ courses });
  } catch (err) {
    console.error("GET /api/public/courses error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseRows = await query(
      `SELECT * FROM courses
       WHERE id = ? AND status = 'published'
       LIMIT 1`,
      [courseId]
    );

    if (!courseRows.length) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const course = courseRows[0];

    const sessions = await query(
      `SELECT * FROM sessions
       WHERE course_id = ?
       ORDER BY created_at ASC, id ASC`,
      [courseId]
    );

    const sessionIds = sessions.map((s) => s.id);
    let lessons = [];

    if (sessionIds.length > 0) {
      lessons = await query(
        `SELECT * FROM lessons
         WHERE session_id IN (?)
         ORDER BY created_at ASC, id ASC`,
        [sessionIds]
      );
    }

    const sessionsWithLessons = sessions.map((session) => ({
      ...session,
      lessons: lessons.filter((lesson) => Number(lesson.session_id) === Number(session.id)),
    }));

    return res.json({
      course,
      sessions: sessionsWithLessons,
    });
  } catch (err) {
    console.error("GET /api/public/courses/:courseId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;