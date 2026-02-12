const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware } = require("../middleware/auth");

// published courses
router.get("/courses", authMiddleware, async (_, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM courses WHERE status='published'"
  );
  res.json(rows);
});

// sessions
router.get("/courses/:id/sessions", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM sessions WHERE course_id=? ORDER BY sort_order",
    [req.params.id]
  );
  res.json(rows);
});

// lessons
router.get("/sessions/:id/lessons", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM lessons WHERE session_id=? ORDER BY sort_order",
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
