'use strict';
// Trình dựng EJS tối giản để test giao diện khi chưa cài được `ejs` (chỉ hỗ trợ <% %>, <%= %>, <%- %> và include).
const fs = require('node:fs');
const path = require('node:path');

const VIEWS = path.resolve(__dirname, '..', '..', 'frontend', 'views');
const escapeHtml = (v) => (v === null || v === undefined ? '' : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

function compile(src, file) {
  let code = "let __o='';\n"; let last = 0;
  const re = /<%([-=]?)([\s\S]*?)%>/g; let m;
  while ((m = re.exec(src))) {
    code += `__o+=${JSON.stringify(src.slice(last, m.index))};\n`;
    if (m[1] === '=') code += `__o+=esc(${m[2]});\n`;
    else if (m[1] === '-') code += `__o+=(${m[2]});\n`;
    else code += `${m[2]}\n`;
    last = re.lastIndex;
  }
  code += `__o+=${JSON.stringify(src.slice(last))};\nreturn __o;`;
  const fn = new Function('__l', 'include', 'esc', `with(__l){${code}}`); // eslint-disable-line no-new-func
  fn.file = file;
  return fn;
}

function render(name, locals = {}, fromDir = VIEWS) {
  const file = path.resolve(fromDir, name.endsWith('.ejs') ? name : `${name}.ejs`);
  const fn = compile(fs.readFileSync(file, 'utf8'), file);
  const include = (n, extra) => render(n, { ...locals, ...(extra || {}) }, path.dirname(file));
  return fn(locals, include, escapeHtml);
}

module.exports = { render, VIEWS };
