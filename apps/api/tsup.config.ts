import { defineConfig } from "tsup";
import { TsconfigPathsPlugin } from "@esbuild-plugins/tsconfig-paths";

export default defineConfig({
  entry: ["src/server.ts"], // Fastify のエントリポイント
  platform: "node", // Node.js 向け
  target: "node20", // Node v20+
  format: ["cjs"], // CommonJS 出力
  bundle: true, // すべてバンドル
  sourcemap: true, // ソースマップ生成
  clean: true, // dist/ をクリーン
  dts: false, // 型定義ファイル(.d.ts)生成
  esbuildPlugins: [
    TsconfigPathsPlugin({}), // tsconfig の paths を解決
  ],
});
