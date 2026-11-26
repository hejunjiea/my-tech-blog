# 我的技术博客

零依赖 Node.js 站点：Markdown 文章编译为静态页；本地可带写作接口运行，线上支持 GitHub Pages + Decap 在线写作，也可发布静态站或部署到自有服务器。

## 本地部署与使用

### 一键启动

```sh
sh local.sh 8000 你的口令
# 打开 http://localhost:8000
```

参数顺序：`local.sh [端口] [口令] [监听地址]`，默认端口 `8000`、口令 `local-dev`、监听 `127.0.0.1`。

### 修改本地口令

```sh
sh local.sh 8000 新口令                  # 临时指定
BLOG_ADMIN_TOKEN=新口令 sh local.sh      # 环境变量
```

或修改 [local.sh](local.sh) 中的默认值：

```sh
TOKEN="${2:-${BLOG_ADMIN_TOKEN:-新口令}}"
```

改完需重启服务；浏览器若仍用旧口令，在写作台重新输入，或清除 localStorage 键 `blog-admin-token`。

### 本地写作

打开 `http://localhost:8000/write.html`：

- 「发布到线上」写入 `data/posts.json`，重启不丢
- 「导出 Markdown」生成带 front matter 的 md，可放进 `content/posts/`
- 图片语法：`![说明](assets/uploads/demo.png)`

### 开发监听

```sh
sh local-dev.sh
# 另开终端
cd local-site && PORT=8000 HOST=127.0.0.1 DATA_DIR=../data ADMIN_TOKEN=你的口令 node server.js
```

### 只构建

```sh
node common-build.mjs dist
```

## 线上部署与使用

### 方式一：GitHub Pages + Decap CMS（当前线上，支持在线写作）

- 访客：直接访问 `https://hejunjiea.github.io/my-tech-blog/`，**不需要登录**
- 作者：打开 `https://hejunjiea.github.io/my-tech-blog/admin/`，用 GitHub 登录后新增、编辑、删除文章
- 保存即提交到 `content/posts/`，GitHub Actions 自动重建，约 1 分钟上线
- OAuth Worker 部署与密钥配置见 [web-decap-oauth/README.md](web-decap-oauth/README.md)

### 方式二：手动 Markdown + push

```sh
node common-build.mjs dist
git add content/posts
git commit -m "docs: 新增文章 xxx"
git push git@github.com:hejunjiea/my-tech-blog.git main
```

完整命令见 [提交新文章到 GitHub 教程](docs/提交新文章到GitHub教程.md)。

### 方式三：自有服务器

```sh
sh web-package-deploy.sh
# 上传 web-deploy.tar.gz，按包内 README 启动
```

### 其他：Trae 静态托管

```sh
sh web-deploy.sh
```

### 本地与线上对比

| | 本地 | 线上 |
|---|---|---|
| 阅读地址 | `http://localhost:8000` | `https://hejunjiea.github.io/my-tech-blog/` |
| 写作入口 | `write.html` | `admin/` |
| 登录方式 | `ADMIN_TOKEN` 口令 | GitHub OAuth |
| 文章数据 | `data/posts.json` | `content/posts/*.md` + Git commit |
| 发布方式 | 本地即时生效 | Actions 自动重建 |

> 本地和线上数据不互通：本地写的文章不会自动出现在 GitHub，线上 Decap 保存的文章也不会写回本地 `data/posts.json`。

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
