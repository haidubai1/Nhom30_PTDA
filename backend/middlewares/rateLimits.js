const { rateLimit } = require('express-rate-limit');

const common = { standardHeaders: 'draft-8', legacyHeaders: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' };
const authLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 30 });
const commentLimiter = rateLimit({ ...common, windowMs: 10 * 60 * 1000, limit: 10 });

module.exports = { authLimiter, commentLimiter };
