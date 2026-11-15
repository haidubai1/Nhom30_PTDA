'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadWithMocks, fakeModel } = require('./helpers/loadService');
const { can, GRANTABLE } = require('../backend/utils/permissions');
const policy = require('../backend/utils/articlePolicy');
const { slugify } = require('../backend/utils/slug');
const { buildSeries } = require('../backend/utils/statsSeries');
const { fromInputValue, toDateOnlyVN, toInputValue } = require('../backend/utils/dateTime');

const mgr = { id: 1, role: 'manager', permissions: [] };
const ed = (perms = []) => ({ id: 2, role: 'editor', permissions: perms });
const ed2 = { id: 3, role: 'editor', permissions: ['review', 'publish'] };

// ---- Quyền ----
test('quản lý có mọi quyền trừ viết bài; biên tập viên luôn viết được, quyền khác phải được cấp', () => {
  for (const p of GRANTABLE) assert.equal(can(mgr, p), true, p);
  assert.equal(can(mgr, 'write'), false);
  assert.equal(can(ed(), 'write'), true);
  assert.equal(can(ed(), 'review'), false);
  assert.equal(can(ed(['review']), 'review'), true);
  assert.equal(can(null, 'write'), false);
});

// ---- Chính sách bài viết ----
test('chỉ tác giả sửa/gửi/xóa khi nháp hoặc bị từ chối', () => {
  const a = (status, author_id = 2) => ({ status, author_id });
  assert.equal(policy.canEdit(ed(), a('draft')), true);
  assert.equal(policy.canEdit(ed(), a('rejected')), true);
  assert.equal(policy.canEdit(ed(), a('pending')), false);
  assert.equal(policy.canEdit(ed(), a('published')), false);
  assert.equal(policy.canEdit(ed(), a('draft', 9)), false);
  assert.equal(policy.canEdit(mgr, a('draft', 1)), false, 'quản lý không viết bài');
});
test('duyệt: cần quyền, bài chờ duyệt, và không tự duyệt bài của mình', () => {
  assert.equal(policy.canReview(ed2, { status: 'pending', author_id: 2 }), true);
  assert.equal(policy.canReview(ed2, { status: 'pending', author_id: 3 }), false);
  assert.equal(policy.canReview(ed(), { status: 'pending', author_id: 9 }), false);
  assert.equal(policy.canReview(mgr, { status: 'draft', author_id: 9 }), false);
  assert.equal(policy.canReview(mgr, { status: 'pending', author_id: 9 }), true);
});
test('xuất bản chỉ với bài đã duyệt; gỡ với bài đã xuất bản/hẹn giờ', () => {
  assert.equal(policy.canPublish(mgr, { status: 'approved' }), true);
  assert.equal(policy.canPublish(mgr, { status: 'pending' }), false);
  assert.equal(policy.canUnpublish(mgr, { status: 'scheduled' }), true);
  assert.equal(policy.canUnpublish(mgr, { status: 'approved' }), false);
});
test('hẹn giờ phải ở tương lai', () => {
  const now = new Date('2026-11-14T00:00:00Z');
  assert.ok(policy.parseFutureDate(new Date('2026-11-14T00:01:00Z'), now));
  assert.equal(policy.parseFutureDate(new Date('2026-11-13T23:59:00Z'), now), null);
  assert.equal(policy.parseFutureDate('abc', now), null);
});
test('giờ nhập theo múi giờ Việt Nam', () => {
  assert.equal(fromInputValue('2026-11-14T10:30').toISOString(), '2026-11-14T03:30:00.000Z');
  assert.equal(toInputValue(new Date('2026-11-14T03:30:00Z')), '2026-11-14T10:30');
  assert.equal(toDateOnlyVN(new Date('2026-11-13T18:00:00Z')), '2026-11-14');
  assert.equal(fromInputValue('hôm qua'), null);
});
test('slug tiếng Việt', () => { assert.equal(slugify('Thời sự & Đời sống!'), 'thoi-su-doi-song'); });

