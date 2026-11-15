const app = require('./app');
const env = require('./config/env');
const sequelize = require('./config/database');
const startScheduler = require('./jobs/scheduler');

async function start() {
  try {
    await sequelize.authenticate();
    app.listen(env.port, () => {
      console.log(`Tin Tức HaUI đang chạy tại ${env.appUrl}`);
      startScheduler();
    });
  } catch (error) {
    console.error('Không thể khởi động Tin Tức HaUI:', error.message);
    process.exit(1);
  }
}

start();
