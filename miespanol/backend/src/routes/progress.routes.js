const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.post("/start", authMiddleware, async (req, res) => {
  await pool.query(
    "INSERT IGNORE INTO user_progress (user_id,lesson_id) VALUES (?,?)",
    [req.user.id, req.body.lesson_id]
  );
  res.json({ ok: true });
});

router.post("/complete", authMiddleware, async (req, res) => {
  await pool.query(
    "UPDATE user_progress SET progress_percent=100,completed_at=NOW() WHERE user_id=? AND lesson_id=?",
    [req.user.id, req.body.lesson_id]
  );
  res.json({ ok: true });
});

module.exports = router;
