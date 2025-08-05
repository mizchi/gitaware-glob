import { dts } from "rolldown-plugin-dts";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    core: "./src/core/index.ts",
  },
  plugins: [dts()],
  output: [{ dir: "dist", format: "es" }],
});
