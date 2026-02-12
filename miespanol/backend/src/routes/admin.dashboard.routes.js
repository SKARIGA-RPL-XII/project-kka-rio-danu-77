// backend/src/routes/admin.dashboard.routes.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { adminGuard } = require("../middleware/auth"); // <-- pastikan ini path benar

// semua route admin pakai adminGuard
router.use(adminGuard);

// GET dashboard data
router.get("/", async (req, res, next) => {
  try {
    const [users] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [courses] = await pool.query("SELECT COUNT(*) AS totalCourses FROM courses");
    const [latestCourses] = await pool.query(
      "SELECT id, title, description, category, thumbnail_url, status FROM courses ORDER BY id DESC LIMIT 5"
    );

    res.json({
      totalUsers: users[0].totalUsers,
      totalCourses: courses[0].totalCourses,
      latestCourses,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