// ---- Vòng đời bài viết qua ArticleService ----
function articleService(articles, cats = [{ id: 1, name: 'Thời sự' }]) {
  const Article = fakeModel(articles);
  const Category = fakeModel(cats);
  Article.update = async () => [0];
  const svc = loadWithMocks('backend/services/ArticleService.js', {
    sequelize: { Op: { lte: 'lte', in: 'in', or: 'or', like: 'like' } },
    '../models': { Article, Category, User: {}, sequelize: { col: (c) => c } }
  });
  return { svc, Article };
}
const body = { title: 'Tiêu đề', summary: 'Tóm tắt', content: 'Nội dung', categoryId: '1' };

test('luồng đầy đủ: nháp → gửi duyệt → từ chối → sửa → gửi lại → duyệt → hẹn giờ → gỡ', async () => {
  const { svc, Article } = articleService([]);
  const writer = ed(), reviewer = { id: 7, role: 'manager', permissions: [] };
  const a = await svc.create(writer, body);
  assert.equal(a.status, 'draft');
  await svc.submit(writer, a.id);
  assert.equal(Article.rows[0].status, 'pending');
  await assert.rejects(() => svc.update(writer, a.id, body), /Chỉ tác giả/); // đang chờ duyệt thì không sửa
  await assert.rejects(() => svc.reject(reviewer, a.id, ''), /Lý do/);       // bắt buộc có lý do
  await svc.reject(reviewer, a.id, 'Thiếu nguồn');
  assert.equal(Article.rows[0].status, 'rejected');
  assert.equal(Article.rows[0].reject_reason, 'Thiếu nguồn');
  await svc.update(writer, a.id, { ...body, title: 'Tiêu đề mới' });
  await svc.submit(writer, a.id);
  assert.equal(Article.rows[0].reject_reason, null);
  await svc.approve(reviewer, a.id);
  assert.equal(Article.rows[0].status, 'approved');
  await assert.rejects(() => svc.schedule(reviewer, a.id, '2020-01-01T10:00'), /tương lai/);
  await svc.schedule(reviewer, a.id, '2026-11-20T10:00', new Date('2026-11-14T00:00:00Z'));
  assert.equal(Article.rows[0].status, 'scheduled');
  await svc.unpublish(reviewer, a.id);
  assert.equal(Article.rows[0].status, 'approved');
  await svc.publishNow(reviewer, a.id);
  assert.equal(Article.rows[0].status, 'published');
  assert.ok(Article.rows[0].published_at);
});

test('không thể duyệt/xuất bản sai trạng thái hoặc thiếu quyền; không tự duyệt', async () => {
  const { svc } = articleService([
    { id: 1, author_id: 3, status: 'pending', title: 't', summary: 's', content: 'c', category_id: 1 },
    { id: 2, author_id: 2, status: 'draft', title: 't', summary: 's', content: 'c', category_id: 1 }
  ]);
  await assert.rejects(() => svc.approve(ed(), 1), /không thể duyệt/i);        // thiếu quyền review
  await assert.rejects(() => svc.approve(ed2, 1), /không thể duyệt/i);         // tự duyệt bài của chính mình (id 3)
  await assert.rejects(() => svc.publishNow(mgr, 1), /đã duyệt/);              // pending chưa được xuất bản
  await assert.rejects(() => svc.submit(ed(), 1), /Không thể gửi/);            // không phải tác giả
  await assert.rejects(() => svc.create(mgr, body), /không có quyền viết/);   // quản lý không viết bài
  await assert.rejects(() => svc.create(ed(), { ...body, categoryId: '' }), /chuyên mục/);
  await assert.rejects(() => svc.create(ed(), { ...body, title: '  ' }), /Tiêu đề/);
});

test('xóa bài: chỉ tác giả khi nháp/từ chối', async () => {
  const { svc, Article } = articleService([
    { id: 1, author_id: 2, status: 'draft' }, { id: 2, author_id: 2, status: 'published' }
  ]);
  await assert.rejects(() => svc.remove(ed(), 2), /Không thể xóa/);
  await svc.remove(ed(), 1);
  assert.equal(Article.rows.length, 1);
});

