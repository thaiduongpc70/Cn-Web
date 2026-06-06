const session = require('express-session');

module.exports = session({
  name: 'bantrasua.sid',
  secret: process.env.SESSION_SECRET || 'bantrasua_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});
