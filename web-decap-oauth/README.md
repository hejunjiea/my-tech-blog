# Sveltia / Decap CMS OAuth 代理（Cloudflare Worker）

GitHub Pages 只能托管静态文件，无法完成 GitHub OAuth 的 `code → access_token` 交换。这个 Worker 替 Sveltia CMS（或 Decap CMS）完成登录回调，两者使用同一套 OAuth 协议。

前置条件：Cloudflare 账号、Node.js 20+。

## 1. 部署 Worker，拿到地址

```sh
cd web-decap-oauth
npx wrangler login
npx wrangler deploy
```

部署成功后会输出 Worker 地址，例如：

```
https://decap-oauth.<你的子域>.workers.dev
```

## 2. 创建 GitHub OAuth App

打开 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：

| 字段 | 填写 |
|---|---|
| Application name | 我的技术博客 CMS |
| Homepage URL | `https://hejunjiea.github.io/my-tech-blog/` |
| Authorization callback URL | `https://decap-oauth.web-decap-oauth.workers.dev/callback` |

创建后记下 `Client ID`，再点「Generate a new client secret」生成 `Client Secret`。

## 3. 配置环境变量

```sh
cd web-decap-oauth
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

`ALLOWED_ORIGIN` 已写在 `wrangler.toml`，默认 `https://hejunjiea.github.io`。如果以后绑定自定义域名，记得同步修改。

## 4. 填写后台配置

编辑 `common-site/admin/config.yml`，把 `base_url` 换成 Worker 地址（末尾不要带 `/auth`）：

```yaml
backend:
  name: github
  repo: hejunjiea/my-tech-blog
  branch: main
  base_url: https://decap-oauth.web-decap-oauth.workers.dev
  auth_endpoint: auth
```

## 5. 构建并发布

```sh
cd /Users/tanyou/Desktop/2Mac_project/md-blog-site
node common-build.mjs dist
git add common-site/admin web-decap-oauth
git commit -m "feat: 接入 Sveltia CMS 在线写作"
git push git@github.com:hejunjiea/my-tech-blog.git main
```

## 6. 使用

打开：

```
https://hejunjiea.github.io/my-tech-blog/admin/
```

用 GitHub 登录后即可新增、编辑、删除文章。保存会直接提交到 `content/posts/`，GitHub Actions 随后自动重建 Pages。

## 安全注意

- `Client Secret` 只放在 Worker secret 中，绝不写进仓库或前端
- 不要在前端保存 token
- 有仓库写权限的 GitHub 账号都能通过该后台提交文章
- `admin/` 页面已加 `noindex`，但地址仍可被猜到，不要把敏感信息放进文章

## 本地调试（可选）

```sh
cd web-decap-oauth
cp .dev.vars.example .dev.vars   # 填入 Client ID / Secret
npx wrangler dev
```

临时把 `common-site/admin/config.yml` 的 `base_url` 指向 `http://127.0.0.1:8787` 即可在本地验证登录流程。
