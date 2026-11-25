(function (global) {
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(s) {
    var out = escapeHtml(s);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return out;
  }

  var headingCounter = 0;

  function mdToHtml(src) {
    headingCounter = 0;
    var lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
    var html = '';
    var inCode = false, codeBuf = [], inList = false, inQuote = false, para = [];

    function flushPara() {
      if (para.length) { html += '<p>' + inline(para.join(' ')) + '</p>\n'; para = []; }
    }
    function closeList() { if (inList) { html += '</ul>\n'; inList = false; } }
    function closeQuote() { if (inQuote) { html += '</blockquote>\n'; inQuote = false; } }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('```') === 0) {
        if (!inCode) {
          flushPara(); closeList(); closeQuote();
          inCode = true; codeBuf = [];
        } else {
          html += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>\n';
          inCode = false;
        }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }
      if (!line.trim()) { flushPara(); closeList(); closeQuote(); continue; }

      var h = line.match(/^(#{2,3})\s+(.*)$/);
      if (h) {
        flushPara(); closeList(); closeQuote();
        var lvl = h[1].length;
        var idAttr = '';
        if (lvl === 2) {
          headingCounter++;
          idAttr = ' id="sec-' + headingCounter + '"';
        }
        html += '<h' + lvl + idAttr + '>' + inline(h[2]) + '</h' + lvl + '>\n';
        continue;
      }
      if (/^[-*]\s+/.test(line)) {
        flushPara(); closeQuote();
        if (!inList) { html += '<ul>\n'; inList = true; }
        html += '<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>\n';
        continue;
      }
      if (line.charAt(0) === '>') {
        flushPara(); closeList();
        if (!inQuote) { html += '<blockquote>\n'; inQuote = true; }
        html += inline(line.replace(/^>\s?/, '')) + '\n';
        continue;
      }
      flushPara();
      para.push(line.trim());
    }
    flushPara(); closeList(); closeQuote();
    if (inCode && codeBuf.length) {
      html += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>\n';
    }
    return html;
  }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    return m[1] + ' 年 ' + parseInt(m[2], 10) + ' 月 ' + parseInt(m[3], 10) + ' 日';
  }

  function readingMinutes(text) {
    var len = String(text || '').replace(/\s/g, '').length;
    return Math.max(1, Math.round(len / 400));
  }

  function plainText(md) {
    return String(md || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*`\-]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function loadPosts() {
    var api = new URL('api/posts', location.href).href;
    var fallback = new URL('posts.json', location.href).href;

    function sortPosts(data) {
      var posts = (data && data.posts) || [];
      return posts.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
    }

    return fetch(api, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('api ' + res.status);
        return res.json();
      })
      .then(sortPosts)
      .catch(function () {
        return fetch(fallback, { cache: 'no-store' })
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(sortPosts);
      });
  }

  /* ---------------- 首页 ---------------- */

  var indexState = { posts: [], keyword: '', category: '' };

  function renderChips() {
    var box = document.getElementById('chips');
    if (!box) return;
    var cats = [];
    indexState.posts.forEach(function (p) {
      if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    var html = '<button class="chip' + (indexState.category === '' ? ' active' : '') + '" data-cat="">全部</button>';
    cats.forEach(function (c) {
      html += '<button class="chip' + (indexState.category === c ? ' active' : '') + '" data-cat="' +
        escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
    });
    box.innerHTML = html;
  }

  function renderList() {
    var list = document.getElementById('post-list');
    if (!list) return;
    var kw = indexState.keyword.trim().toLowerCase();
    var items = indexState.posts.filter(function (p) {
      var okCat = !indexState.category || p.category === indexState.category;
      var okKw = !kw || (p.title + ' ' + (p.summary || '')).toLowerCase().indexOf(kw) !== -1;
      return okCat && okKw;
    });

    if (!items.length) {
      list.innerHTML = '<li><p class="list-hint">没有找到匹配的文章。</p></li>';
      return;
    }
    list.innerHTML = items.map(function (p) {
      return '<li><a class="post-item" href="article.html?slug=' + encodeURIComponent(p.slug) + '">' +
        '<time datetime="' + escapeHtml(p.date) + '">' + escapeHtml(formatDate(p.date)) +
        (p.category ? ' · ' + escapeHtml(p.category) : '') + '</time>' +
        '<h2>' + escapeHtml(p.title) + '</h2>' +
        '<p>' + escapeHtml(p.summary || '') + '</p>' +
        '</a></li>';
    }).join('');
  }

  function renderIndex() {
    var list = document.getElementById('post-list');
    if (!list) return;
    var params = new URLSearchParams(location.search);
    indexState.category = params.get('cat') || '';

    loadPosts().then(function (posts) {
      indexState.posts = posts;
      if (indexState.category) {
        var exists = posts.some(function (p) { return p.category === indexState.category; });
        if (!exists) indexState.category = '';
      }
      renderChips();
      renderList();

      var count = document.getElementById('post-count');
      if (count) count.textContent = posts.length;

      var search = document.getElementById('search');
      if (search) {
        search.addEventListener('input', function () {
          indexState.keyword = search.value;
          renderList();
        });
      }
      var chips = document.getElementById('chips');
      if (chips) {
        chips.addEventListener('click', function (e) {
          var btn = e.target.closest ? e.target.closest('.chip') : null;
          if (!btn) return;
          indexState.category = btn.getAttribute('data-cat') || '';
          renderChips();
          renderList();
        });
      }
    }).catch(function () {
      list.innerHTML = '<li><p class="list-hint">文章数据加载失败，请稍后刷新页面。</p></li>';
    });
  }

  /* ---------------- 文章页 ---------------- */

  function buildToc(content) {
    var lines = String(content || '').split('\n');
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var m = /^##\s+(.*)$/.exec(lines[i]);
      if (m) items.push(m[1]);
    }
    if (items.length < 2) return '';
    var html = '<nav class="toc"><p class="toc-label">本文目录</p><ol>';
    items.forEach(function (t, i) {
      html += '<li><a href="#sec-' + (i + 1) + '">' + inline(t) + '</a></li>';
    });
    html += '</ol></nav>';
    return html;
  }

  function setMeta(name, content) {
    if (!content) return;
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setProperty(prop, content) {
    if (!content) return;
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function renderArticle() {
    var root = document.getElementById('article-root');
    if (!root) return;
    var slug = new URLSearchParams(location.search).get('slug');
    root.innerHTML = '<p class="list-hint">正在加载文章…</p>';

    loadPosts().then(function (posts) {
      var post = null;
      for (var i = 0; i < posts.length; i++) {
        if (posts[i].slug === slug) { post = posts[i]; break; }
      }
      if (!post) {
        document.title = '文章不存在 · 我的技术博客';
        root.innerHTML = '<a class="back" href="index.html">← 返回文章列表</a>' +
          '<h1>文章不存在</h1><p>这篇笔记可能已被移动或删除。</p>';
        return;
      }

      var url = new URL('article.html?slug=' + encodeURIComponent(post.slug), location.href).href;
      document.title = post.title + ' · 我的技术博客';
      setMeta('description', post.summary || plainText(post.content).slice(0, 120));
      setProperty('og:title', post.title);
      setProperty('og:description', post.summary || '');
      setProperty('og:type', 'article');
      setProperty('og:url', url);

      var idx = posts.indexOf(post);
      var newer = idx > 0 ? posts[idx - 1] : null;
      var older = idx < posts.length - 1 ? posts[idx + 1] : null;
      var pager = '';
      if (newer || older) {
        pager = '<div class="pager">' +
          (newer
            ? '<a href="article.html?slug=' + encodeURIComponent(newer.slug) + '"><span>上一篇</span><strong>' + escapeHtml(newer.title) + '</strong></a>'
            : '<span></span>') +
          (older
            ? '<a class="next" href="article.html?slug=' + encodeURIComponent(older.slug) + '"><span>下一篇</span><strong>' + escapeHtml(older.title) + '</strong></a>'
            : '<span></span>') +
          '</div>';
      }

      var catLink = post.category
        ? ' · <a class="cat-link" href="index.html?cat=' + encodeURIComponent(post.category) + '">' + escapeHtml(post.category) + '</a>'
        : '';

      root.innerHTML =
        '<a class="back" href="index.html">← 返回文章列表</a>' +
        '<h1>' + escapeHtml(post.title) + '</h1>' +
        '<p class="meta">' + escapeHtml(formatDate(post.date)) + catLink +
        ' · 约 ' + readingMinutes(post.content) + ' 分钟</p>' +
        buildToc(post.content) +
        mdToHtml(post.content) +
        pager +
        '<p class="end">感谢阅读，欢迎回到文章列表继续浏览。</p>';
    }).catch(function () {
      root.innerHTML = '<a class="back" href="index.html">← 返回文章列表</a>' +
        '<h1>加载失败</h1><p>文章数据读取失败，请稍后刷新页面。</p>';
    });
  }

  /* ---------------- 主题切换 ---------------- */

  function setupTheme() {
    var html = document.documentElement;
    var group = document.getElementById('theme-switch');
    var media = window.matchMedia('(prefers-color-scheme: dark)');

    function apply(mode) {
      var dark = mode === 'dark' || (mode === 'system' && media.matches);
      html.setAttribute('data-theme', dark ? 'dark' : 'light');
      html.setAttribute('data-theme-mode', mode);
    }

    function current() {
      var m = html.getAttribute('data-theme-mode');
      return m === 'light' || m === 'dark' ? m : 'system';
    }

    if (group) {
      group.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('button[data-mode]') : null;
        if (!btn) return;
        var mode = btn.getAttribute('data-mode');
        apply(mode);
        try { localStorage.setItem('blog-theme-mode', mode); } catch (err) {}
      });
    }

    var onChange = function () {
      if (current() === 'system') apply('system');
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);

    apply(current());
  }

  global.Blog = {
    escapeHtml: escapeHtml,
    mdToHtml: mdToHtml,
    formatDate: formatDate,
    plainText: plainText,
    loadPosts: loadPosts
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupTheme();
      renderIndex();
      renderArticle();
    });
  } else {
    setupTheme();
    renderIndex();
    renderArticle();
  }
})(window);
