// backend/src/middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET || "secret_dev";

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Tidak ada token" });

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token tidak valid" });
  }
}

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Hanya admin" });
  next();
}

// helper gabungan untuk dashboard/admin route
function adminGuard(req, res, next) {
  authMiddleware(req, res, () => adminOnly(req, res, next));
}

module.exports = { authMiddleware, adminOnly, adminGuard };
