#!/bin/sh
# 生成可上传的部署包：deploy-package/ 与 blog-deploy.tar.gz
# 用法：sh package-deploy.sh
set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
OUT="$ROOT/deploy-package"

rm -rf "$OUT"
mkdir -p "$OUT/app"

node "$ROOT/build.mjs" "$OUT/app/public" > /dev/null
cp "$ROOT/server/server.js" "$ROOT/server/run.sh" "$ROOT/server/package.json" "$OUT/app/"
cp "$OUT/app/public/seed.json" "$OUT/app/seed.json"
chmod 755 "$OUT/app/run.sh"

cp "$ROOT/deploy-assets/Dockerfile" "$OUT/Dockerfile"
cp "$ROOT/deploy-assets/docker-compose.yml" "$OUT/docker-compose.yml"
cp "$ROOT/deploy-assets/nginx.conf.example" "$OUT/nginx.conf.example"
cp "$ROOT/deploy-assets/.env.example" "$OUT/.env.example"
cp "$ROOT/deploy-assets/start.sh" "$OUT/start.sh"
cp "$ROOT/deploy-assets/README.md" "$OUT/README.md"
cp "$ROOT/deploy-assets/服务器部署指南.md" "$OUT/服务器部署指南.md"
chmod 755 "$OUT/start.sh"

rm -f "$ROOT/blog-deploy.tar.gz"
(cd "$ROOT" && tar -czf blog-deploy.tar.gz deploy-package)

echo "部署包已生成："
echo "  目录：$OUT"
echo "  压缩包：$ROOT/blog-deploy.tar.gz"
du -sh "$OUT" "$ROOT/blog-deploy.tar.gz"
