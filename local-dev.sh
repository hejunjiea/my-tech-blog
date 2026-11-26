#!/bin/sh
# 开发监听：改动 common-site/ 或 content/ 后自动重建到 local-site/public
# 用法：sh local-dev.sh
# 另开一个终端启动服务：
#   cd local-site && PORT=8000 HOST=127.0.0.1 DATA_DIR=../data ADMIN_TOKEN=你的口令 node server.js
set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
OUT="$ROOT/local-site"

if stat -f '%m' / >/dev/null 2>&1; then
  STAT_ARGS='-f'
  STAT_FORMAT='%m:%z:%N'
else
  STAT_ARGS='-c'
  STAT_FORMAT='%Y:%s:%n'
fi

signature() {
  find "$ROOT/common-site" "$ROOT/content" -type f -exec stat "$STAT_ARGS" "$STAT_FORMAT" {} + 2>/dev/null | sort | cksum
}

build() {
  node "$ROOT/common-build.mjs" "$OUT/public" >/dev/null
  cp "$OUT/public/seed.json" "$OUT/seed.json"
  cp "$ROOT/common-server/server.js" "$ROOT/common-server/run.sh" "$ROOT/common-server/package.json" "$OUT/"
  chmod 755 "$OUT/run.sh"
}

mkdir -p "$OUT"
build
echo "初始构建完成：$OUT/public"
echo "监听 common-site/ 与 content/ 的改动，保存后自动重建（Ctrl+C 退出）"
echo
echo "另开终端启动服务："
echo "  cd $OUT && PORT=8000 HOST=127.0.0.1 DATA_DIR=$ROOT/data ADMIN_TOKEN=你的口令 node server.js"
echo

LAST=$(signature)
while :; do
  sleep 1
  NOW=$(signature)
  if [ "$NOW" != "$LAST" ]; then
    LAST=$NOW
    if build; then
      echo "[$(date '+%H:%M:%S')] 已重建，刷新浏览器即可"
    else
      echo "[$(date '+%H:%M:%S')] 构建失败，请按上面的错误提示修正"
    fi
  fi
done
