const { RolePermission } = require('../models');
const { GRANTABLE } = require('../utils/permissions');

async function editorPermissions() {
  const rows = await RolePermission.findAll({ where: { role: 'editor' } });
  return rows.map((r) => r.permission).filter((p) => GRANTABLE.includes(p));
}

// US0301: cập nhật ma trận quyền của vai trò biên tập viên.
async function setEditorPermissions(list) {
  const wanted = [...new Set([].concat(list || []))].filter((p) => GRANTABLE.includes(p));
  await RolePermission.destroy({ where: { role: 'editor' } });
  if (wanted.length) await RolePermission.bulkCreate(wanted.map((permission) => ({ role: 'editor', permission })));
  return wanted;
}

module.exports = { editorPermissions, setEditorPermissions };
