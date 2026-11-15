const { User } = require('../models');
const { can } = require('../utils/permissions');
const PermissionService = require('../services/PermissionService');

async function attachCurrentUser(req, res, next) {
  try {
    res.locals.currentUser = null;
    res.locals.can = () => false;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;

    if (!req.session.userId) return next();
    const user = await User.findByPk(req.session.userId);
    if (!user || user.status === 'locked' || Number(req.session.authVersion || 0) !== Number(user.auth_version || 1)) {
      req.session.destroy(() => {});
      return next();
    }
    user.permissions = user.role === 'editor' ? await PermissionService.editorPermissions() : [];
    req.user = user;
    res.locals.currentUser = user;
    res.locals.can = (perm) => can(user, perm);
    next();
  } catch (error) { next(error); }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    req.session.returnTo = req.method === 'GET' && req.originalUrl.startsWith('/') && !req.originalUrl.startsWith('//') ? req.originalUrl : '/quan-tri';
    req.session.flash = { type: 'warning', message: 'Vui lòng đăng nhập để tiếp tục.' };
    return res.redirect('/auth?mode=login');
  }
  next();
}

// Chặn truy cập nếu thiếu quyền (dùng cho từng nhóm chức năng).
function requirePerm(perm) {
  return (req, res, next) => {
    if (!req.user) return requireAuth(req, res, next);
    if (!can(req.user, perm)) return res.status(403).render('errors/403', { title: 'Bạn không có quyền truy cập chức năng này' });
    next();
  };
}

module.exports = { attachCurrentUser, requireAuth, requirePerm };
