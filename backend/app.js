const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const helmet = require('helmet');
const methodOverride = require('method-override');
const env = require('./config/env');
const { attachCurrentUser } = require('./middlewares/auth');
const csrfProtection = require('./middlewares/csrf');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const ui = require('./utils/ui');
const { PERMISSIONS } = require('./utils/permissions');

const app = express();
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({
  host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.pass, database: env.db.name,
  createDatabaseTable: true,
  schema: { tableName: 'app_sessions', columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' } }
});

app.locals.sessionStore = sessionStore;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'frontend', 'views'));
app.disable('x-powered-by');
if (env.nodeEnv === 'production') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public'), { maxAge: env.nodeEnv === 'production' ? '1d' : 0 }));
app.use(session({
  name: env.sessionCookieName,
  secret: env.sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: null }
}));
app.use(attachCurrentUser);
app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.year = new Date().getFullYear();
  res.locals.ui = ui;
  res.locals.PERMISSIONS = PERMISSIONS;
  next();
});
app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
