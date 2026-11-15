const { Article, Comment, Category, User } = require('../models');
const ArticleService = require('../services/ArticleService');
const policy = require('../utils/articlePolicy');
const { can } = require('../utils/permissions');

exports.dashboard = async (req, res, next) => {
  try {
    const u = req.user;
    const cards = [];
    if (can(u, 'write')) cards.push({ label: 'Bài của tôi', value: await Article.count({ where: { author_id: u.id } }), href: '/quan-tri/bai-viet?view=mine' });
    if (can(u, 'review')) cards.push({ label: 'Bài chờ duyệt', value: await Article.count({ where: { status: 'pending' } }), href: '/quan-tri/bai-viet?view=pending' });
    if (can(u, 'publish')) cards.push({ label: 'Bài đã duyệt chờ xuất bản', value: await Article.count({ where: { status: 'approved' } }), href: '/quan-tri/bai-viet?view=publish' });
    if (can(u, 'comments')) cards.push({ label: 'Bình luận chờ duyệt', value: await Comment.count({ where: { status: 'pending' } }), href: '/quan-tri/binh-luan' });
    if (can(u, 'cats')) cards.push({ label: 'Chuyên mục', value: await Category.count(), href: '/quan-tri/chuyen-muc' });
    if (can(u, 'accs')) cards.push({ label: 'Tài khoản', value: await User.count(), href: '/quan-tri/tai-khoan' });
    res.render('admin/dashboard', { title: 'Tổng quan', cards });
  } catch (e) { next(e); }
};

const VIEWS = { mine: 'Bài của tôi', pending: 'Chờ duyệt', publish: 'Xuất bản', all: 'Tất cả bài viết' };

exports.listArticles = async (req, res, next) => {
  try {
    const u = req.user;
    const fallback = can(u, 'write') ? 'mine' : can(u, 'review') ? 'pending' : can(u, 'publish') ? 'publish' : 'all';
    const view = Object.keys(VIEWS).includes(req.query.view) ? req.query.view : fallback;
    const articles = await ArticleService.listFor(u, view);
    const rows = articles.map((a) => ({
      a,
      actions: {
        edit: policy.canEdit(u, a), submit: policy.canSubmit(u, a), remove: policy.canDelete(u, a),
        review: policy.canReview(u, a), publish: policy.canPublish(u, a), unpublish: policy.canUnpublish(u, a)
      }
    }));
    res.render('admin/articles', { title: VIEWS[view], view, views: VIEWS, rows });
  } catch (e) { next(e); }
};

exports.newForm = async (req, res, next) => {
  try { res.render('admin/article-form', { title: 'Viết bài mới', article: null, categories: await Category.findAll({ order: [['name', 'ASC']] }) }); }
  catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = await ArticleService.create(req.user, req.body || {});
    req.session.flash = { type: 'success', message: 'Đã lưu bài viết ở trạng thái nháp.' };
    req.session.save((err) => (err ? next(err) : res.redirect(`/quan-tri/bai-viet/${a.id}`)));
  } catch (e) { next(e); }
};

// Trang chi tiết bài: nội dung + trạng thái + các thao tác phù hợp (US0505)
exports.show = async (req, res, next) => {
  try {
    const a = await ArticleService.load(req.params.id);
    const u = req.user;
    if (!policy.canPreview(u, a)) return res.status(403).render('errors/403', { title: 'Bạn không có quyền xem bài này' });
    res.render('admin/article-show', {
      title: a.title, a,
      actions: { edit: policy.canEdit(u, a), submit: policy.canSubmit(u, a), remove: policy.canDelete(u, a), review: policy.canReview(u, a), publish: policy.canPublish(u, a), unpublish: policy.canUnpublish(u, a) }
    });
  } catch (e) { next(e); }
};

exports.editForm = async (req, res, next) => {
  try {
    const a = await ArticleService.load(req.params.id);
    if (!policy.canEdit(req.user, a)) return res.status(403).render('errors/403', { title: 'Bạn không thể sửa bài này' });
    res.render('admin/article-form', { title: 'Sửa bài viết', article: a, categories: await Category.findAll({ order: [['name', 'ASC']] }) });
  } catch (e) { next(e); }
};

function flashRedirect(req, res, next, message, to) {
  req.session.flash = { type: 'success', message };
  req.session.save((err) => (err ? next(err) : res.redirect(303, to)));
}
const show = (id) => `/quan-tri/bai-viet/${id}`;

exports.update = async (req, res, next) => { try { await ArticleService.update(req.user, req.params.id, req.body || {}); flashRedirect(req, res, next, 'Đã cập nhật bài viết.', show(req.params.id)); } catch (e) { next(e); } };
exports.submit = async (req, res, next) => { try { await ArticleService.submit(req.user, req.params.id); flashRedirect(req, res, next, 'Đã gửi bài đi duyệt.', show(req.params.id)); } catch (e) { next(e); } };
exports.remove = async (req, res, next) => { try { await ArticleService.remove(req.user, req.params.id); flashRedirect(req, res, next, 'Đã xóa bài viết.', '/quan-tri/bai-viet?view=mine'); } catch (e) { next(e); } };
exports.approve = async (req, res, next) => { try { await ArticleService.approve(req.user, req.params.id); flashRedirect(req, res, next, 'Đã duyệt bài viết.', show(req.params.id)); } catch (e) { next(e); } };
exports.reject = async (req, res, next) => { try { await ArticleService.reject(req.user, req.params.id, (req.body || {}).reason); flashRedirect(req, res, next, 'Đã từ chối bài viết và gửi lý do cho tác giả.', '/quan-tri/bai-viet?view=pending'); } catch (e) { next(e); } };
exports.publishNow = async (req, res, next) => { try { await ArticleService.publishNow(req.user, req.params.id); flashRedirect(req, res, next, 'Đã xuất bản bài viết.', show(req.params.id)); } catch (e) { next(e); } };
exports.schedule = async (req, res, next) => { try { await ArticleService.schedule(req.user, req.params.id, (req.body || {}).publishAt); flashRedirect(req, res, next, 'Đã hẹn giờ xuất bản.', show(req.params.id)); } catch (e) { next(e); } };
exports.unpublish = async (req, res, next) => { try { await ArticleService.unpublish(req.user, req.params.id); flashRedirect(req, res, next, 'Đã gỡ bài / hủy lịch. Bài quay về trạng thái đã duyệt.', show(req.params.id)); } catch (e) { next(e); } };
