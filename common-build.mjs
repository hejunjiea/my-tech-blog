#!/usr/bin/env node
/**
 * 构建脚本：把 content/posts/*.md 编译成 posts.json，并复制 common-site/ 下的静态页面。
 * 用法：node common-build.mjs [输出目录]   默认输出到 dist/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(root, 'common-site');
const contentDir = path.join(root, 'content', 'posts');
const outDir = path.resolve(process.argv[2] || path.join(root, 'dist'));

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function parseFrontMatter(raw, file) {
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) {
    throw new Error(`${file}: 缺少 front matter，文件需以 --- 开头`);
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) throw new Error(`${file}: front matter 未闭合`);
  const head = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n+/, '').replace(/\s+$/, '');

  const meta = {};
  for (const line of head.split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body };
}

if (!fs.existsSync(siteDir)) throw new Error('缺少 common-site 目录');
if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });

copyDir(siteDir, outDir);

const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.md')).sort();
const posts = [];
const seen = new Set();

for (const file of files) {
  const full = path.join(contentDir, file);
  const { meta, body } = parseFrontMatter(fs.readFileSync(full, 'utf8'), file);
  const slug = (meta.slug || file.replace(/\.md$/, '')).trim();
  if (!meta.title) throw new Error(`${file}: 缺少 title`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date || '')) {
    throw new Error(`${file}: date 必须是 YYYY-MM-DD`);
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) {
    throw new Error(`${file}: slug 只能包含字母、数字、点、下划线和短横线`);
  }
  if (seen.has(slug)) throw new Error(`${file}: slug 重复 -> ${slug}`);
  seen.add(slug);
  posts.push({
    slug,
    title: meta.title,
    date: meta.date,
    category: meta.category || '笔记',
    summary: meta.summary || '',
    content: body
  });
}

posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.slug).localeCompare(String(b.slug)));

// 旧的完整 posts.json（兼容本地 Node 服务）
fs.writeFileSync(path.join(outDir, 'posts.json'), JSON.stringify({ posts }, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(outDir, 'seed.json'), JSON.stringify({ posts }, null, 2) + '\n', 'utf8');

// 新：轻量索引（首页加载）+ 每篇独立数据（文章页按需加载）
const indexDir = path.join(outDir, 'posts');
fs.mkdirSync(indexDir, { recursive: true });
const indexList = posts.map(({ slug, title, date, category, summary }) => ({ slug, title, date, category, summary }));
fs.writeFileSync(path.join(outDir, 'posts-index.json'), JSON.stringify({ posts: indexList }, null, 2) + '\n', 'utf8');
for (const p of posts) {
  fs.writeFileSync(path.join(indexDir, `${p.slug}.json`), JSON.stringify(p, null, 2) + '\n', 'utf8');
}

const SITE_URL = 'https://hejunjiea.github.io/my-tech-blog';
const SITE_NAME = '我的技术博客';
const SITE_DESC = '记录 iOS 逆向、前端、后端、AI 与工程实践的笔记。';

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function articleUrl(slug) {
  return `${SITE_URL}/article.html?slug=${encodeURIComponent(slug)}`;
}

const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">',
  `  <url><loc>${SITE_URL}/</loc></url>`];
for (const p of posts) {
  sitemap.push(`  <url><loc>${xmlEscape(articleUrl(p.slug))}</loc><lastmod>${p.date}</lastmod></url>`);
}
sitemap.push('</urlset>', '');
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap.join('\n'), 'utf8');

fs.writeFileSync(path.join(outDir, 'robots.txt'),
  ['User-agent: *', 'Allow: /', 'Disallow: /write.html', 'Disallow: /admin/', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n'),
  'utf8');

const rss = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0">',
  '  <channel>',
  `    <title>${xmlEscape(SITE_NAME)}</title>`,
  `    <link>${SITE_URL}/</link>`,
  `    <description>${xmlEscape(SITE_DESC)}</description>`,
  '    <language>zh-CN</language>'];
for (const p of posts) {
  rss.push('    <item>',
    `      <title>${xmlEscape(p.title)}</title>`,
    `      <link>${xmlEscape(articleUrl(p.slug))}</link>`,
    `      <guid>${xmlEscape(articleUrl(p.slug))}</guid>`,
    `      <pubDate>${new Date(p.date + 'T08:00:00+08:00').toUTCString()}</pubDate>`,
    `      <category>${xmlEscape(p.category)}</category>`,
    `      <description>${xmlEscape(p.summary)}</description>`,
    '    </item>');
}
rss.push('  </channel>', '</rss>', '');
fs.writeFileSync(path.join(outDir, 'rss.xml'), rss.join('\n'), 'utf8');

console.log(`构建完成：${posts.length} 篇文章 -> ${outDir}`);
console.log('附加输出：sitemap.xml、robots.txt、rss.xml');
for (const p of posts) console.log(`  - ${p.date}  ${p.slug}  ${p.title}`);