// ---- Chuyên mục ----
test('chuyên mục: không trùng tên, không xóa khi còn bài', async () => {
  const Category = fakeModel([{ id: 1, name: 'Thời sự', slug: 'thoi-su' }]);
  const Article = fakeModel([{ id: 1, category_id: 1 }]);
  const svc = loadWithMocks('backend/services/CategoryService.js', { '../models': { Category, Article } });
  await assert.rejects(() => svc.create('thời sự'), /đã tồn tại/);
  await assert.rejects(() => svc.create('  '), /không được để trống/);
  const c = await svc.create('Pháp luật');
  assert.equal(c.slug, 'phap-luat');
  await assert.rejects(() => svc.remove(1), /còn 1 bài viết/);
  await svc.remove(c.id);
  assert.equal(Category.rows.length, 1);
  await svc.rename(1, 'Thời sự 24h');
  assert.equal(Category.rows[0].slug, 'thoi-su-24h');
  await assert.rejects(() => svc.rename(99, 'x'), /Không tìm thấy/);
});

// ---- Bình luận ----
test('bình luận mới chờ duyệt, chỉ bài đã xuất bản mới nhận bình luận', async () => {
  const Article = fakeModel([{ id: 1, status: 'published' }, { id: 2, status: 'draft' }]);
  const Comment = fakeModel([]);
  const svc = loadWithMocks('backend/services/CommentService.js', { '../models': { Article, Comment } });
  const c = await svc.submit(1, 'Bảo', 'Hay quá');
  assert.equal(c.status, 'pending');
  assert.equal((await svc.listApproved(1)).length, 0);
  await svc.approve(c.id);
  assert.equal((await svc.listApproved(1)).length, 1);
  await assert.rejects(() => svc.submit(2, 'A', 'B'), /chưa được xuất bản/);
  await assert.rejects(() => svc.submit(1, '', 'B'), /Tên/);
  await svc.remove(c.id);
  await assert.rejects(() => svc.remove(c.id), /Không tìm thấy/);
});

// ---- Tài khoản ----
function userService(users, articles = []) {
  const User = fakeModel(users, { auth_version: 1 });
  const Article = fakeModel(articles);
  const bcrypt = { hash: async (s) => `h:${s}`, compare: async (s, h) => h === `h:${s}` };
  const svc = loadWithMocks('backend/services/UserService.js', {
    bcryptjs: bcrypt, '../models': { User, Article },
    './AuthService': { checkPassword: (p) => { if (!p || p.length < 6) throw Object.assign(new Error('Mật khẩu phải có ít nhất 6 ký tự.'), { statusCode: 422 }); return p; } }
  });
  return { svc, User };
}
const M = (o = {}) => ({ id: 1, email: 'm@x.vn', display_name: 'M', role: 'manager', status: 'active', password_hash: 'h:123456', ...o });
const E = (o = {}) => ({ id: 2, email: 'e@x.vn', display_name: 'E', role: 'editor', status: 'active', password_hash: 'h:123456', ...o });

test('thêm tài khoản: kiểm tra email trùng, mật khẩu; chỉ quản lý được tạo quản lý', async () => {
  const { svc, User } = userService([M(), E()]);
  await assert.rejects(() => svc.create(mgr, { email: 'e@x.vn', displayName: 'X', password: '123456' }), /đã được đăng ký/);
  await assert.rejects(() => svc.create(mgr, { email: 'a@x.vn', displayName: 'X', password: '123' }), /ít nhất 6/);
  await assert.rejects(() => svc.create(mgr, { email: 'sai', displayName: 'X', password: '123456' }), /Email không hợp lệ/);
  const m2 = await svc.create(mgr, { email: 'm2@x.vn', displayName: 'M2', password: '123456', role: 'manager' });
  assert.equal(m2.role, 'manager');
  const viaEditor = await svc.create(ed(['accs']), { email: 'z@x.vn', displayName: 'Z', password: '123456', role: 'manager' });
  assert.equal(viaEditor.role, 'editor', 'người không phải quản lý không tạo được quản lý');
  assert.equal(User.rows.length, 4);
});

