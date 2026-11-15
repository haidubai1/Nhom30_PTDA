// Ảnh minh họa tự vẽ (SVG) cho từng bài: màu theo chuyên mục, hình trang trí khác nhau theo id bài.
// Không cần tải ảnh lên, không gọi máy chủ ngoài nên hợp với chính sách CSP của site.
const ICONS = {
  'thoi-su': '<path d="M-26 18V-6l26-18 26 18V18zM-8 18V2h16v16zM-18-2h8v8h-8zM10-2h8v8h-8z"/>',
  'kinh-te': '<path d="M-28 22v-14h12v14zM-6 22V-4h12v26zM16 22V-20h12v42z"/>',
  'cong-nghe': '<path d="M-16-16h32v32h-32zM-8-8v16h16v-16zM-24-8h8v4h-8zM-24 4h8v4h-8zM16-8h8v4h-8zM16 4h8v4h-8zM-8-24h4v8h-4zM4-24h4v8h-4zM-8 16h4v8h-4zM4 16h4v8h-4z"/>',
  'giao-duc': '<path d="M0-18c-8-6-18-6-28-2v34c10-4 20-4 28 2 8-6 18-6 28-2v-34c-10-4-20-4-28 2zM-2-12v28M2-12v28" fill-rule="evenodd"/>',
  'the-thao': '<circle r="24"/><path d="M-24 0h48M0-24v48" stroke="#0003" stroke-width="3" fill="none"/>',
  'doi-song': '<path d="M0 22C-30-2-24-26-8-24c6 1 8 6 8 6s2-5 8-6c16-2 22 22-8 46z"/>'
};
const DEFAULT_ICON = '<path d="M-24 18l24-40 24 40z"/>';

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rng = (seed) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

// article: { id, category: { slug, name } }
function cover(article, { w = 640, h = 360 } = {}) {
  const slug = article.category?.slug || 'khac';
  const hue = hash(slug) % 360;
  const r = rng(hash(`${article.id}:${slug}`));
  const gid = `cv${article.id}`;
  let shapes = '';
  for (let i = 0; i < 5; i++) {
    const x = Math.round(r() * w), y = Math.round(r() * h), s = Math.round(50 + r() * 130);
    shapes += i % 2
      ? `<circle cx="${x}" cy="${y}" r="${s}" fill="#fff" opacity="${(0.05 + r() * 0.1).toFixed(2)}"/>`
      : `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="${Math.round(s / 5)}" transform="rotate(${Math.round(r() * 60)} ${x} ${y})" fill="#fff" opacity="${(0.05 + r() * 0.1).toFixed(2)}"/>`;
  }
  // Lưới bản vẽ kỹ thuật mờ: gợi chất "công nghiệp" của trường
  let grid = `<g stroke="#fff" stroke-opacity=".09" stroke-width="1">`;
  for (let x = 0; x <= w; x += 40) grid += `<path d="M${x} 0V${h}"/>`;
  for (let y = 0; y <= h; y += 40) grid += `<path d="M0 ${y}H${w}"/>`;
  grid += '</g>';
  const icon = ICONS[slug] || DEFAULT_ICON;
  const label = String(article.category?.name || '').replace(/[&<>"']/g, '');
  return `<svg class="cover" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ảnh minh họa chuyên mục ${label}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 52% 34%)"/><stop offset="1" stop-color="hsl(${(hue + 30) % 360} 58% 17%)"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${gid})"/>${grid}${shapes}` +
    `<g transform="translate(${w / 2} ${h / 2}) scale(2.6)" fill="#fff" opacity=".92">${icon}</g></svg>`;
}

module.exports = { cover };
