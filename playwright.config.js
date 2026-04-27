// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./qa-tests/blackbox",
  testMatch: "**/*.spec.js",
  timeout: 30000,
  use: {
    headless: true,
  },
});
