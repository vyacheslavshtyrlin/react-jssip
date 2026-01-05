import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2020",
  platform: "browser",
  sourcemap: true,
  clean: true,
  treeshake: true,
  dts: true,
  external: ["react", "react-dom"],
});
  
