const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

function int(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const sessionSecret = process.env.SESSION_SECRET || 'development-only-change-me-please-32-characters';
if (nodeEnv === 'production' && (!process.env.SESSION_SECRET || sessionSecret.length < 32)) {
  throw new Error('Production requires SESSION_SECRET with at least 32 characters.');
}

module.exports = {
  nodeEnv,
  port: int('PORT', 5000),
  appUrl: process.env.APP_URL || `http://localhost:${int('PORT', 5000)}`,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: int('DB_PORT', 3306),
    name: process.env.DB_NAME || 'bantin30',
    user: process.env.DB_USER || 'root',
    pass: process.env.DB_PASS || ''
  },
  sessionSecret,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'bantin30.sid',
  rememberMeDays: int('REMEMBER_ME_DAYS', 7),
  admin: {
    email: process.env.ADMIN_EMAIL || 'quanly@bantin30.vn',
    password: process.env.ADMIN_PASSWORD || '123456'
  }
};
