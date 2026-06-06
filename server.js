require('dotenv').config();
const app = require('./app');
const { runMigrations } = require('./src/config/migrate');
const PORT = process.env.PORT || 3000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Cannot start server because migrations failed:', error);
    process.exit(1);
  });
