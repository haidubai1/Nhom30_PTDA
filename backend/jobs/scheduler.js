const cron = require('node-cron');
const ArticleService = require('../services/ArticleService');

// Mỗi phút chuyển các bài đến giờ hẹn sang "đã xuất bản".
module.exports = function startScheduler() {
  const run = () => ArticleService.publishDue().catch((e) => console.error('Scheduler error:', e.message));
  run();
  return cron.schedule('* * * * *', run);
};
