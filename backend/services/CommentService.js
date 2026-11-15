const AppError = require('../utils/AppError');
const { text } = require('../utils/validation');
const { Comment, Article } = require('../models');

// Độc giả gửi bình luận → chờ duyệt, chưa hiển thị công khai.
async function submit(articleId, rawName, rawContent) {
  const article = await Article.findOne({ where: { id: articleId, status: 'published' } });
  if (!article) throw new AppError('Bài viết không tồn tại hoặc chưa được xuất bản.', 404);
  const author_name = text(rawName, { field: 'Tên', required: true, max: 80 });
  const content = text(rawContent, { field: 'Nội dung bình luận', required: true, max: 1000 });
  return Comment.create({ article_id: article.id, author_name, content, status: 'pending', created_at: new Date() });
}

const listApproved = (articleId) => Comment.findAll({ where: { article_id: articleId, status: 'approved' }, order: [['created_at', 'ASC']] });

async function listForModeration(filter = 'pending') {
  const where = filter === 'all' ? {} : { status: filter === 'approved' ? 'approved' : 'pending' };
  return Comment.findAll({ where, include: [{ model: Article, as: 'article', attributes: ['id', 'title'] }], order: [['created_at', 'DESC']], limit: 200 });
}

// US0901
async function approve(id) {
  const c = await Comment.findByPk(id);
  if (!c) throw new AppError('Không tìm thấy bình luận.', 404);
  c.status = 'approved';
  await c.save();
}

// US0902
async function remove(id) {
  const n = await Comment.destroy({ where: { id } });
  if (!n) throw new AppError('Không tìm thấy bình luận.', 404);
}

module.exports = { submit, listApproved, listForModeration, approve, remove };
