# 我的技术博客 · 部署包

一个零依赖的 Node.js 20 站点：静态页面 + 口令保护的在线写作接口。

## 目录结构

```
.
├── app/                  # 应用（构建产物 + 服务端）
│   ├── server.js         # HTTP 服务与写作接口
│   ├── run.sh
│   ├── package.json
│   ├── seed.json         # 随包发布的基线文章
│   └── public/           # 页面、样式、脚本、posts.json
├── Dockerfile
├── docker-compose.yml
├── start.sh              # 非 Docker 启动脚本
├── nginx.conf.example    # HTTPS 反向代理示例
└── .env.example
```

## 方式一：Docker（推荐）

```sh
cp .env.example .env        # 修改 ADMIN_TOKEN 为自己的口令
docker compose up -d --build
```

访问 `http://服务器IP:8000`，写作台在 `/write.html`。

数据默认落在宿主机 `./data`，删容器不会丢；备份直接拷 `data/posts.json`。

## 方式二：直接跑 Node

```sh
cp .env.example .env        # 修改 ADMIN_TOKEN 与 DATA_DIR
sh start.sh
```

要求 Node.js >= 20，无需 `npm install`（没有第三方依赖）。

## 方式三：托管到支持常驻进程的平台

- 启动命令：`node app/server.js`
- 端口：读取 `PORT`，监听 `HOST`（默认 `0.0.0.0`）
- 必填环境变量：`ADMIN_TOKEN`、`DATA_DIR`（指向持久磁盘）
- 注意：Serverless 平台（如 Vercel）文件系统不持久，需要外接数据库，不建议直接部署

## 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| `ADMIN_TOKEN` | 写作口令，发布/修改/删除文章时校验 | 无（必填） |
| `PORT` | 监听端口 | `8000` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `DATA_DIR` | 用户文章存储目录 | `/tmp/blog-data`（不可用于生产） |

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/posts` | 返回全部文章（基线 + 线上） |
| POST | `/api/posts` | 新建或按 slug 覆盖，需 `x-admin-token` |
| DELETE | `/api/posts/:slug` | 删除或隐藏，需 `x-admin-token` |

## 更新内容

1. 把新的 `.md` 放进 `content/posts`（源仓库），或直接在线上写作台发布
2. 重新构建并替换 `app/` 目录，重启服务
3. `DATA_DIR` 不要动，用户文章与基线文章会自动合并

## 备份与迁移

- 只备份 `DATA_DIR/posts.json` 即可保住线上文章
- 迁移到新机器：拷 `app/` + `data/posts.json`，再用同样的环境变量启动

## 安全建议

- `ADMIN_TOKEN` 用 12 位以上随机串，不要用示例值
- 前置 Nginx/Caddy 走 HTTPS，避免口令明文传输
- 不要把 `.env` 提交到版本库
