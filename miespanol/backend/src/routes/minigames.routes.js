const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware } = require("../middleware/auth");

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeChoice(value) {
  if (value === null || typeof value === "undefined") return null;
  const v = String(value).trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(v)) return v;
  return null;
}

function getCorrectAnswer(game) {
  const cfg = parseConfig(game?.config);
  const raw =
    cfg.correct_answer ??
    cfg.correctAnswer ??
    cfg.answer_correct ??
    game?.correct_answer ??
    game?.correctAnswer ??
    "A";

  return normalizeChoice(raw) || "A";
}

function getPointsReward(game) {
  const cfg = parseConfig(game?.config);
  const raw = cfg.points_reward ?? game?.points_reward ?? 10;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 10;
}

async function getUserPoints(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM user_points WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] || null;
}

async function addUserPoints(userId, deltaPoints) {
  const current = await getUserPoints(userId);
  const currentPoints = Number(current?.points || 0);
  const nextPoints = currentPoints + Number(deltaPoints || 0);
  const nextLevel = Math.max(1, Math.floor(nextPoints / 100) + 1);

  if (current) {
    await pool.query(
      "UPDATE user_points SET points = ?, level = ? WHERE user_id = ?",
      [nextPoints, nextLevel, userId]
    );
  } else {
    await pool.query(
      "INSERT INTO user_points (user_id, points, level) VALUES (?, ?, ?)",
      [userId, nextPoints, nextLevel]
    );
  }

  return { points: nextPoints, level: nextLevel };
}

async function getGameById(minigameId) {
  const [rows] = await pool.query(
    "SELECT * FROM minigames WHERE id = ? LIMIT 1",
    [minigameId]
  );
  return rows[0] || null;
}

async function getExistingAttempt(userId, minigameId) {
  const [rows] = await pool.query(
    "SELECT * FROM minigame_attempts WHERE user_id = ? AND minigame_id = ? LIMIT 1",
    [userId, minigameId]
  );
  return rows[0] || null;
}

async function getAttemptsForUser(userId) {
  const [rows] = await pool.query(
    `SELECT a.*, m.title, m.description, m.points_reward, m.difficulty
     FROM minigame_attempts a
     JOIN minigames m ON m.id = a.minigame_id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`,
    [userId]
  );
  return rows;
}

router.get("/public", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM minigames WHERE status = 'published' ORDER BY created_at DESC"
    );
    return res.json({ minigames: rows });
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

    return res.json({
      attempts,
      completed_ids: attempts.map((a) => a.minigame_id),
      points: pointsRow?.points || 0,
      level: pointsRow?.level || 1,
    });
  } catch (err) {
    console.error("GET /api/minigames/progress error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:minigameId/answer", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { minigameId } = req.params;
    const selected = normalizeChoice(req.body.selected_answer ?? req.body.answer ?? req.body.choice);

    if (!selected) {
      return res.status(400).json({ message: "Jawaban tidak valid" });
    }

    const game = await getGameById(minigameId);
    if (!game) {
      return res.status(404).json({ message: "Minigame tidak ditemukan" });
    }

    const existing = await getExistingAttempt(userId, minigameId);
    if (existing) {
      return res.json({
        already_answered: true,
        attempt: existing,
      });
    }

    const correctAnswer = getCorrectAnswer(game);
    const isCorrect = selected === correctAnswer;
    const score = isCorrect ? getPointsReward(game) : 0;

    await pool.query(
      `INSERT INTO minigame_attempts
       (user_id, minigame_id, score, success, played_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, minigameId, score, isCorrect ? 1 : 0]
    );

    return res.status(201).json({
      is_correct: isCorrect,
      score_earned: score,
    });
  } catch (err) {
    console.error("POST /api/minigames/:minigameId/answer error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;