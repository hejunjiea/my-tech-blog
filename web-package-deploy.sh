#!/bin/sh
# 生成可上传的线上部署包：web-package/ 与 web-deploy.tar.gz
# 用法：sh web-package-deploy.sh
set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
OUT="$ROOT/web-package"

rm -rf "$OUT"
mkdir -p "$OUT/app"

node "$ROOT/common-build.mjs" "$OUT/app/public" > /dev/null
cp "$ROOT/common-server/server.js" "$ROOT/common-server/run.sh" "$ROOT/common-server/package.json" "$OUT/app/"
cp "$OUT/app/public/seed.json" "$OUT/app/seed.json"
chmod 755 "$OUT/app/run.sh"

cp "$ROOT/web-assets/Dockerfile" "$OUT/Dockerfile"
cp "$ROOT/web-assets/docker-compose.yml" "$OUT/docker-compose.yml"
cp "$ROOT/web-assets/nginx.conf.example" "$OUT/nginx.conf.example"
cp "$ROOT/web-assets/.env.example" "$OUT/.env.example"
cp "$ROOT/web-assets/start.sh" "$OUT/start.sh"
cp "$ROOT/web-assets/README.md" "$OUT/README.md"
cp "$ROOT/web-assets/服务器部署指南.md" "$OUT/服务器部署指南.md"
chmod 755 "$OUT/start.sh"

rm -f "$ROOT/web-deploy.tar.gz"
(cd "$ROOT" && tar -czf web-deploy.tar.gz web-package)

echo "线上部署包已生成："
echo "  目录：$OUT"
echo "  压缩包：$ROOT/web-deploy.tar.gz"
du -sh "$OUT" "$ROOT/web-deploy.tar.gz"
