#!/bin/sh
# 本地运行：构建站点 + 启动写作服务（数据落本机 data/ 目录，重启不丢）
# 用法：sh local.sh [端口] [口令] [监听地址]
set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
PORT="${1:-8000}"
TOKEN="${2:-${BLOG_ADMIN_TOKEN:-local-dev}}"
HOST="${3:-127.0.0.1}"
RUN="$ROOT/local-site"

rm -rf "$RUN"
node "$ROOT/common-build.mjs" "$RUN/public" > /dev/null
cp "$ROOT/common-server/server.js" "$ROOT/common-server/run.sh" "$ROOT/common-server/package.json" "$RUN/"
cp "$RUN/public/seed.json" "$RUN/seed.json"
mkdir -p "$ROOT/data"

echo "本地写作站已启动"
echo "  地址：http://localhost:$PORT"
echo "  写作口令：$TOKEN"
echo "  文章数据：$ROOT/data/posts.json"
echo "  按 Ctrl+C 停止"

cd "$RUN"
exec env PORT="$PORT" HOST="$HOST" DATA_DIR="$ROOT/data" ADMIN_TOKEN="$TOKEN" node server.js
