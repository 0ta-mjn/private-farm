import { defineConfig } from "tsup";
import { TsconfigPathsPlugin } from "@esbuild-plugins/tsconfig-paths";

export default defineConfig({
  entry: ["src/**/*.ts"],
  outDir: "dist",
  platform: "node",
  target: "node22",
  format: ["esm"],
  sourcemap: true,
  clean: true,
  dts: false,
  splitting: false,
  esbuildPlugins: [TsconfigPathsPlugin({})],
  esbuildOptions(opts) {
    opts.entryNames = "[name]";
  },
});
