const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware } = require("../middleware/auth");

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

function parseJSON(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeMinigame(row) {
  const cfg = parseJSON(row.config);

  return {
    ...row,
    config: cfg,
    status: cfg.status || row.status || "draft",
    thumbnail_url: cfg.thumbnail_url || row.thumbnail_url || row.thumbnail || null,
    question:
      cfg.question ||
      cfg.prompt ||
      cfg.soal ||
      row.question ||
      row.description ||
      "",
    options: Array.isArray(cfg.options)
      ? cfg.options.slice(0, 4).map(String)
      : [
          cfg.option_a ?? cfg.a ?? row.option_a ?? "",
          cfg.option_b ?? cfg.b ?? row.option_b ?? "",
          cfg.option_c ?? cfg.c ?? row.option_c ?? "",
          cfg.option_d ?? cfg.d ?? row.option_d ?? "",
        ].map(String),
    correct_answer: String(
      cfg.correct_answer ||
        cfg.correctAnswer ||
        cfg.correct_option ||
        row.correct_answer ||
        row.correct_option ||
        "A"
    )
      .trim()
      .toUpperCase(),
    points_reward: Number(cfg.points_reward || row.points_reward || 10),
  };
}

function getLevelFromPoints(points) {
  const p = Number(points || 0);
  return Math.max(1, Math.floor(p / 100) + 1);
}

async function getUserPoints(userId) {
  const rows = await query(
    "SELECT user_id, points, level FROM user_points WHERE user_id = ? LIMIT 1",
    [userId]
  );

  if (rows.length) return rows[0];

  await pool.query("INSERT INTO user_points (user_id, points, level) VALUES (?, 0, 1)", [
    userId,
  ]);

  return { user_id: userId, points: 0, level: 1 };
}

async function addUserPoints(userId, delta) {
  const current = await getUserPoints(userId);
  const newPoints = Number(current.points || 0) + Number(delta || 0);
  const newLevel = getLevelFromPoints(newPoints);

  await pool.query("UPDATE user_points SET points = ?, level = ? WHERE user_id = ?", [
    newPoints,
    newLevel,
    userId,
  ]);

  return { points: newPoints, level: newLevel };
}

async function getAttemptsForUser(userId) {
  const rows = await query(
    `SELECT
        a.id,
        a.user_id,
        a.minigame_id,
        a.selected_answer,
        a.is_correct,
        a.score,
        a.success,
        a.played_at,
        m.title,
        m.description,
        m.points_reward,
        m.difficulty,
        m.config,
        m.thumbnail_url
     FROM minigame_attempts a
     JOIN minigames m ON m.id = a.minigame_id
     WHERE a.user_id = ?
     ORDER BY a.played_at DESC, a.id DESC`,
    [userId]
  );

  return rows;
}

router.get("/public", async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM minigames ORDER BY id DESC`);

    const minigames = rows
      .map(normalizeMinigame)
      .filter((game) => {
        const st = String(game.status || "").trim().toLowerCase();
        return !st || st === "published";
      });

    return res.json({ minigames });
  } catch (err) {
    console.error("GET /api/minigames/public error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/progress", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const attempts = await getAttemptsForUser(userId);
    const pointsRow = await getUserPoints(userId);

    const completedIds = [...new Set(attempts.map((a) => Number(a.minigame_id)))];

    return res.json({
      attempts,
      completed_ids: completedIds,
      points: Number(pointsRow.points || 0),
      level: Number(pointsRow.level || 1),
    });
  } catch (err) {
    console.error("GET /api/minigames/progress error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/answer", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const selectedAnswer = String(req.body.selected_answer || "").trim().toUpperCase();

    if (!["A", "B", "C", "D"].includes(selectedAnswer)) {
      return res.status(400).json({ message: "Jawaban tidak valid" });
    }

    const gameRows = await query(`SELECT * FROM minigames WHERE id = ? LIMIT 1`, [id]);

    if (!gameRows.length) {
      return res.status(404).json({ message: "Minigame tidak ditemukan" });
    }

    const game = normalizeMinigame(gameRows[0]);
    const rawStatus = String(parseJSON(gameRows[0].config).status || gameRows[0].status || "")
      .trim()
      .toLowerCase();

    if (rawStatus && rawStatus !== "published") {
      return res.status(404).json({ message: "Minigame tidak tersedia" });
    }

    const correctAnswer = String(game.correct_answer || "A").trim().toUpperCase();
    const isCorrect = selectedAnswer === correctAnswer;
    const score = isCorrect ? Number(game.points_reward || 10) : 0;
    const playedAt = new Date();

    const existing = await query(
      `SELECT
         id,
         user_id,
         minigame_id,
         selected_answer,
         is_correct,
         score,
         success,
         played_at
       FROM minigame_attempts
       WHERE user_id = ? AND minigame_id = ?
       LIMIT 1`,
      [userId, id]
    );

    if (existing.length) {
      const pointsRow = await getUserPoints(userId);

      return res.json({
        already_submitted: true,
        attempt: existing[0],
        is_correct: !!existing[0].is_correct || !!existing[0].success,
        points: Number(pointsRow.points || 0),
        level: Number(pointsRow.level || 1),
      });
    }

    await pool.query(
      `INSERT INTO minigame_attempts
        (user_id, minigame_id, selected_answer, is_correct, score, success, played_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, id, selectedAnswer, isCorrect ? 1 : 0, score, isCorrect ? 1 : 0, playedAt]
    );

    let pointsRow = await getUserPoints(userId);
    if (isCorrect && score > 0) {
      pointsRow = await addUserPoints(userId, score);
    }

    const attempt = {
      user_id: userId,
      minigame_id: Number(id),
      selected_answer: selectedAnswer,
      is_correct: isCorrect ? 1 : 0,
      score,
      success: isCorrect ? 1 : 0,
      played_at: playedAt,
    };

    return res.json({
      attempt,
      is_correct: isCorrect,
      points: Number(pointsRow.points || 0),
      level: Number(pointsRow.level || 1),
    });
  } catch (err) {
    console.error("POST /api/minigames/:id/answer error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;