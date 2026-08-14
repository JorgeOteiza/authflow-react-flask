const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3100", trace: "on-first-retry" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-12-pro", use: { ...devices["iPhone 12 Pro"], browserName: "chromium" } },
    { name: "galaxy-s9", use: { ...devices["Galaxy S9+"] } },
  ],
  webServer: [
    {
      command: "pipenv run python tests/e2e_server.py",
      url: "http://localhost:3101/api/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run build && python -m http.server 3100 --directory dist",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      env: { REACT_APP_BACKEND_URL: "http://localhost:3101" },
    },
  ],
});
