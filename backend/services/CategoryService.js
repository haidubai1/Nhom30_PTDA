const AppError = require('../utils/AppError');
const { text } = require('../utils/validation');
const { slugify } = require('../utils/slug');
const { Category, Article } = require('../models');

async function listWithCounts() {
  const cats = await Category.findAll({ order: [['name', 'ASC']] });
  const out = [];
  for (const c of cats) out.push({ id: c.id, name: c.name, slug: c.slug, articleCount: await Article.count({ where: { category_id: c.id } }) });
  return out;
}

async function assertUnique(name, slug, exceptId = null) {
  const all = await Category.findAll();
  const clash = all.find((c) => Number(c.id) !== Number(exceptId) && (c.name.toLowerCase() === name.toLowerCase() || c.slug === slug));
  if (clash) throw new AppError('Tên chuyên mục đã tồn tại.', 409);
}

// US0701
async function create(rawName) {
  const name = text(rawName, { field: 'Tên chuyên mục', required: true, max: 80 });
  const slug = slugify(name);
  if (!slug) throw new AppError('Tên chuyên mục không hợp lệ.', 422);
  await assertUnique(name, slug);
  return Category.create({ name, slug, created_at: new Date() });
}

// US0702
async function rename(id, rawName) {
  const cat = await Category.findByPk(id);
  if (!cat) throw new AppError('Không tìm thấy chuyên mục.', 404);
  const name = text(rawName, { field: 'Tên chuyên mục', required: true, max: 80 });
  const slug = slugify(name);
  if (!slug) throw new AppError('Tên chuyên mục không hợp lệ.', 422);
  await assertUnique(name, slug, cat.id);
  cat.name = name; cat.slug = slug;
  await cat.save();
  return cat;
}

// US0703: chuyên mục còn bài viết thì không được xóa.
async function remove(id) {
  const cat = await Category.findByPk(id);
  if (!cat) throw new AppError('Không tìm thấy chuyên mục.', 404);
  const n = await Article.count({ where: { category_id: cat.id } });
  if (n > 0) throw new AppError(`Không thể xóa: chuyên mục "${cat.name}" còn ${n} bài viết. Hãy chuyển bài sang chuyên mục khác trước.`, 409);
  await cat.destroy();
}

module.exports = { listWithCounts, create, rename, remove };
