const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware } = require("../middleware/auth");

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const progressRows = await query(
      `SELECT progress_percent
       FROM user_progress
       WHERE user_id = ?`,
      [userId]
    );

    const pointsRows = await query(
      `SELECT points, level
       FROM user_points
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    const points = pointsRows[0] || { points: 0, level: 1 };

    return res.json({
      progress: progressRows,
      points: {
        points: Number(points.points || 0),
        level: Number(points.level || 1),
      },
    });
  } catch (err) {
    console.error("GET /api/progress error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;