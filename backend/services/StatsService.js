const { Op } = require('sequelize');
const { buildSeries } = require('../utils/statsSeries');
const { toDateOnlyVN, addDays } = require('../utils/dateTime');
const { Article, ArticleDailyView, sequelize } = require('../models');

// Ghi nhận 1 lượt xem (tổng + theo ngày).
async function recordView(articleId, now = new Date()) {
  await Article.increment('views', { by: 1, where: { id: articleId, status: 'published' } });
  await sequelize.query(
    'INSERT INTO article_daily_views (article_id, day, views) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE views = views + 1',
    { replacements: [articleId, toDateOnlyVN(now)] }
  );
}

async function dailyRows(fromYmd, toYmd) {
  const rows = await ArticleDailyView.findAll({ where: { day: { [Op.between]: [fromYmd, toYmd] } }, attributes: ['day', 'views'], raw: true });
  return rows.map((r) => ({ day: String(r.day).slice(0, 10), views: r.views }));
}

// US0801: lượt truy cập theo ngày / tuần / tháng
async function overTime(range, now = new Date()) {
  const today = toDateOnlyVN(now);
  const key = ['day', 'week', 'month'].includes(range) ? range : 'day';
  const span = key === 'day' ? 14 : key === 'week' ? 12 * 7 + 7 : 4 * 31 + 31;
  const rows = await dailyRows(addDays(today, -span), today);
  return { range: key, ...buildSeries(rows, key, today) };
}

// US0802: lượt xem từng bài (tổng + trong khoảng đã chọn)
async function perArticle(range, now = new Date()) {
  const today = toDateOnlyVN(now);
  const days = range === 'month' ? 30 : range === 'week' ? 7 : 1000;
  const from = addDays(today, -(days - 1));
  const articles = await Article.findAll({ where: { status: 'published' }, attributes: ['id', 'title', 'views', 'published_at'], raw: true });
  const rows = await ArticleDailyView.findAll({ where: { day: { [Op.gte]: from } }, attributes: ['article_id', 'views'], raw: true });
  const inRange = new Map();
  for (const r of rows) inRange.set(Number(r.article_id), (inRange.get(Number(r.article_id)) || 0) + r.views);
  return articles.map((a) => ({ ...a, rangeViews: days === 1000 ? a.views : inRange.get(Number(a.id)) || 0 }));
}

// US0803
async function topViewed(range, limit = 5, now = new Date()) {
  const list = await perArticle(range, now);
  return list.sort((a, b) => b.rangeViews - a.rangeViews).slice(0, limit);
}

module.exports = { recordView, overTime, perArticle, topViewed };
