// backend/src/db.js
require('dotenv').config();

const mysql = require('mysql2/promise');

const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASS ?? process.env.DB_PASSWORD ?? '';
const database = process.env.DB_NAME || 'miespanol';

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT) || 10,
  queueLimit: 0,
});

async function testConnect() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`MySQL OK — ${user}@${host}:${port} / db=${database}`);
    return true;
  } catch (err) {
    console.error('MySQL connection failed:', err.message || err);
    return false;
  }
}

module.exports = pool;
module.exports.testConnect = testConnect;
