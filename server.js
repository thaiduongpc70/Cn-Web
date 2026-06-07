require('dotenv').config();
const path = require('path');

const PORT = process.env.PORT || 3000;

async function createViteConfig() {
  const react = (await import('@vitejs/plugin-react')).default;

  return {
    root: path.join(__dirname, 'client'),
    base: '/react/',
    plugins: [react()],
    build: {
      outDir: path.join(__dirname, 'src/public/react'),
      emptyOutDir: true
    },
    server: {
      port: 5173,
      proxy: {
        '/api': `http://localhost:${PORT}`
      }
    }
  };
}

async function buildClient() {
  const { build } = await import('vite');
  await build(await createViteConfig());
}

async function startClientDev() {
  const { createServer } = await import('vite');
  const devServer = await createServer(await createViteConfig());
  await devServer.listen();
  devServer.printUrls();
}

async function startServer() {
  const app = require('./app');
  const { runMigrations } = require('./src/config/migrate');

  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

const command = process.argv[2];
const task = command === 'build-client'
  ? buildClient
  : command === 'client-dev'
    ? startClientDev
    : startServer;

task()
  .catch((error) => {
    if (command === 'build-client') {
      console.error('Cannot build client:', error);
    } else if (command === 'client-dev') {
      console.error('Cannot start Vite dev server:', error);
    } else {
      console.error('Cannot start server because migrations failed:', error);
    }
    process.exit(1);
  });
