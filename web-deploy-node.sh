#!/bin/sh
# 一键构建 + 部署（Node.js 20 动态站点，支持在线写作）
# 用法：sh web-deploy-node.sh
set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
SITE_ID="37lnq3mgkji5x4uzdky"
CLI="/Users/tanyou/.trae-cn/plugins/trae-remote-official/deployment/0.0.43/skills/deployment/scripts/trae-deploy"
TMP_ROOT="${TMPDIR:-/tmp}"

PKG=$(mktemp -d "${TMP_ROOT%/}/blog-fn.XXXXXX")
CONFIG=$(mktemp "${TMP_ROOT%/}/blog-fn-cfg.XXXXXX")
mkdir -p "$PKG"

node "$ROOT/common-build.mjs" "$PKG/public"
cp "$ROOT/common-server/server.js" "$ROOT/common-server/run.sh" "$ROOT/common-server/package.json" "$PKG/"
chmod 755 "$PKG/run.sh"

cat > "$PKG/build.sh" <<'BUILD'
#!/bin/sh
set -eu
mkdir -p dist
cp -R public dist/public
cp public/seed.json dist/seed.json
cp server.js run.sh package.json dist/
chmod 755 dist/run.sh
BUILD
chmod 755 "$PKG/build.sh"

ADMIN_TOKEN="${BLOG_ADMIN_TOKEN:-}"
if [ -z "$ADMIN_TOKEN" ]; then
  echo "请先设置环境变量 BLOG_ADMIN_TOKEN（写作口令），例如：BLOG_ADMIN_TOKEN=yourpass sh web-deploy-node.sh" >&2
  exit 1
fi

cat > "$CONFIG" <<JSON
{
  "schema_version": 1,
  "build": {
    "runtime_key": "nodejs20",
    "build_script": "build.sh",
    "output_dir": "dist",
    "environment": {},
    "timeout_seconds": 3600
  },
  "runtime": {
    "runtime_key": "nodejs20",
    "start_script": "run.sh",
    "port": 8000,
    "environment": { "ADMIN_TOKEN": "$ADMIN_TOKEN" }
  }
}
JSON

if ! RESULT=$(sh "$CLI" deployments create \
  --site-id "$SITE_ID" \
  --title "更新站点 $(date '+%Y-%m-%d %H:%M')" \
  --description "由 blog-site 构建并发布：Node.js 20 服务托管静态页面，并提供口令保护的在线写作接口。" \
  --type function-web \
  --source-dir "$PKG" \
  --execution-config "$CONFIG" \
  --app-tags 101,123,289); then
  printf '%s\n' "$RESULT" >&2
  exit 1
fi

printf '%s\n' "$RESULT"

DEP_ID=$(printf '%s' "$RESULT" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);console.log(j&&j.data&&j.data.deployment_id||'')}catch(e){console.log('')}})")

if [ -z "$DEP_ID" ]; then
  echo "没有拿到 deployment_id，请检查上面的输出。" >&2
  exit 1
fi

sh "$CLI" deployments wait --deployment-id "$DEP_ID" --timeout-seconds 300
