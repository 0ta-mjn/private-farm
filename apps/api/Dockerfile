# Node.js 20の軽量なAlpineイメージを使用
FROM node:22-alpine AS base

# pnpmをインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# 作業ディレクトリを設定
WORKDIR /app

# プロジェクト全体のpackage.jsonとpnpm関連ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# 必要なpackage.jsonファイルをコピー
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# 依存関係をインストール（devDependenciesも含む）
RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# APIサーバーをビルド
RUN pnpm build:api

# 本番用の軽量イメージを作成
FROM node:22-alpine AS production

# pnpmをインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# 作業ディレクトリを設定
WORKDIR /app

# プロジェクト全体のpackage.jsonとpnpm関連ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 必要なpackage.jsonファイルをコピー
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

# 本番環境の依存関係のみをインストール
RUN pnpm install --frozen-lockfile --prod

# ビルド済みファイルをコピー
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/packages ./packages

# APIディレクトリに移動
WORKDIR /app/apps/api

# ポート8080を開放（Cloud Runのデフォルトポート）
EXPOSE 8080

# 環境変数でポートを設定
ENV API_PORT=8080
ENV NODE_ENV=production

# サーバーを起動
CMD ["node", "dist/server.cjs"]