test('sửa/xóa tài khoản: bảo vệ quản lý cuối cùng, không tự xóa/khóa, không xóa người còn bài', async () => {
  const { svc, User } = userService([M(), E(), E({ id: 5, email: 'b@x.vn' })], [{ id: 1, author_id: 5 }]);
  await assert.rejects(() => svc.update(mgr, 1, { email: 'm@x.vn', displayName: 'M', status: 'locked' }), /ít nhất một tài khoản quản lý/);
  await assert.rejects(() => svc.update(mgr, 1, { email: 'm@x.vn', displayName: 'M', role: 'editor' }), /ít nhất một tài khoản quản lý/);
  await assert.rejects(() => svc.remove(mgr, 1), /chính mình/);
  await assert.rejects(() => svc.remove(mgr, 5), /còn 1 bài viết/);
  await assert.rejects(() => svc.update(ed(['accs']), 1, { email: 'm@x.vn', displayName: 'M' }), /tài khoản quản lý/);
  await assert.rejects(() => svc.update(mgr, 2, { email: 'm@x.vn', displayName: 'E' }), /đã được dùng/);
  await svc.update(mgr, 2, { email: 'e@x.vn', displayName: 'E mới', status: 'locked', password: 'matkhau1' });
  const e = User.rows.find((r) => r.id === 2);
  assert.equal(e.status, 'locked');
  assert.equal(e.auth_version, 2, 'đổi trạng thái/mật khẩu làm mất hiệu lực phiên cũ');
  assert.equal(e.password_hash, 'h:matkhau1');
  await svc.remove(mgr, 2);
  assert.equal(User.rows.find((r) => r.id === 2), undefined);
});

// ---- Thống kê ----
test('chuỗi thống kê: đủ mốc, mốc trống bằng 0, gộp theo tuần (thứ 2) và tháng', () => {
  const rows = [{ day: '2026-11-14', views: 5 }, { day: '2026-11-09', views: 3 }, { day: '2026-11-08', views: 2 }, { day: '2026-10-30', views: 7 }];
  const d = buildSeries(rows, 'day', '2026-11-14');
  assert.equal(d.buckets.length, 14); assert.equal(d.buckets.at(-1).value, 5); assert.equal(d.buckets[0].start, '2026-11-01');
  const w = buildSeries(rows, 'week', '2026-11-14');
  assert.equal(w.buckets.length, 12); assert.equal(w.buckets.at(-1).start, '2026-11-09'); assert.equal(w.buckets.at(-1).value, 8);
  assert.equal(w.buckets.at(-2).value, 2 + 0);
  const m = buildSeries(rows, 'month', '2026-11-14');
  assert.deepEqual(m.buckets.map((b) => b.label), ['08/2026', '09/2026', '10/2026', '11/2026']);
  assert.equal(m.buckets.at(-1).value, 10); assert.equal(m.buckets.at(-2).value, 7);
});

// ---- Ảnh minh họa ----
test('ảnh minh họa SVG: hợp lệ, ổn định theo bài, mỗi chuyên mục một màu', () => {
  const { cover } = require('../backend/utils/cover');
  const a = { id: 1, category: { slug: 'cong-nghe', name: 'Công nghệ' } };
  const svg = cover(a);
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 360"/);
  assert.match(svg, /<\/svg>$/);
  assert.equal(svg, cover(a), 'cùng bài thì ra cùng hình');
  assert.notEqual(svg, cover({ ...a, id: 2 }));
  assert.notEqual(cover(a), cover({ id: 1, category: { slug: 'the-thao', name: 'Thể thao' } }));
  assert.match(cover({ id: 3, category: { slug: 'la', name: '<x>"' } }), /aria-label="Ảnh minh họa chuyên mục x"/);
  assert.match(cover({ id: 4 }), /<svg/, 'thiếu chuyên mục vẫn vẽ được');
});
