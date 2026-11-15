const { STATUS_LABEL } = require('./articlePolicy');
const { formatDateTime, toInputValue } = require('./dateTime');
const { cover } = require('./cover');

const commentStatus = { pending: 'Chờ duyệt', approved: 'Đã hiển thị' };
const roleLabel = { manager: 'Quản lý', editor: 'Biên tập viên' };

module.exports = {
  cover,
  articleStatus: (v) => STATUS_LABEL[v] || v || '—',
  commentStatus: (v) => commentStatus[v] || v || '—',
  role: (v) => roleLabel[v] || v || '—',
  userStatus: (v) => (v === 'locked' ? 'Đã khóa' : 'Hoạt động'),
  dateTime: formatDateTime,
  inputValue: toInputValue,
  number: (n) => Number(n || 0).toLocaleString('vi-VN'),
  paragraphs: (text) => String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
};
