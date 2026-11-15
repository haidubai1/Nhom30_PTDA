const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const { text } = require('../utils/validation');
const policy = require('../utils/articlePolicy');
const { can } = require('../utils/permissions');
const { fromInputValue } = require('../utils/dateTime');
const { Article, Category, User, sequelize } = require('../models');

const INCLUDE = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: User, as: 'author', attributes: ['id', 'display_name'] }
];

function readFields(body) {
  const title = text(body.title, { field: 'Tiêu đề', required: true, max: 200 });
  const summary = text(body.summary, { field: 'Mô tả ngắn', required: true, max: 500 });
  const content = text(body.content, { field: 'Nội dung', required: true, max: 100000 });
  const category_id = Number(body.categoryId);
  if (!Number.isInteger(category_id) || category_id <= 0) throw new AppError('Vui lòng chọn chuyên mục.', 422);
  return { title, summary, content, category_id };
}

async function load(id) {
  const a = await Article.findByPk(id, { include: INCLUDE });
  if (!a) throw new AppError('Không tìm thấy bài viết.', 404);
  return a;
}
function guard(ok, message) { if (!ok) throw new AppError(message, 403); }

// --- Độc giả -------------------------------------------------------------
// Bài hẹn giờ đến hạn thì chuyển thành đã xuất bản (US0602). Gọi từ cron và khi đọc trang.
async function publishDue(now = new Date()) {
  const [n] = await Article.update(
    { status: 'published', published_at: sequelize.col('publish_at') },
    { where: { status: 'scheduled', publish_at: { [Op.lte]: now } } }
  );
  return n;
}

async function listPublished({ categorySlug, q, limit = 30 } = {}) {
  const where = { status: 'published' };
  if (q) where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { summary: { [Op.like]: `%${q}%` } }];
  const include = [{ ...INCLUDE[0], ...(categorySlug ? { where: { slug: categorySlug } } : {}) }, INCLUDE[1]];
  return Article.findAll({ where, include, order: [['published_at', 'DESC']], limit });
}

// Khối "Đọc nhiều" ở thanh bên: các bài đã xuất bản có lượt xem cao nhất.
const topRead = (limit = 5) => Article.findAll({
  where: { status: 'published' }, attributes: ['id', 'title', 'views'], order: [['views', 'DESC']], limit
});

// --- Biên tập viên (US0401, US0402, US0501) -------------------------------
async function create(actor, body) {
  guard(can(actor, 'write'), 'Bạn không có quyền viết bài.');
  const f = readFields(body);
  if (!(await Category.findByPk(f.category_id))) throw new AppError('Chuyên mục không tồn tại.', 422);
  return Article.create({ ...f, author_id: actor.id, status: 'draft', views: 0, created_at: new Date(), updated_at: new Date() });
}

async function update(actor, id, body) {
  const a = await load(id);
  guard(policy.canEdit(actor, a), 'Chỉ tác giả mới được sửa bài ở trạng thái nháp hoặc bị từ chối.');
  const f = readFields(body);
  if (!(await Category.findByPk(f.category_id))) throw new AppError('Chuyên mục không tồn tại.', 422);
  Object.assign(a, f, { updated_at: new Date() });
  await a.save();
  return a;
}

async function submit(actor, id) {
  const a = await load(id);
  guard(policy.canSubmit(actor, a), 'Không thể gửi duyệt bài viết này.');
  a.status = 'pending'; a.reject_reason = null; a.updated_at = new Date();
  await a.save();
  return a;
}

async function remove(actor, id) {
  const a = await load(id);
  guard(policy.canDelete(actor, a), 'Không thể xóa bài viết này.');
  await a.destroy();
}

// --- Duyệt (US0502–0504) --------------------------------------------------
async function approve(actor, id) {
  const a = await load(id);
  guard(policy.canReview(actor, a), 'Bạn không thể duyệt bài này (không đủ quyền, sai trạng thái hoặc là bài của chính bạn).');
  Object.assign(a, { status: 'approved', reject_reason: null, reviewed_by: actor.id, reviewed_at: new Date() });
  await a.save();
  return a;
}

async function reject(actor, id, rawReason) {
  const a = await load(id);
  guard(policy.canReview(actor, a), 'Bạn không thể từ chối bài này.');
  const reason = text(rawReason, { field: 'Lý do từ chối', required: true, max: 500 });
  Object.assign(a, { status: 'rejected', reject_reason: reason, reviewed_by: actor.id, reviewed_at: new Date() });
  await a.save();
  return a;
}

// --- Xuất bản (US0601, US0602) --------------------------------------------
async function publishNow(actor, id) {
  const a = await load(id);
  guard(policy.canPublish(actor, a), 'Chỉ bài đã duyệt mới được xuất bản.');
  Object.assign(a, { status: 'published', published_at: new Date(), publish_at: null });
  await a.save();
  return a;
}

async function schedule(actor, id, publishAtInput, now = new Date()) {
  const a = await load(id);
  guard(policy.canPublish(actor, a), 'Chỉ bài đã duyệt mới được hẹn giờ.');
  const when = fromInputValue(publishAtInput);
  const future = when && policy.parseFutureDate(when, now);
  if (!future) throw new AppError('Thời điểm xuất bản phải ở tương lai.', 422);
  Object.assign(a, { status: 'scheduled', publish_at: future });
  await a.save();
  return a;
}

// Gỡ bài hoặc hủy lịch → quay lại "đã duyệt".
async function unpublish(actor, id) {
  const a = await load(id);
  guard(policy.canUnpublish(actor, a), 'Bài viết này chưa xuất bản hoặc chưa hẹn giờ.');
  Object.assign(a, { status: 'approved', published_at: null, publish_at: null });
  await a.save();
  return a;
}

// --- Danh sách trong khu quản trị ----------------------------------------
// view: mine | pending | publish | all
async function listFor(actor, view) {
  const where = {};
  if (view === 'mine') { guard(can(actor, 'write'), 'Chỉ biên tập viên mới có bài viết riêng.'); where.author_id = actor.id; }
  else if (view === 'pending') { guard(can(actor, 'review'), 'Bạn không có quyền duyệt bài.'); where.status = 'pending'; }
  else if (view === 'publish') { guard(can(actor, 'publish'), 'Bạn không có quyền xuất bản.'); where.status = { [Op.in]: ['approved', 'scheduled', 'published'] }; }
  else { guard(actor.role === 'manager', 'Chỉ quản lý mới xem được toàn bộ bài viết.'); }
  return Article.findAll({ where, include: INCLUDE, order: [['updated_at', 'DESC']], limit: 300 });
}

module.exports = { load, publishDue, listPublished, topRead, create, update, submit, remove, approve, reject, publishNow, schedule, unpublish, listFor };
