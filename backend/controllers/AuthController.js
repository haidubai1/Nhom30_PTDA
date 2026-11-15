const AuthService = require('../services/AuthService');
const env = require('../config/env');

function renderAuth(res, o = {}) {
  return res.render('auth/index', { title: o.mode === 'register' ? 'Đăng ký biên tập viên' : 'Đăng nhập', mode: o.mode || 'login', error: o.error || null, form: o.form || {} });
}

function establishSession(req, user, remember, next, done) {
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.userId = user.id;
    req.session.authVersion = user.auth_version || 1;
    if (remember) req.session.cookie.maxAge = env.rememberMeDays * 24 * 60 * 60 * 1000;
    else { req.session.cookie.maxAge = null; req.session.cookie.expires = null; }
    done();
  });
}

function finish(req, res, next, user, message) {
  const returnTo = req.session.returnTo;
  req.session.flash = { type: 'success', message };
  const safe = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/quan-tri';
  delete req.session.returnTo;
  req.session.save((e) => (e ? next(e) : res.redirect(safe)));
}

exports.showAuth = (req, res) => {
  if (req.user) return res.redirect('/quan-tri');
  renderAuth(res, { mode: req.query.mode === 'register' ? 'register' : 'login' });
};

exports.login = async (req, res, next) => {
  const b = req.body || {};
  try {
    const returnTo = req.session.returnTo;
    const user = await AuthService.authenticate(b.email, b.password);
    establishSession(req, user, b.rememberMe === 'on', next, () => {
      if (returnTo) req.session.returnTo = returnTo;
      finish(req, res, next, user, `Chào mừng ${user.display_name} quay lại.`);
    });
  } catch (error) {
    if (error.isOperational) return renderAuth(res.status(error.statusCode), { mode: 'login', error: error.message, form: { email: b.email } });
    next(error);
  }
};

exports.register = async (req, res, next) => {
  const b = req.body || {};
  try {
    const user = await AuthService.registerEditor(b);
    establishSession(req, user, false, next, () => finish(req, res, next, user, 'Đăng ký thành công. Chào mừng bạn đến với Tin Tức HaUI!'));
  } catch (error) {
    if (error.isOperational) return renderAuth(res.status(error.statusCode), { mode: 'register', error: error.message, form: { displayName: b.displayName, email: b.email } });
    next(error);
  }
};

exports.logout = (req, res, next) => {
  req.session.destroy((e) => {
    if (e) return next(e);
    res.clearCookie(env.sessionCookieName);
    res.redirect('/');
  });
};
