// Quyền thao tác trong khu quản trị. "write" (viết bài) chỉ dành cho biên tập viên.
const PERMISSIONS = {
  write: 'Viết bài',
  review: 'Duyệt / từ chối bài',
  publish: 'Xuất bản / lên lịch',
  cats: 'Quản lý chuyên mục',
  comments: 'Duyệt bình luận',
  stats: 'Xem thống kê',
  accs: 'Quản lý tài khoản'
};
// Những quyền quản lý có thể cấp cho biên tập viên (write luôn có).
const GRANTABLE = ['review', 'publish', 'cats', 'comments', 'stats', 'accs'];

// user: { role, permissions: string[] }
function can(user, perm) {
  if (!user) return false;
  if (user.role === 'manager') return perm !== 'write';
  if (perm === 'write') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

module.exports = { PERMISSIONS, GRANTABLE, can };
