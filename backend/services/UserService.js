const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { email: validEmail, text, oneOf } = require('../utils/validation');
const { checkPassword } = require('./AuthService');
const { User, Article } = require('../models');

const list = () => User.findAll({ order: [['role', 'ASC'], ['created_at', 'ASC']] });

async function get(id) {
  const u = await User.findByPk(id);
  if (!u) throw new AppError('Không tìm thấy tài khoản.', 404);
  return u;
}

// Người không phải quản lý không được đụng vào tài khoản quản lý.
function assertCanTouch(actor, target) {
  if (actor.role !== 'manager' && target.role === 'manager') throw new AppError('Bạn không được thao tác trên tài khoản quản lý.', 403);
}
async function countActiveManagers() { return User.count({ where: { role: 'manager', status: 'active' } }); }

// US0202
async function create(actor, body) {
  const role = actor.role === 'manager' ? oneOf(body.role, ['manager', 'editor'], { field: 'Vai trò', fallback: 'editor' }) : 'editor';
  const mail = validEmail(body.email);
  const name = text(body.displayName, { field: 'Họ tên', required: true, max: 120 });
  checkPassword(body.password);
  if (await User.findOne({ where: { email: mail } })) throw new AppError('Email này đã được đăng ký.', 409);
  return User.create({
    email: mail, display_name: name, role, status: 'active',
    password_hash: await bcrypt.hash(body.password, 12), auth_version: 1,
    created_at: new Date(), updated_at: new Date()
  });
}

// US0203
async function update(actor, id, body) {
  const u = await get(id);
  assertCanTouch(actor, u);
  const mail = validEmail(body.email);
  const name = text(body.displayName, { field: 'Họ tên', required: true, max: 120 });
  const dup = await User.findOne({ where: { email: mail } });
  if (dup && Number(dup.id) !== Number(u.id)) throw new AppError('Email này đã được dùng bởi tài khoản khác.', 409);
  const status = oneOf(body.status, ['active', 'locked'], { field: 'Trạng thái', fallback: u.status });
  const role = actor.role === 'manager' ? oneOf(body.role, ['manager', 'editor'], { field: 'Vai trò', fallback: u.role }) : u.role;

  if (u.role === 'manager' && (role !== 'manager' || status === 'locked') && (await countActiveManagers()) <= 1) {
    throw new AppError('Phải còn ít nhất một tài khoản quản lý đang hoạt động.', 409);
  }
  if (Number(u.id) === Number(actor.id) && status === 'locked') throw new AppError('Bạn không thể tự khóa tài khoản của mình.', 409);

  const changedAuth = status !== u.status || role !== u.role || Boolean(body.password);
  u.email = mail; u.display_name = name; u.status = status; u.role = role;
  if (body.password) { checkPassword(body.password); u.password_hash = await bcrypt.hash(body.password, 12); }
  if (changedAuth) u.auth_version = Number(u.auth_version || 1) + 1; // đăng xuất các phiên cũ
  u.updated_at = new Date();
  await u.save();
  return u;
}

// US0204
async function remove(actor, id) {
  const u = await get(id);
  assertCanTouch(actor, u);
  if (Number(u.id) === Number(actor.id)) throw new AppError('Bạn không thể xóa chính mình.', 409);
  if (u.role === 'manager' && (await countActiveManagers()) <= 1) throw new AppError('Không thể xóa quản lý cuối cùng.', 409);
  const n = await Article.count({ where: { author_id: u.id } });
  if (n > 0) throw new AppError(`Không thể xóa: tài khoản này còn ${n} bài viết. Hãy khóa tài khoản thay vì xóa.`, 409);
  await u.destroy();
}

module.exports = { list, get, create, update, remove };
