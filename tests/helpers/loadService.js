'use strict';
// Nạp file service với các module phụ thuộc được thay bằng bản giả (không cần sequelize/mysql).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadWithMocks(file, mocks) {
  const full = path.resolve(__dirname, '..', '..', file);
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, console, Date, Promise, Number, String, Array, Set, Map, Object, Math, Boolean, JSON, Error,
    require: (name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('.')) return require(path.resolve(path.dirname(full), name)); // util thật
      throw new Error(`Chưa mock module: ${name}`);
    }
  };
  vm.runInNewContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: full });
  return module.exports;
}

// Model giả lưu trong bộ nhớ: đủ cho where bằng, Op.in và include bị bỏ qua.
function fakeModel(initial = [], defaults = {}) {
  let nextId = initial.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
  const rows = [];
  const wrap = (data) => {
    const inst = { ...data };
    inst.save = async () => { const i = rows.findIndex((r) => r.id === inst.id); const copy = { ...inst }; delete copy.save; delete copy.destroy; if (i >= 0) rows[i] = copy; };
    inst.destroy = async () => { const i = rows.findIndex((r) => r.id === inst.id); if (i >= 0) rows.splice(i, 1); };
    return inst;
  };
  const match = (r, where = {}) => Object.entries(where).every(([k, v]) => {
    if (typeof k !== 'string') return true;
    if (v && typeof v === 'object' && v.__in) return v.__in.includes(r[k]);
    return r[k] === v;
  });
  initial.forEach((r) => rows.push({ ...defaults, ...r }));
  return {
    rows,
    findByPk: async (id) => { const r = rows.find((x) => Number(x.id) === Number(id)); return r ? wrap(r) : null; },
    findOne: async ({ where } = {}) => { const r = rows.find((x) => match(x, where)); return r ? wrap(r) : null; },
    findAll: async ({ where } = {}) => rows.filter((x) => match(x, where)).map(wrap),
    count: async ({ where } = {}) => rows.filter((x) => match(x, where)).length,
    create: async (d) => { const r = { ...defaults, ...d, id: d.id || nextId++ }; rows.push(r); return wrap(r); },
    destroy: async ({ where } = {}) => { let n = 0; for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], where)) { rows.splice(i, 1); n++; } return n; }
  };
}

module.exports = { loadWithMocks, fakeModel };
