import { defineConfig } from "vitest/config";
import path from "path";

const projectRoot = path.resolve(__dirname, "..", "..");

export default defineConfig({
  root: projectRoot,
  test: {
    globals: true,
    setupFiles: ["qa-tests/mutation/setup.js"],
    include: [
      "qa-tests/whitebox/func.test.js",
      "qa-tests/whitebox/dom.test.js",
      "qa-tests/blackbox/functional.test.js",
      "qa-tests/mutation/kill.test.js",
    ],
  },
});
