// Toàn bộ thống kê tính theo múi giờ Việt Nam (UTC+7), làm việc với chuỗi YYYY-MM-DD.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function toDateOnlyVN(date = new Date()) {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}
function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function mondayOf(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Thứ 2 = 0
  return addDays(ymd, -dow);
}
function dmy(ymd) { const [y, m, d] = ymd.split('-'); return `${d}/${m}`; }

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(new Date(value).getTime() + VN_OFFSET_MS);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
// Giá trị cho <input type="datetime-local"> theo giờ VN
function toInputValue(value) {
  if (!value) return '';
  return new Date(new Date(value).getTime() + VN_OFFSET_MS).toISOString().slice(0, 16);
}
// "2026-10-22T07:30" (giờ VN) -> Date
function fromInputValue(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) return null;
  const d = new Date(`${str}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = { toDateOnlyVN, addDays, mondayOf, dmy, formatDateTime, toInputValue, fromInputValue };
