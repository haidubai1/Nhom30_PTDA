const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { email: validEmail, text } = require('../utils/validation');
const { User } = require('../models');

const BAD_LOGIN = 'Email hoặc mật khẩu không đúng.';

function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 6) throw new AppError('Mật khẩu phải có ít nhất 6 ký tự.', 422);
  if (pw.length > 72) throw new AppError('Mật khẩu quá dài (tối đa 72 ký tự).', 422);
  return pw;
}

async function authenticate(rawEmail, password) {
  let mail;
  try { mail = validEmail(rawEmail); } catch (e) { throw new AppError(BAD_LOGIN, 401); }
  const user = await User.findOne({ where: { email: mail } });
  const ok = user && await bcrypt.compare(String(password || ''), user.password_hash);
  if (!ok) throw new AppError(BAD_LOGIN, 401);
  if (user.status === 'locked') throw new AppError('Tài khoản đã bị khóa. Vui lòng liên hệ quản lý.', 403);
  user.last_login_at = new Date();
  await user.save();
  return user;
}

// Biên tập viên tự đăng ký tài khoản (vai trò luôn là editor).
async function registerEditor({ displayName, email, password, confirmPassword }) {
  const name = text(displayName, { field: 'Họ tên', required: true, max: 120 });
  const mail = validEmail(email);
  checkPassword(password);
  if (password !== confirmPassword) throw new AppError('Mật khẩu xác nhận không khớp.', 422);
  if (await User.findOne({ where: { email: mail } })) throw new AppError('Email này đã được đăng ký.', 409);
  return User.create({
    email: mail, display_name: name, role: 'editor', status: 'active',
    password_hash: await bcrypt.hash(password, 12), auth_version: 1,
    created_at: new Date(), updated_at: new Date()
  });
}

module.exports = { authenticate, registerEditor, checkPassword };
