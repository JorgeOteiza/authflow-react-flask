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
      command: "python -m flask --app src/app.py db upgrade && python -m flask --app src/app.py run --port 3101",
      url: "http://localhost:3101/api/health",
      reuseExistingServer: false,
      env: {
        DATABASE_URL: "sqlite:///authflow-e2e.db",
        SECRET_KEY: "e2e-application-secret-with-at-least-32-bytes",
        JWT_SECRET_KEY: "e2e-jwt-secret-with-at-least-32-bytes-long",
        FLASK_ENV: "testing",
        REQUIRE_EMAIL_VERIFICATION: "false",
        PASSWORD_BREACH_CHECK: "false",
        CORS_ORIGIN: "http://localhost:3100",
      },
    },
    {
      command: "npm run dev -- --port 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      env: { REACT_APP_BACKEND_URL: "http://localhost:3101" },
    },
  ],
});
