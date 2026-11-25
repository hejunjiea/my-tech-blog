'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const PUBLIC_DIR = path.join(__dirname, 'public');
const SEED_FILE = path.join(__dirname, 'seed.json');
const DATA_DIR = process.env.DATA_DIR || path.join(process.env.TMPDIR || '/tmp', 'blog-data');
const DATA_FILE = path.join(DATA_DIR, 'posts.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function readSeed() {
  try {
    const data = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    return Array.isArray(data.posts) ? data.posts : [];
  } catch (e) {
    return [];
  }
}

function readStore() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      posts: Array.isArray(data.posts) ? data.posts : [],
      deleted: Array.isArray(data.deleted) ? data.deleted : []
    };
  } catch (e) {
    return { posts: [], deleted: [] };
  }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2) + '\n', 'utf8');
}

function allPosts() {
  const store = readStore();
  const map = new Map();
  for (const p of readSeed()) map.set(p.slug, p);
  for (const p of store.posts) map.set(p.slug, p);
  for (const slug of store.deleted) map.delete(slug);
  return Array.from(map.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text)
  });
  res.end(text);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function authorized(req) {
  if (!ADMIN_TOKEN) return false;
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

function normalizePost(input) {
  const slug = String(input.slug || '').trim();
  const title = String(input.title || '').trim();
  const date = String(input.date || '').trim();
  const content = String(input.content || '');
  if (!title) throw new Error('标题不能为空');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期格式必须是 YYYY-MM-DD');
  if (content.length > 200000) throw new Error('正文过长');
  const finalSlug = slug || 'post-' + date.replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6);
  if (!/^[a-zA-Z0-9._-]+$/.test(finalSlug)) throw new Error('slug 只能包含字母、数字、点、下划线和短横线');
  return {
    slug: finalSlug,
    title,
    date,
    category: String(input.category || '笔记').trim() || '笔记',
    summary: String(input.summary || '').trim(),
    content
  };
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    if (pathname === '/api/posts' && req.method === 'GET') {
      json(res, 200, { posts: allPosts() });
      return;
    }

    if (pathname === '/api/auth' && req.method === 'POST') {
      json(res, authorized(req) ? 200 : 401, { ok: authorized(req) });
      return;
    }

    if (pathname === '/api/posts' && req.method === 'POST') {
      if (!authorized(req)) { json(res, 401, { error: '口令不正确' }); return; }
      const body = JSON.parse(await readBody(req, 1024 * 1024) || '{}');
      const post = normalizePost(body);
      const store = readStore();
      const idx = store.posts.findIndex((p) => p.slug === post.slug);
      if (idx >= 0) store.posts[idx] = post; else store.posts.push(post);
      store.deleted = store.deleted.filter((s) => s !== post.slug);
      writeStore(store);
      json(res, 200, { post });
      return;
    }

    const del = /^\/api\/posts\/([^/]+)$/.exec(pathname);
    if (del && req.method === 'DELETE') {
      if (!authorized(req)) { json(res, 401, { error: '口令不正确' }); return; }
      const slug = decodeURIComponent(del[1]);
      const store = readStore();
      store.posts = store.posts.filter((p) => p.slug !== slug);
      if (!store.deleted.includes(slug)) store.deleted.push(slug);
      writeStore(store);
      json(res, 200, { ok: true });
      return;
    }

    if (pathname.startsWith('/api/')) {
      json(res, 404, { error: 'not found' });
      return;
    }

    serveStatic(req, res, pathname);
  } catch (err) {
    json(res, 400, { error: err && err.message ? err.message : 'bad request' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('blog server listening on ' + HOST + ':' + PORT);
});
