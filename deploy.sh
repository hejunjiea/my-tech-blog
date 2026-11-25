#!/bin/sh
# 一键构建 + 部署：读取 content/posts/*.md，生成站点并发布。
# 用法：sh deploy.sh
set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
SITE_ID="37lnq3mgkji5x4uzdky"
CLI="/Users/tanyou/.trae-cn/plugins/trae-remote-official/deployment/0.0.43/skills/deployment/scripts/trae-deploy"
TMP_ROOT="${TMPDIR:-/tmp}"

SRC=$(mktemp -d "${TMP_ROOT%/}/blog-site.XXXXXX")
CONFIG=$(mktemp "${TMP_ROOT%/}/blog-config.XXXXXX")
printf '{}' > "$CONFIG"

node "$ROOT/build.mjs" "$SRC/public"

RESULT=$(sh "$CLI" deployments create \
  --site-id "$SITE_ID" \
  --title "更新文章 $(date '+%Y-%m-%d %H:%M')" \
  --description "由 blog-site 内容库构建并发布：content/posts 下的 Markdown 文章编译为 posts.json 后上线。" \
  --type static-web \
  --source-dir "$SRC" \
  --execution-config "$CONFIG" \
  --app-tags 101,123,289)

printf '%s\n' "$RESULT"

DEP_ID=$(printf '%s' "$RESULT" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);console.log(j&&j.data&&j.data.deployment_id||'')}catch(e){console.log('')}})")

if [ -z "$DEP_ID" ]; then
  echo "没有拿到 deployment_id，请检查上面的输出。" >&2
  exit 1
fi

sh "$CLI" deployments wait --deployment-id "$DEP_ID" --timeout-seconds 300
