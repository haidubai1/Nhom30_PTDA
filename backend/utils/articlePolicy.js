const { can } = require('./permissions');

const STATUS_LABEL = {
  draft: 'Bản nháp', pending: 'Chờ duyệt', rejected: 'Bị từ chối',
  approved: 'Đã duyệt', scheduled: 'Đã lên lịch', published: 'Đã xuất bản'
};
const own = (u, a) => Boolean(u && Number(a.author_id) === Number(u.id));

const canEdit = (u, a) => can(u, 'write') && own(u, a) && ['draft', 'rejected'].includes(a.status);
const canSubmit = canEdit;
const canDelete = canEdit;
// Người có quyền duyệt không được tự duyệt bài của chính mình.
const canReview = (u, a) => can(u, 'review') && a.status === 'pending' && !own(u, a);
const canPublish = (u, a) => can(u, 'publish') && a.status === 'approved';
const canUnpublish = (u, a) => can(u, 'publish') && ['published', 'scheduled'].includes(a.status);
const canPreview = (u, a) => Boolean(u) && (own(u, a) || can(u, 'review') || can(u, 'publish') || u.role === 'manager');

// Giờ hẹn phải ở tương lai.
function parseFutureDate(value, now = new Date()) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return null;
  return d.getTime() > now.getTime() ? d : null;
}

module.exports = { STATUS_LABEL, canEdit, canSubmit, canDelete, canReview, canPublish, canUnpublish, canPreview, parseFutureDate };
