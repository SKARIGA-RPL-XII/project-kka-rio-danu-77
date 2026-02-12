const db = require("../db");

// GET ALL COURSES
exports.getAllCourses = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM courses ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed get courses" });
  }
};

// CREATE COURSE
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, status } = req.body;

    const thumbnailUrl = req.file
      ? `/uploads/courses/${req.file.filename}`
      : null;

    await db.query(
      `INSERT INTO courses 
       (title, description, category, thumbnail_url, status)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, category, thumbnailUrl, status]
    );

    res.json({ message: "Course created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Create course failed" });
  }
};

// UPDATE COURSE
exports.updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, category, status } = req.body;
  let thumbnailUrl = null;

  if (req.file) {
    thumbnailUrl = `/uploads/courses/${req.file.filename}`;
  }

  try {
    const sql =
      thumbnailUrl
        ? "UPDATE courses SET title=?, description=?, category=?, status=?, thumbnail_url=? WHERE id=?"
        : "UPDATE courses SET title=?, description=?, category=?, status=? WHERE id=?";

    const params = thumbnailUrl
      ? [title, description, category, status, thumbnailUrl, id]
      : [title, description, category, status, id];

    await db.query(sql, params);
    res.json({ message: "Course updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};

// DELETE COURSE
exports.deleteCourse = async (req, res) => {
  try {
    await db.query("DELETE FROM courses WHERE id=?", [req.params.id]);
    res.json({ message: "Course deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};
