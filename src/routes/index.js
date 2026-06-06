const path = require('path');
const express = require('express');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin');
const clientRoutes = require('./client');

module.exports = function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/client', clientRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, app: 'BANTSUA API' });
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(__dirname, '..', 'public', 'react', 'index.html'));
  });
};
