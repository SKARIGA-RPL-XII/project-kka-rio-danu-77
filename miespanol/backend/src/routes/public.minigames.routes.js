const express = require("express");
const router = express.Router();
const pool = require("../db");

async function queryRows(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

function parseConfig(config) {
  if (!config) return {};
  if (typeof config === "object") return config;
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

router.get("/", async (req, res) => {
  try {
    const rows = await queryRows("SELECT * FROM minigames ORDER BY id DESC");

    const published = rows
      .map((row) => {
        const cfg = parseConfig(row.config);
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          thumbnail_url: cfg.thumbnail_url || null,
          question: cfg.question || "",
          option_a: cfg.option_a || "",
          option_b: cfg.option_b || "",
          option_c: cfg.option_c || "",
          option_d: cfg.option_d || "",
        };
      })
      .filter((row) => String(parseConfig(rows.find((r) => r.id === row.id)?.config)?.status || "draft") === "published");

    return res.json({ minigames: published });
  } catch (err) {
    console.error("GET /api/public/minigames error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/:id/check", async (req, res) => {
  try {
    const id = req.params.id;
    const { answer } = req.body;

    const rows = await queryRows("SELECT * FROM minigames WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Minigame tidak ditemukan" });
    }

    const cfg = parseConfig(rows[0].config);
    const correct = String(cfg.correct_option || "").toUpperCase();
    const chosen = String(answer || "").toUpperCase();

    return res.json({
      correct: chosen === correct,
      correct_option: correct,
    });
  } catch (err) {
    console.error("POST /api/public/minigames/:id/check error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;