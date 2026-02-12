// backend/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 4000;

// === uploads dir (public) ===
// uploads will be served at: http://localhost:PORT/uploads/...
const uploadsDir = path.join(__dirname, "..", "public", "uploads", "courses");

// ensure uploads dir exists
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Created uploads dir:", uploadsDir);
  }
} catch (e) {
  console.error("Cannot create uploads dir:", e);
  process.exit(1);
}

// === middleware ===
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// increase limits a bit for file metadata, but file uploads handled by multer in routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// serve uploads with permissive headers so browser can load images from different port/origin
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    // allow images to be used across origins
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    next();
  },
  express.static(path.join(__dirname, "..", "public", "uploads"))
);

// simple healthcheck
app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// === safe loader for route modules ===
function safeLoadRoute(routePath) {
  try {
    const modul = require(routePath);
    // if the module exports a router directly, use it
    if (typeof modul === "function" || typeof modul === "object") return modul;
    // otherwise create placeholder
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

// === mount API routes (use safeLoadRoute so server won't crash if file missing) ===
// adjust paths if your files are elsewhere
app.use("/api/auth", safeLoadRoute("./routes/auth.routes"));
app.use("/api/admin/courses", safeLoadRoute("./routes/admin.courses.routes"));
app.use("/api/admin/minigames", safeLoadRoute("./routes/admin.minigames.routes"));
app.use("/api/admin/users", safeLoadRoute("./routes/admin.users.routes"));
app.use("/api/admin/dashboard", safeLoadRoute("./routes/admin.dashboard.routes"));
app.use("/api/public", safeLoadRoute("./routes/public.routes"));
app.use("/api/progress", safeLoadRoute("./routes/progress.routes"));

// 404 for non-API assets
app.use((req, res, next) => {
  // If request is to /uploads/*, let static have handled it. Otherwise 404
  if (req.path.startsWith("/uploads")) return next();
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ message: "Something went wrong", error: err.message || err });
});

// start
app.listen(PORT, () => {
  console.log(`🔥 MiEspanol Backend running on http://localhost:${PORT}`);
  console.log(`Serving uploads from: http://localhost:${PORT}/uploads/`);
});
