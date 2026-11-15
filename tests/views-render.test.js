'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./helpers/miniEjs');
const { can } = require('../backend/utils/permissions');
const ui = require('../backend/utils/ui');
const { PERMISSIONS, GRANTABLE } = require('../backend/utils/permissions');
const { buildSeries, RANGES } = require('../backend/utils/statsSeries');

const manager = { id: 1, role: 'manager', display_name: 'Quản lý', permissions: [] };
const editor = { id: 2, role: 'editor', display_name: 'Biên tập', permissions: ['review', 'publish', 'cats', 'comments', 'stats', 'accs'] };
const base = (user, extra = {}) => ({
  title: 'Thử', ui, flash: null, csrfToken: 'tok', year: 2026, path: '/quan-tri', PERMISSIONS,
  currentUser: user, can: (p) => can(user, p), ...extra
});
const date = new Date('2026-11-01T03:00:00Z');
const cat = { id: 1, name: 'Thời sự', slug: 'thoi-su' };
const author = { id: 2, display_name: 'Lan' };
const article = (status = 'published') => ({ id: 5, title: 'Tiêu đề <b>', summary: 'Tóm tắt', content: 'Đoạn 1\n\nĐoạn 2', status, category: cat, category_id: 1, author, author_id: 2, views: 1200, published_at: date, updated_at: date, publish_at: date, reviewed_at: date, reviewer: manager, reject_reason: 'Thiếu nguồn' });

test('trang công khai render được và escape HTML', () => {
  const html = render('home', base(null, { articles: [article(), article()], categories: [cat], topRead: [{ id: 5, title: 'Bài hot', views: 99 }], activeSlug: null, q: '' }));
  assert.match(html, /Đọc nhiều/);
  assert.match(html, /Bài hot/);
  assert.match(html, /class="catbar"/);
  assert.match(html, /class="ticker"/);
  assert.doesNotMatch(html, /Danh mục/);
  assert.match(html, /class="card reveal"/);
  assert.match(html, /Đăng nhập/);
  assert.match(html, /Tiêu đề &lt;b&gt;/);
  assert.match(html, /<svg class="cover"/);
  assert.doesNotMatch(html, /Tiêu đề <b>/);
  assert.match(render('home', base(manager, { articles: [], categories: [], activeSlug: null, q: 'abc' })), /Khu quản trị/);
  const art = render('article', base(null, { article: article(), comments: [{ author_name: 'A', content: 'Hay', created_at: date }], categories: [cat], topRead: [], activeSlug: 'thoi-su', preview: false }));
  assert.match(art, /Bình luận \(1\)/);
  assert.match(render('article', base(manager, { article: article('draft'), comments: [], categories: [], topRead: [], preview: true })), /Bản xem trước/);
});

test('đăng nhập / đăng ký / lỗi render được', () => {
  for (const mode of ['login', 'register']) assert.ok(render('auth/index', base(null, { mode, error: 'Lỗi', form: {} })).includes('form'));
  for (const n of ['403', '404', '500']) assert.ok(render(`errors/${n}`, base(null, { error: null })).includes(n));
});

test('menu quản trị phản ánh quyền: quản lý không có nút viết bài', () => {
  const m = render('admin/dashboard', base(manager, { cards: [{ label: 'x', value: 3, href: '/' }] }));
  assert.doesNotMatch(m, /Viết bài mới/);
  assert.match(m, /Phân quyền/);
  const e = render('admin/dashboard', base({ ...editor, permissions: [] }, { cards: [] }));
  assert.match(e, /Viết bài mới/);
  assert.doesNotMatch(e, /Phân quyền/);
  assert.doesNotMatch(e, /Tài khoản/);
});

test('danh sách và chi tiết bài hiển thị đúng thao tác theo trạng thái', () => {
  const actions = { edit: false, submit: false, remove: false, review: true, publish: false, unpublish: false };
  const list = render('admin/articles', base(editor, { view: 'pending', views: { pending: 'Chờ duyệt' }, rows: [{ a: article('pending'), actions }] }));
  assert.match(list, /Chờ duyệt/);
  assert.match(render('admin/article-show', base(editor, { a: article('pending'), actions })), /Từ chối/);
  const rej = render('admin/article-show', base(editor, { a: article('rejected'), actions: { ...actions, review: false, edit: true, submit: true } }));
  assert.match(rej, /Lý do: Thiếu nguồn/);
  assert.match(rej, /Gửi duyệt/);
  const sch = render('admin/article-show', base(editor, { a: article('scheduled'), actions: { ...actions, review: false, unpublish: true } }));
  assert.match(sch, /Hủy lịch/);
  assert.match(render('admin/article-form', base(editor, { article: null, categories: [cat] })), /Lưu bản nháp/);
  assert.match(render('admin/article-form', base(editor, { article: article('draft'), categories: [cat] })), /selected/);
});

test('chuyên mục, bình luận, tài khoản, phân quyền, thống kê render được', () => {
  assert.match(render('admin/categories', base(manager, { categories: [{ id: 1, name: 'Thời sự', slug: 'thoi-su', articleCount: 2 }] })), /Thời sự/);
  const c = { id: 9, author_name: 'Bảo', content: 'Chào', status: 'pending', created_at: date, article: { id: 5, title: 'T' } };
  assert.match(render('admin/comments', base(manager, { filter: 'pending', comments: [c] })), /Duyệt/);
  const u = { id: 3, display_name: 'Nam', email: 'n@x.vn', role: 'editor', status: 'active', last_login_at: null };
  assert.match(render('admin/users', base(editor, { users: [u, { ...u, id: 4, role: 'manager' }] })), /n@x\.vn/);
  assert.match(render('admin/user-form', base(manager, { target: null })), /Vai trò/);
  assert.doesNotMatch(render('admin/user-form', base(editor, { target: null })), /Vai trò/);
  assert.match(render('admin/user-form', base(manager, { target: u })), /Trạng thái/);
  const perm = render('admin/permissions', base(manager, { grantable: GRANTABLE, granted: ['review'] }));
  assert.match(perm, /checked/);
  const series = buildSeries([{ day: '2026-11-01', views: 50 }], 'day', '2026-11-14');
  const html = render('admin/stats', base(manager, { range: 'day', ranges: RANGES, articleRange: 'all', series, max: 50, perArticle: [{ id: 5, title: 'T', rangeViews: 10 }], top: [{ id: 5, title: 'T', rangeViews: 10 }] }));
  assert.match(html, /<svg/);
  assert.equal((html.match(/<rect/g) || []).length, 14);
});
