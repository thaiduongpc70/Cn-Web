const path = require('path');
const express = require('express');
const session = require('./src/config/session');
const registerRoutes = require('./src/routes');
const { attachUser } = require('./src/middlewares/auth.middleware');
const notFoundMiddleware = require('./src/middlewares/notFound.middleware');
const errorMiddleware = require('./src/middlewares/error.middleware');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session);
app.use(attachUser);
app.use(express.static(path.join(__dirname, 'src/public')));

registerRoutes(app);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
