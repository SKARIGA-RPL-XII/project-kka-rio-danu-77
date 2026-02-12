// backend/seeders/seedUsers.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'miespanol',
    waitForConnections: true
  });

  const adminEmail = 'admin@gmail.com';
  const adminPlain = 'admin123';
  const userEmail = 'user@gmail.com';
  const userPlain = 'user123';

  try {
    const adminHash = await bcrypt.hash(adminPlain, 10);
    const userHash = await bcrypt.hash(userPlain, 10);

    // upsert
    const [a] = await pool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (a.length) {
      await pool.query('UPDATE users SET name=?, password_hash=?, role=? WHERE email=?', ['Admin', adminHash, 'admin', adminEmail]);
      console.log('Updated admin');
    } else {
      await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', ['Admin', adminEmail, adminHash, 'admin']);
      console.log('Inserted admin');
    }

    const [b] = await pool.query('SELECT id FROM users WHERE email = ?', [userEmail]);
    if (b.length) {
      await pool.query('UPDATE users SET name=?, password_hash=?, role=? WHERE email=?', ['Nugroho', userHash, 'user', userEmail]);
      console.log('Updated user');
    } else {
      await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', ['Nugroho', userEmail, userHash, 'user']);
      console.log('Inserted user');
    }

    console.log('Seeds done. admin:', adminEmail, adminPlain, 'user:', userEmail, userPlain);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
