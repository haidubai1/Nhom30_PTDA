const CategoryService = require('../services/CategoryService');
const CommentService = require('../services/CommentService');
const UserService = require('../services/UserService');
const PermissionService = require('../services/PermissionService');
const StatsService = require('../services/StatsService');
const { RANGES } = require('../utils/statsSeries');
const { GRANTABLE } = require('../utils/permissions');

function done(req, res, next, message, to) {
  req.session.flash = { type: 'success', message };
  req.session.save((err) => (err ? next(err) : res.redirect(303, to)));
}
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res, next); } catch (e) { next(e); } };

// --- Chuyên mục (US0701–0703) ---
exports.categories = wrap(async (req, res) => res.render('admin/categories', { title: 'Chuyên mục', categories: await CategoryService.listWithCounts() }));
exports.createCategory = wrap(async (req, res, next) => { await CategoryService.create((req.body || {}).name); done(req, res, next, 'Đã thêm chuyên mục.', '/quan-tri/chuyen-muc'); });
exports.renameCategory = wrap(async (req, res, next) => { await CategoryService.rename(req.params.id, (req.body || {}).name); done(req, res, next, 'Đã cập nhật chuyên mục.', '/quan-tri/chuyen-muc'); });
exports.deleteCategory = wrap(async (req, res, next) => { await CategoryService.remove(req.params.id); done(req, res, next, 'Đã xóa chuyên mục.', '/quan-tri/chuyen-muc'); });

// --- Bình luận (US0901–0902) ---
exports.comments = wrap(async (req, res) => {
  const filter = ['pending', 'approved', 'all'].includes(req.query.status) ? req.query.status : 'pending';
  res.render('admin/comments', { title: 'Bình luận', filter, comments: await CommentService.listForModeration(filter) });
});
exports.approveComment = wrap(async (req, res, next) => { await CommentService.approve(req.params.id); done(req, res, next, 'Đã duyệt bình luận, bình luận đã hiển thị với độc giả.', '/quan-tri/binh-luan'); });
exports.deleteComment = wrap(async (req, res, next) => { await CommentService.remove(req.params.id); done(req, res, next, 'Đã xóa bình luận.', '/quan-tri/binh-luan'); });

// --- Tài khoản (US0201–0204) ---
exports.users = wrap(async (req, res) => res.render('admin/users', { title: 'Tài khoản', users: await UserService.list() }));
exports.newUser = (req, res) => res.render('admin/user-form', { title: 'Thêm tài khoản', target: null });
exports.createUser = wrap(async (req, res, next) => { await UserService.create(req.user, req.body || {}); done(req, res, next, 'Đã thêm tài khoản.', '/quan-tri/tai-khoan'); });
exports.editUser = wrap(async (req, res) => {
  const target = await UserService.get(req.params.id);
  if (req.user.role !== 'manager' && target.role === 'manager') return res.status(403).render('errors/403', { title: 'Bạn không được sửa tài khoản quản lý' });
  res.render('admin/user-form', { title: 'Sửa tài khoản', target });
});
exports.updateUser = wrap(async (req, res, next) => { await UserService.update(req.user, req.params.id, req.body || {}); done(req, res, next, 'Đã cập nhật tài khoản.', '/quan-tri/tai-khoan'); });
exports.deleteUser = wrap(async (req, res, next) => { await UserService.remove(req.user, req.params.id); done(req, res, next, 'Đã xóa tài khoản.', '/quan-tri/tai-khoan'); });

// --- Phân quyền (US0301) — chỉ quản lý ---
exports.permissions = wrap(async (req, res) => res.render('admin/permissions', { title: 'Phân quyền', grantable: GRANTABLE, granted: await PermissionService.editorPermissions() }));
exports.savePermissions = wrap(async (req, res, next) => { await PermissionService.setEditorPermissions((req.body || {}).perm); done(req, res, next, 'Đã lưu phân quyền cho biên tập viên.', '/quan-tri/phan-quyen'); });

// --- Thống kê (US0801–0803) ---
exports.stats = wrap(async (req, res) => {
  const range = ['day', 'week', 'month'].includes(req.query.range) ? req.query.range : 'day';
  const articleRange = ['week', 'month', 'all'].includes(req.query.ar) ? req.query.ar : 'all';
  const [series, perArticle, top] = await Promise.all([
    StatsService.overTime(range),
    StatsService.perArticle(articleRange),
    StatsService.topViewed(articleRange, 5)
  ]);
  const max = Math.max(1, ...series.buckets.map((b) => b.value));
  res.render('admin/stats', { title: 'Thống kê', range, ranges: RANGES, articleRange, series, max, perArticle: perArticle.sort((a, b) => b.rangeViews - a.rangeViews), top });
});
