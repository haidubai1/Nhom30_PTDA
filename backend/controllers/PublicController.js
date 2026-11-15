const { Category } = require('../models');
const ArticleService = require('../services/ArticleService');
const CommentService = require('../services/CommentService');
const StatsService = require('../services/StatsService');
const policy = require('../utils/articlePolicy');
const AppError = require('../utils/AppError');

exports.home = async (req, res, next) => {
  try {
    await ArticleService.publishDue();
    const categorySlug = String(req.query.c || '').trim() || null;
    const q = String(req.query.q || '').trim().slice(0, 100) || null;
    const [articles, categories, topRead] = await Promise.all([
      ArticleService.listPublished({ categorySlug, q }),
      Category.findAll({ order: [['name', 'ASC']] }),
      ArticleService.topRead(5)
    ]);
    res.render('home', { title: 'Trang chủ', articles, categories, topRead, activeSlug: categorySlug, q: q || '' });
  } catch (e) { next(e); }
};

exports.article = async (req, res, next) => {
  try {
    await ArticleService.publishDue();
    const article = await ArticleService.load(req.params.id).catch(() => null);
    if (!article) throw new AppError('Không tìm thấy bài viết.', 404);
    const published = article.status === 'published';
    if (!published && !policy.canPreview(req.user, article)) throw new AppError('Không tìm thấy bài viết.', 404);

    if (published) { // mỗi phiên chỉ tính 1 lượt xem cho mỗi bài
      const seen = req.session.viewed || [];
      if (!seen.includes(Number(article.id))) {
        await StatsService.recordView(article.id);
        req.session.viewed = [...seen.slice(-199), Number(article.id)];
        article.views = Number(article.views) + 1;
      }
    }
    const comments = published ? await CommentService.listApproved(article.id) : [];
    const [categories, topRead] = await Promise.all([Category.findAll({ order: [['name', 'ASC']] }), ArticleService.topRead(5)]);
    res.render('article', { title: article.title, article, comments, categories, topRead, activeSlug: article.category.slug, preview: !published });
  } catch (e) { next(e); }
};

exports.addComment = async (req, res, next) => {
  try {
    const b = req.body || {};
    await CommentService.submit(req.params.id, b.authorName, b.content);
    req.session.flash = { type: 'success', message: 'Cảm ơn bạn! Bình luận đã được gửi và sẽ hiển thị sau khi được duyệt.' };
    req.session.save((err) => (err ? next(err) : res.redirect(303, `/bai-viet/${req.params.id}#binh-luan`)));
  } catch (e) { next(e); }
};
