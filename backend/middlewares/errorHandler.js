function notFound(req, res) { res.status(404).render('errors/404', { title: 'Không tìm thấy trang' }); }

function normalizeError(err) {
  if (err.name === 'SequelizeValidationError') return { status: 422, message: 'Một số dữ liệu chưa đúng định dạng. Vui lòng kiểm tra lại.' };
  if (err.name === 'SequelizeUniqueConstraintError') return { status: 409, message: 'Thông tin này đã tồn tại trong hệ thống.' };
  if (err.name === 'SequelizeForeignKeyConstraintError') return { status: 409, message: 'Không thể thực hiện vì dữ liệu đang được sử dụng ở phần khác.' };
  if (err.name === 'SequelizeDatabaseError') {
    const code = err.parent?.code || err.original?.code;
    if (['ER_TRUNCATED_WRONG_VALUE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', 'ER_DATA_TOO_LONG', 'WARN_DATA_TRUNCATED'].includes(code)) return { status: 422, message: 'Dữ liệu nhập vào chưa đúng định dạng.' };
    return { status: 500, message: 'Hệ thống chưa thể xử lý yêu cầu này. Vui lòng thử lại.' };
  }
  const status = err.statusCode || 500;
  return { status, message: err.isOperational ? err.message : (status >= 500 ? 'Hệ thống chưa thể xử lý yêu cầu này.' : err.message) };
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (process.env.NODE_ENV !== 'production') console.error(err);
  const { status, message } = normalizeError(err);

  // Lỗi nghiệp vụ khi gửi form: quay lại trang trước kèm thông báo.
  if (req.method !== 'GET' && status < 500 && status !== 403 && req.session) {
    let back = '/';
    const referer = req.get('referer');
    if (referer) {
      try {
        const origin = `${req.protocol}://${req.get('host')}`;
        const url = new URL(referer, origin);
        if (url.origin === origin && url.pathname.startsWith('/') && !url.pathname.startsWith('//')) back = url.pathname + url.search;
      } catch (_) { /* dùng đường dẫn mặc định */ }
    }
    req.session.flash = { type: 'warning', message };
    return req.session.save((saveError) => (saveError ? next(saveError) : res.redirect(303, back)));
  }
  return res.status(status).render(status === 403 ? 'errors/403' : status === 404 ? 'errors/404' : 'errors/500', {
    title: message, error: process.env.NODE_ENV === 'development' && status >= 500 ? err : null
  });
}

module.exports = { notFound, errorHandler };
