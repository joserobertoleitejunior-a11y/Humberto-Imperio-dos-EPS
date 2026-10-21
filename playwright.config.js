// E2E do fluxo de conversão. Usa o Chromium do sistema quando disponível.
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://localhost:8765",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: { command: "python3 -m http.server 8765", port: 8765, reuseExistingServer: true },
});
