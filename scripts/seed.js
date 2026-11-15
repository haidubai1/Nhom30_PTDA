// Dữ liệu mẫu: 1 tài khoản quản lý, 1 biên tập viên mẫu, chuyên mục, 12 bài đã xuất bản + vài bài ở các trạng thái khác.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../backend/config/env');
const { sequelize, User, Category, Article, Comment, ArticleDailyView, RolePermission } = require('../backend/models');
const { slugify } = require('../backend/utils/slug');
const { toDateOnlyVN, addDays } = require('../backend/utils/dateTime');
const samples = require('../data/sample-articles.json');

const CATS = { 'thoi-su': 'Thời sự', 'kinh-te': 'Kinh tế', 'cong-nghe': 'Công nghệ', 'giao-duc': 'Giáo dục', 'the-thao': 'Thể thao', 'doi-song': 'Đời sống' };
const DAY = 86400000;

// Sinh phân bố lượt xem theo ngày (cố định theo id để chạy lại ra cùng kết quả).
function spread(total, daysAlive, seed) {
  const w = []; let s = 0;
  for (let i = 0; i < daysAlive; i++) { const r = ((Math.sin(seed * 97 + i * 13.7) + 1) / 2) * 0.6 + 0.4; const x = r * Math.pow(0.8, i); w.push(x); s += x; }
  const out = w.map((x) => Math.floor((x / s) * total));
  out[0] += total - out.reduce((a, b) => a + b, 0);
  return out; // out[i] = i ngày sau ngày đăng
}

(async () => {
  await sequelize.authenticate();
  const now = new Date();

  const mk = async (email, name, role, password) => {
    let u = await User.findOne({ where: { email } });
    if (!u) u = await User.create({ email, display_name: name, role, status: 'active', password_hash: await bcrypt.hash(password, 12), auth_version: 1, created_at: now, updated_at: now });
    else if (role === 'manager' && ['Quản lý Bản Tin 30', 'Quản lý Tin Tức HaUI'].includes(u.display_name)) { u.display_name = name; await u.save(); } // đổi tên mặc định cũ
    return u;
  };
  const manager = await mk(env.admin.email, 'Quản lý', 'manager', env.admin.password);
  const samplePw = crypto.randomBytes(6).toString('hex');
  const hadEditor = await User.findOne({ where: { email: 'bientap@bantin30.vn' } });
  const editor = await mk('bientap@bantin30.vn', 'Lan Phương (mẫu)', 'editor', samplePw);

  if (!(await RolePermission.count())) await RolePermission.bulkCreate([{ role: 'editor', permission: 'comments' }]);

  const catId = {};
  for (const [key, name] of Object.entries(CATS)) {
    const [c] = await Category.findOrCreate({ where: { slug: slugify(name) }, defaults: { name, slug: slugify(name), created_at: now } });
    catId[key] = c.id;
  }

  if (!(await Article.count())) {
    const today = toDateOnlyVN(now);
    const newest = Math.max(...samples.map((a) => +new Date(a.publishedAt)));
    const shift = Math.floor((now.getTime() - 1 * DAY - newest) / DAY) * DAY; // bài mới nhất ≈ hôm qua
    for (const s of samples) {
      const publishedAt = new Date(+new Date(s.publishedAt) + shift);
      const art = await Article.create({
        category_id: catId[s.category], author_id: editor.id, title: s.title, summary: s.summary, content: s.content,
        status: 'published', reviewed_by: manager.id, reviewed_at: publishedAt, published_at: publishedAt, views: s.views,
        created_at: publishedAt, updated_at: publishedAt
      });
      const alive = Math.max(1, Math.floor((now - publishedAt) / DAY) + 1);
      const perDay = spread(s.views, alive, s.key);
      const rows = perDay.map((v, i) => ({ article_id: art.id, day: addDays(toDateOnlyVN(publishedAt), i), views: v })).filter((r) => r.views > 0 && r.day <= today);
      await ArticleDailyView.bulkCreate(rows);
    }
    const demo = [
      ['draft', 'Bản nháp: Ngày hội việc làm sinh viên sắp diễn ra', null],
      ['pending', 'Chờ duyệt: Khai trương tuyến metro số 2', null],
      ['rejected', 'Bị từ chối: Dự báo giá vàng tuần tới', 'Thiếu nguồn dẫn chứng, vui lòng bổ sung.'],
      ['approved', 'Đã duyệt: Giải chạy gây quỹ học bổng', null]
    ];
    for (const [status, title, reason] of demo) {
      await Article.create({
        category_id: catId['doi-song'], author_id: editor.id, title, summary: 'Bài viết mẫu để thử luồng duyệt và xuất bản.',
        content: 'Đoạn một của bài mẫu.\n\nĐoạn hai của bài mẫu.', status, reject_reason: reason, views: 0, created_at: now, updated_at: now,
        ...(status === 'rejected' || status === 'approved' ? { reviewed_by: manager.id, reviewed_at: now } : {})
      });
    }
    const first = await Article.findOne({ where: { status: 'published' }, order: [['published_at', 'DESC']] });
    await Comment.bulkCreate([
      { article_id: first.id, author_name: 'Minh Anh', content: 'Tin hữu ích, cảm ơn báo!', status: 'approved', created_at: now },
      { article_id: first.id, author_name: 'Quốc Bảo', content: 'Bình luận này đang chờ quản lý duyệt.', status: 'pending', created_at: now }
    ]);
  }

  console.log('Seed xong.');
  console.log(`  Quản lý:        ${env.admin.email} / ${env.admin.password}`);
  console.log(`  Biên tập mẫu:   bientap@bantin30.vn / ${hadEditor ? '(đã tạo từ lần trước)' : samplePw}`);
  console.log('  Biên tập viên mới tự đăng ký tại /auth?mode=register');
  await sequelize.close();
})().catch((e) => { console.error('Seed thất bại:', e.message); process.exit(1); });
