const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  esbuild: {
    loader: "jsx",
    include: /.*\.[jt]sx?$/,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/frontend/setup.js"],
    include: ["tests/frontend/**/*.test.{js,jsx}"],
  },
});
