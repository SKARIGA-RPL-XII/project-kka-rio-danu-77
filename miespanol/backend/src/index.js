// backend/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 4000;

const publicDir = path.join(__dirname, "..", "public");
const uploadsDir = path.join(publicDir, "uploads");
const requiredDirs = [
  path.join(uploadsDir, "courses"),
  path.join(uploadsDir, "lessons"),
  path.join(uploadsDir, "minigames"),
  path.join(uploadsDir, "avatars"),
];

// pastikan folder upload ada
try {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log("Created uploads dir:", dir);
    }
  }
} catch (e) {
  console.error("Cannot create uploads dir:", e);
  process.exit(1);
}

// middleware umum
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// serve file upload
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    next();
  },
  express.static(uploadsDir)
);

// healthcheck
app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// safe loader route
function safeLoadRoute(routePath) {
  try {
    const modul = require(routePath);
    if (typeof modul === "function" || typeof modul === "object") return modul;

    const r = express.Router();
    r.use((req, res) => res.status(501).json({ error: "Route module invalid" }));
    return r;
  } catch (err) {
    console.warn(`Warning: cannot load route ${routePath} — ${err.message}`);
    const r = express.Router();
    r.use((req, res) =>
      res.status(501).json({ error: `Route not available: ${path.basename(routePath)}` })
    );
    return r;
  }
}

// routes
app.use("/api/auth", safeLoadRoute("./routes/auth.routes"));
app.use("/api/admin/courses", safeLoadRoute("./routes/admin.courses.routes"));
app.use("/api/admin/materials", safeLoadRoute("./routes/admin.materials.routes"));
app.use("/api/admin/minigames", safeLoadRoute("./routes/admin.minigames.routes"));
app.use("/api/minigames", safeLoadRoute("./routes/minigames.routes"));
app.use("/api/admin/users", safeLoadRoute("./routes/admin.users.routes"));
app.use("/api/admin/dashboard", safeLoadRoute("./routes/admin.dashboard.routes"));
app.use("/api/public/minigames", safeLoadRoute("./routes/public.minigames.routes"));
app.use("/api/public", safeLoadRoute("./routes/public.routes"));
app.use("/api/progress", safeLoadRoute("./routes/progress.routes"));

// 404
app.use((req, res, next) => {
  if (req.path.startsWith("/uploads")) return next();
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res
    .status(err.status || 500)
    .json({ message: "Something went wrong", error: err.message || err });
});

// start
app.listen(PORT, () => {
  console.log(`🔥 MiEspanol Backend running on http://localhost:${PORT}`);
  console.log(`Serving uploads from: http://localhost:${PORT}/uploads/`);
});