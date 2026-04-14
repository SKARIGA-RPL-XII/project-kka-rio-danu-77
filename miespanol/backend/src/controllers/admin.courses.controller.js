// backend/src/controllers/admin.courses.controller.js
const db = require("../config/db");

exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, status } = req.body;

    const thumbnail = req.file ? `/uploads/courses/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO courses (title, description, category, status, thumbnail_url)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, category, status, thumbnail]
    );

    res.status(201).json({
      message: "Course berhasil dibuat",
      data: {
        id: result.insertId,
        title,
        description,
        category,
        status,
        thumbnail_url: thumbnail,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal membuat course" });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, status } = req.body;

    const [rows] = await db.query(
      "SELECT thumbnail_url FROM courses WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const oldThumbnail = rows[0].thumbnail_url;
    const newThumbnail = req.file
      ? `/uploads/courses/${req.file.filename}`
      : oldThumbnail;

    await db.query(
      `UPDATE courses
       SET title = ?, description = ?, category = ?, status = ?, thumbnail_url = ?
       WHERE id = ?`,
      [title, description, category, status, newThumbnail, id]
    );

    res.json({
      message: "Course berhasil diperbarui",
      data: {
        id: Number(id),
        title,
        description,
        category,
        status,
        thumbnail_url: newThumbnail,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal update course" });
  }
};