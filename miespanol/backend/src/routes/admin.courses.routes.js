// backend/src/routes/admin.courses.routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// IMPORTS — sesuaikan export dari upload.js dan auth.js
const { upload } = require('../middleware/upload'); // <-- note: destructure jika upload.js export { upload }
const pool = require('../db'); // pastikan db.js mengekspor pool (module.exports = pool)
const { authMiddleware, adminOnly } = require('../middleware/auth');

// helper: full disk path dari thumbnail_url ("/uploads/courses/xxx.png" -> filesystem)
function thumbUrlToPath(thumbnail_url) {
  if (!thumbnail_url) return null;
  // thumbnail_url disimpan seperti "/uploads/courses/filename.png"
  const rel = thumbnail_url.replace(/^\/+/, ''); // "uploads/courses/..."
  // root project: backend/public/<rel>
  return path.resolve(__dirname, '..', 'public', rel);
}

// GET all courses
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM courses ORDER BY created_at DESC');
    return res.json({ courses: rows });
  } catch (err) {
    console.error('GET /admin/courses error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET one course (optional)
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json({ course: rows[0] });
  } catch (err) {
    console.error('GET /admin/courses/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST create course (multipart form with thumbnail file)
router.post('/', authMiddleware, adminOnly, upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, description, category = 'learning', status = 'draft', start_date = null } = req.body;
    let thumbnail_url = null;

    if (req.file && req.file.filename) {
      // simpan relative URL yang konsisten
      thumbnail_url = `/uploads/courses/${req.file.filename}`;
    }

    const [r] = await pool.query(
      'INSERT INTO courses (title, description, category, thumbnail_url, status, start_date) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, category, thumbnail_url, status, start_date]
    );

    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [r.insertId]);
    return res.json({ course: rows[0] });
  } catch (err) {
    console.error('POST /admin/courses error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT update course (opsional upload thumbnail baru)
router.put('/:id', authMiddleware, adminOnly, upload.single('thumbnail'), async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, category, status, start_date } = req.body;

    // ambil existing untuk mungkin menghapus file lama
    const [existing] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Course not found' });

    const course = existing[0];

    let thumbnail_url = course.thumbnail_url;
    if (req.file && req.file.filename) {
      // hapus file lama (jika ada)
      if (course.thumbnail_url) {
        const oldPath = thumbUrlToPath(course.thumbnail_url);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) { console.warn('delete old thumb failed', e); }
      }
      thumbnail_url = `/uploads/courses/${req.file.filename}`;
    }

    await pool.query(
      'UPDATE courses SET title = ?, description = ?, category = ?, thumbnail_url = ?, status = ?, start_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        title ?? course.title,
        description ?? course.description,
        category ?? course.category,
        thumbnail_url,
        status ?? course.status,
        start_date ?? course.start_date,
        id
      ]
    );

    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    return res.json({ course: rows[0] });
  } catch (err) {
    console.error('PUT /admin/courses/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE course (juga hapus file thumbnail fisik bila ada)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query('SELECT thumbnail_url FROM courses WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const thumbnail_url = rows[0].thumbnail_url;
    if (thumbnail_url) {
      const fp = thumbUrlToPath(thumbnail_url);
      try {
        if (fs.existsSync(fp)) {
          fs.unlinkSync(fp);
        }
      } catch (e) {
        console.warn('Failed deleting thumbnail file', fp, e);
      }
    }

    await pool.query('DELETE FROM courses WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /admin/courses/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
