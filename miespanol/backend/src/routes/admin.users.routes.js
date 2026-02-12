const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

router.get("/", authMiddleware, adminOnly, async (_, res) => {
  const [rows] = await pool.query(
    "SELECT id,name,email,role,created_at FROM users"
  );
  res.json(rows);
});

module.exports = router;
