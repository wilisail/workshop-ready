import { defineConfig } from '@playwright/test';

const external = process.env.E2E_BASE_URL;
export const launchOptions = {
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  args: process.env.PLAYWRIGHT_CHROMIUM_ARGS ? JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage'],
};
export default defineConfig({
  testDir: './tests/offline',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: external || 'http://127.0.0.1:4174',
    browserName: 'chromium',
    serviceWorkers: 'allow',
    launchOptions,
    trace: 'off',
  },
  ...(!external ? { webServer: {
    command: 'node_modules/.bin/vite preview --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 30000,
  } } : {}),
});
