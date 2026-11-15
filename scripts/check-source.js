// Kiểm tra nhanh không cần database: cú pháp mọi file .js, và các template EJS có biên dịch được không (cần `npm install`).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.join(__dirname, '..');
let bad = 0;

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    f.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(root);
for (const f of files.filter((x) => x.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.error('✗ JS', path.relative(root, f), '\n', r.stderr); }
}
let ejs = null;
try { ejs = require('ejs'); } catch { console.warn('! Chưa cài ejs — bỏ qua kiểm tra template (chạy npm install).'); }
if (ejs) for (const f of files.filter((x) => x.endsWith('.ejs'))) {
  try { ejs.compile(fs.readFileSync(f, 'utf8'), { filename: f }); }
  catch (e) { bad++; console.error('✗ EJS', path.relative(root, f), '\n', e.message); }
}
console.log(bad ? `Có ${bad} lỗi.` : 'Kiểm tra nguồn: OK');
process.exit(bad ? 1 : 0);
