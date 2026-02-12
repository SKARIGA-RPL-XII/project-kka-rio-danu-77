const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

router.get("/", authMiddleware, adminOnly, async (_, res) => {
  const [rows] = await pool.query("SELECT * FROM minigames");
  res.json(rows);
});

router.post("/", authMiddleware, adminOnly, async (req, res) => {
  const { title, description, config, points_reward, difficulty } = req.body;
  const [r] = await pool.query(
    "INSERT INTO minigames (title,description,config,points_reward,difficulty) VALUES (?,?,?,?,?)",
    [title, description, JSON.stringify(config), points_reward, difficulty]
  );
  res.json({ id: r.insertId });
});

router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  await pool.query("DELETE FROM minigames WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
