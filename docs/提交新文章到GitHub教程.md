# 提交新文章到 GitHub 教程

> 适用项目：`md-blog-site`
> 目标：把一篇 Markdown 文章发布到 https://hejunjiea.github.io/my-tech-blog/
> 项目根目录：`/Users/tanyou/Desktop/2Mac_project/md-blog-site`

---

## 一、先弄清发布链路

```
content/posts/*.md
      │  node common-build.mjs dist
      ▼
dist/posts.json + 页面
      │  git push main
      ▼
GitHub Actions（web-pages.yml）
      ▼
GitHub Pages 线上站点
```

两个关键事实：

1. **写作台在 GitHub Pages 上不能直接发布**。静态托管没有 Node 服务，发布按钮会被禁用，只能「导出 Markdown 文件」。
2. **新文章进 GitHub 的唯一路径**是：写 `.md` → 本地校验 → 提交 → 推送 → Actions 自动构建发布。

---

## 二、前置条件

| 依赖 | 要求 |
|---|---|
| Node.js | ≥ 20 |
| Git | 已安装 |
| GitHub 推送权限 | 使用 SSH（当前 HTTPS remote 无匿名写权限） |

检查环境：

```sh
cd /Users/tanyou/Desktop/2Mac_project/md-blog-site
node -v
ssh -T git@github.com
```

`ssh -T` 出现 `Hi hejunjiea! You've successfully authenticated` 即可。

---

## 三、完整流程

### 1. 新建文章文件

```sh
cd /Users/tanyou/Desktop/2Mac_project/md-blog-site

cat > content/posts/my-new-post.md <<'EOF'
---
slug: my-new-post
title: 文章标题
date: 2026-11-26
category: 笔记
summary: 一句话摘要，会显示在首页和搜索结果里
---

正文从这里开始，支持 `## 小标题`、列表、引用、代码块和 **加粗**。
EOF
```

front matter 字段规则：

| 字段 | 必填 | 规则 |
|---|---|---|
| `slug` | 建议 | 唯一；只能用字母、数字、`.`、`_`、`-` |
| `title` | 是 | 文章标题 |
| `date` | 是 | 必须是 `YYYY-MM-DD`，首页按日期倒序 |
| `category` | 否 | 默认「笔记」 |
| `summary` | 否 | 首页摘要与 SEO 描述 |

> 文件名只是默认 slug，最终以 front matter 里的 `slug` 为准。建议文件名和 slug 保持一致。

### 2. 本地校验构建

```sh
node common-build.mjs dist
```

成功时会列出所有文章。若失败，终端会指出具体文件和字段。

### 3. 本地预览（可选）

```sh
sh local.sh 8000 你的口令
# 打开 http://localhost:8000
```

确认标题、摘要、正文和排版都正常后再提交。

### 4. 提交

```sh
git add content/posts/my-new-post.md
git commit -m "docs: 新增文章 文章标题"
```

### 5. 推送到 GitHub

```sh
git push git@github.com:hejunjiea/my-tech-blog.git main
```

如果希望以后直接 `git push`，可执行一次：

```sh
git remote set-url origin git@github.com:hejunjiea/my-tech-blog.git
```

之后直接：

```sh
git push
```

### 6. 等待自动发布

推送后 GitHub Actions 会自动运行 `.github/workflows/web-pages.yml`，约 1 分钟后线上更新。

验收清单：

| 检查项 | 操作 | 期望 |
|---|---|---|
| Actions | 打开仓库 Actions 页 | 最新构建为绿色 |
| 首页 | 打开线上首页 | 出现新文章 |
| 文章页 | 点击新文章 | 目录、上下篇、正文正常 |
| SEO | 打开 `/sitemap.xml`、`/rss.xml` | 包含新文章 |
| 缓存 | `Cmd + Shift + R` 强制刷新 | 内容为最新 |

---

## 四、修改已有文章

```sh
cd /Users/tanyou/Desktop/2Mac_project/md-blog-site
node common-build.mjs dist
git add content/posts/已有文件名.md
git commit -m "docs: 更新文章 标题"
git push git@github.com:hejunjiea/my-tech-blog.git main
```

注意：**不要改已发布文章的 `slug`**，否则会被当成一篇新文章，旧链接失效。

---

## 五、批量提交多篇文章

```sh
cd /Users/tanyou/Desktop/2Mac_project/md-blog-site
node common-build.mjs dist
git add content/posts
git commit -m "docs: 新增多篇文章"
git push git@github.com:hejunjiea/my-tech-blog.git main
```

---

## 六、常见问题

**Q1：构建失败，提示缺少 title / date 格式不对 / slug 重复**

按终端提示修正对应 `.md` 的 front matter。常见原因：

- `title` 为空
- `date` 写成 `2026/11/26` 或 `2026-11-6`
- 两篇文章用了同一个 `slug`
- `slug` 含中文或空格

**Q2：`git push` 报 `Authentication failed`**

HTTPS remote 没有写入权限，改用 SSH 地址推送：

```sh
git push git@github.com:hejunjiea/my-tech-blog.git main
```

或一次性切换 remote 为 SSH（见 5. 推送步骤）。

**Q3：推送成功但线上页面没变化**

1. 打开仓库 Actions 页，确认最新运行是否成功；
2. 失败则点进去看日志；
3. 成功后强制刷新浏览器（`Cmd + Shift + R`）；
4. 检查是否推到了 `main` 分支。

**Q4：写作台的「发布到线上」是灰色**

这是正常现象。GitHub Pages 是静态托管，没有 Node 接口。请用「导出 Markdown 文件」，再按本文流程提交。

**Q5：`data/posts.json` 要不要提交？**

不要。它已被 `.gitignore` 忽略，属于本地/服务器运行数据。要进入 GitHub Pages 的内容必须写成 `content/posts/*.md`。

**Q6：文章日期怎么排？**

首页按 `date` 倒序排列，日期越新越靠前。同一天的文章按 slug 排序。

---

## 七、命令速查

```sh
# 进入项目
cd /Users/tanyou/Desktop/2Mac_project/md-blog-site

# 本地校验构建
node common-build.mjs dist

# 本地预览（端口 口令）
sh local.sh 8000 你的口令

# 提交单篇
git add content/posts/文件名.md
git commit -m "docs: 新增文章 标题"

# 提交多篇
git add content/posts
git commit -m "docs: 新增多篇文章"

# 推送
git push git@github.com:hejunjiea/my-tech-blog.git main
```

---

## 附：可直接复制的文章模板

````markdown
---
slug: my-new-post
title: 文章标题
date: 2026-11-26
category: 笔记
summary: 一句话摘要，会显示在首页和搜索结果里
---

## 小标题

正文内容。

- 列表项
- 列表项

> 引用内容

`行内代码`

```js
console.log('代码块示例');
```
````
