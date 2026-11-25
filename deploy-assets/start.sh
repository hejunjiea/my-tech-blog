#!/bin/sh
# 非 Docker 启动方式：先复制 .env.example 为 .env 并填好 ADMIN_TOKEN
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE"

if [ -f .env ]; then
  # 读取 .env（忽略注释与空行）
  while IFS='=' read -r k v; do
    case "$k" in
      ''|\#*) continue ;;
    esac
    [ -n "$v" ] && export "$k=$v"
  done < .env
fi

: "${ADMIN_TOKEN:?请先在 .env 或环境变量里设置 ADMIN_TOKEN}"
PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
DATA_DIR="${DATA_DIR:-$HERE/data}"

mkdir -p "$DATA_DIR"
echo "启动：http://$HOST:$PORT   数据目录：$DATA_DIR"
exec env PORT="$PORT" HOST="$HOST" DATA_DIR="$DATA_DIR" ADMIN_TOKEN="$ADMIN_TOKEN" node app/server.js
