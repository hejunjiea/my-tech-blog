# 我的技术博客

零依赖 Node.js 站点：Markdown 文章编译为静态页，可本地带写作接口运行，也可发布为静态站或部署到自有服务器。

## 快速开始

```sh
# 本地运行（端口 口令），数据落在 data/，重启不丢
sh local.sh 8000 你的口令
# 打开 http://localhost:8000
```

开发监听（改动 `common-site/` 或 `content/` 自动重建）：

```sh
sh local-dev.sh
```

另开终端启动服务：

```sh
cd local-site && PORT=8000 HOST=127.0.0.1 DATA_DIR=../data ADMIN_TOKEN=你的口令 node server.js
```

发布：

```sh
sh web-deploy.sh            # 发布静态站（Trae 托管）
sh web-package-deploy.sh    # 生成可上传服务器的部署包
```

## 在线写作（Decap CMS）

先按 [web-decap-oauth/README.md](web-decap-oauth/README.md) 部署 OAuth Worker，并把 Worker 地址填到 `common-site/admin/config.yml` 的 `base_url`。

然后打开：

```
https://hejunjiea.github.io/my-tech-blog/admin/
```

用 GitHub 登录后即可新增、编辑、删除文章。保存会直接提交到 `content/posts/`，GitHub Actions 自动重建页面。

## 目录结构

```
md-blog-site/
├── README.md                 # 本文件：一页上手说明
├── docs/                     # 详细文档
│   ├── 项目部署与开发指南.md
│   └── 文章写作与本地部署教程.md
├── common-build.mjs          # 构建：Markdown → posts.json + 页面
├── common-site/              # 页面模板与前端脚本（本地/线上共用）
├── common-server/            # Node 服务与写作接口（本地/线上共用）
├── content/posts/            # 文章源文件（唯一基线内容）
│
├── local.sh                  # 本地一键构建 + 启动
├── local-dev.sh              # 本地监听自动重建
│
├── web-deploy.sh             # 发布静态站
├── web-deploy-node.sh        # 发布 Node 服务
├── web-package-deploy.sh     # 生成服务器部署包
├── web-assets/               # 部署包素材（Docker、Nginx、部署文档）
├── web-decap-oauth/          # Decap CMS 登录代理（Cloudflare Worker）
│
└── .github/workflows/web-pages.yml   # GitHub Pages 自动部署
```

构建产物与运行数据不入库，由脚本自动生成（见 `.gitignore`）。

## 命名约定

| 前缀 | 含义 | 例子 |
|---|---|---|
| `common-` | 本地与线上共用 | `common-site/`、`common-server/`、`common-build.mjs` |
| `local-` | 只在本地使用 | `local.sh`、`local-dev.sh` |
| `web-` | 只在线上使用 | `web-deploy.sh`、`web-assets/` |
| 无前缀 | 文章内容 | `content/posts/*.md` |

## 文档

- [项目部署与开发指南](docs/项目部署与开发指南.md)：构建原理、接口、打包、部署、备份与排错
- [文章写作与本地部署教程](docs/文章写作与本地部署教程.md)：写作流程、增删改操作、评论配置
- [提交新文章到 GitHub 教程](docs/提交新文章到GitHub教程.md)：从新建 Markdown 到推送、Actions 自动发布的完整命令
