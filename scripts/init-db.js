// Tạo database + bảng từ db/schema.sql (không cần cài mysql CLI).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../backend/config/env');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
    .replace(/CREATE DATABASE IF NOT EXISTS bantin30/, `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\``)
    .replace(/USE bantin30;/, `USE \`${env.db.name}\`;`);
  const conn = await mysql.createConnection({ host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.pass, multipleStatements: true });
  try { await conn.query(sql); console.log(`Đã tạo database "${env.db.name}" và các bảng.`); }
  finally { await conn.end(); }
})().catch((e) => { console.error('init-db thất bại:', e.message); process.exit(1); });
