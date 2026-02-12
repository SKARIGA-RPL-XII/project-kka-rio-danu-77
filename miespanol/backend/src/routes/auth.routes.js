const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "rahasia_miespanol";

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    const [r] = await pool.query(
      "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
      [name, email, hash]
    );

    const token = jwt.sign(
      { id: r.insertId, role: "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch {
    res.status(400).json({ error: "Email already used" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email=?",
    [email]
  );

  if (!rows.length) return res.status(401).json({ error: "Invalid login" });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid login" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, role: user.role });
});

// ME
router.get("/me", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id,name,email,role FROM users WHERE id=?",
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;
