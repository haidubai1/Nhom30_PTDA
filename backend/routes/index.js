const express = require('express');
const router = express.Router();
const AppError = require('../utils/AppError');

// Express 5 (path-to-regexp 8) không hỗ trợ regex trong đường dẫn → kiểm tra :id tại đây.
router.param('id', (req, res, next, value) => (/^\d{1,18}$/.test(value) ? next() : next(new AppError('Không tìm thấy trang.', 404))));
const { requireAuth, requirePerm } = require('../middlewares/auth');
const { authLimiter, commentLimiter } = require('../middlewares/rateLimits');

const Public = require('../controllers/PublicController');
const Auth = require('../controllers/AuthController');
const Admin = require('../controllers/AdminController');
const Manage = require('../controllers/ManageController');

// --- Độc giả (không cần tài khoản) ---
router.get('/', Public.home);
router.get('/bai-viet/:id', Public.article);
router.post('/bai-viet/:id/binh-luan', commentLimiter, Public.addComment);

// --- Đăng nhập / đăng ký biên tập viên ---
router.get('/auth', Auth.showAuth);
router.post('/auth/login', authLimiter, Auth.login);
router.post('/auth/register', authLimiter, Auth.register);
router.post('/auth/logout', requireAuth, Auth.logout);

// --- Khu quản trị ---
router.use('/quan-tri', requireAuth);
router.get('/quan-tri', Admin.dashboard);

// Bài viết
router.get('/quan-tri/bai-viet', Admin.listArticles);
router.get('/quan-tri/bai-viet/moi', requirePerm('write'), Admin.newForm);
router.post('/quan-tri/bai-viet', requirePerm('write'), Admin.create);
router.get('/quan-tri/bai-viet/:id', Admin.show);
router.get('/quan-tri/bai-viet/:id/sua', requirePerm('write'), Admin.editForm);
router.post('/quan-tri/bai-viet/:id', requirePerm('write'), Admin.update);       // sửa bài
router.post('/quan-tri/bai-viet/:id/gui-duyet', requirePerm('write'), Admin.submit);
router.post('/quan-tri/bai-viet/:id/xoa', requirePerm('write'), Admin.remove);
router.post('/quan-tri/bai-viet/:id/duyet', requirePerm('review'), Admin.approve);
router.post('/quan-tri/bai-viet/:id/tu-choi', requirePerm('review'), Admin.reject);
router.post('/quan-tri/bai-viet/:id/xuat-ban', requirePerm('publish'), Admin.publishNow);
router.post('/quan-tri/bai-viet/:id/hen-gio', requirePerm('publish'), Admin.schedule);
router.post('/quan-tri/bai-viet/:id/go-bai', requirePerm('publish'), Admin.unpublish);

// Chuyên mục
router.get('/quan-tri/chuyen-muc', requirePerm('cats'), Manage.categories);
router.post('/quan-tri/chuyen-muc', requirePerm('cats'), Manage.createCategory);
router.post('/quan-tri/chuyen-muc/:id', requirePerm('cats'), Manage.renameCategory);
router.post('/quan-tri/chuyen-muc/:id/xoa', requirePerm('cats'), Manage.deleteCategory);

// Bình luận
router.get('/quan-tri/binh-luan', requirePerm('comments'), Manage.comments);
router.post('/quan-tri/binh-luan/:id/duyet', requirePerm('comments'), Manage.approveComment);
router.post('/quan-tri/binh-luan/:id/xoa', requirePerm('comments'), Manage.deleteComment);

// Tài khoản
router.get('/quan-tri/tai-khoan', requirePerm('accs'), Manage.users);
router.get('/quan-tri/tai-khoan/moi', requirePerm('accs'), Manage.newUser);
router.post('/quan-tri/tai-khoan', requirePerm('accs'), Manage.createUser);
router.get('/quan-tri/tai-khoan/:id/sua', requirePerm('accs'), Manage.editUser);
router.post('/quan-tri/tai-khoan/:id', requirePerm('accs'), Manage.updateUser);
router.post('/quan-tri/tai-khoan/:id/xoa', requirePerm('accs'), Manage.deleteUser);

// Phân quyền (chỉ quản lý)
const managerOnly = (req, res, next) => (req.user.role === 'manager' ? next() : res.status(403).render('errors/403', { title: 'Chỉ quản lý mới được phân quyền' }));
router.get('/quan-tri/phan-quyen', managerOnly, Manage.permissions);
router.post('/quan-tri/phan-quyen', managerOnly, Manage.savePermissions);

// Thống kê
router.get('/quan-tri/thong-ke', requirePerm('stats'), Manage.stats);

module.exports = router;
