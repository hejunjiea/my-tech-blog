(function () {
  var cfg = window.BLOG_GISCUS;
  if (!cfg || !cfg.repo || !cfg.repoId || !cfg.categoryId) return;

  var slug = new URLSearchParams(location.search).get('slug');
  var root = document.getElementById('article-root');
  if (!slug || !root) return;

  var style = document.createElement('style');
  style.textContent = '.comments{margin:34px 0 0}' +
    '.comments h2{font-family:Georgia,"Songti SC","Noto Serif SC",serif;font-weight:500;font-size:18px;margin:0 0 8px}' +
    '.comments-hint{margin:0 0 18px;font-size:12.5px;color:var(--faint)}' +
    '.comments-placeholder{margin:34px 0 0;padding:20px;text-align:center;color:var(--faint);' +
    'border:1px dashed var(--line);border-radius:6px;font-size:13px;cursor:pointer;transition:border-color .2s}' +
    '.comments-placeholder:hover{border-color:var(--accent);color:var(--text)}';
  document.head.appendChild(style);

  function theme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function mountGiscus(box) {
    var script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', cfg.repo);
    script.setAttribute('data-repo-id', cfg.repoId);
    script.setAttribute('data-category', cfg.category || 'Announcements');
    script.setAttribute('data-category-id', cfg.categoryId);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', slug);
    script.setAttribute('data-strict', '1');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', theme());
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    box.appendChild(script);
  }

  function setupObserver(box) {
    if (!('IntersectionObserver' in window)) {
      mountGiscus(box);
      return;
    }
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          obs.disconnect();
          mountGiscus(box);
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.1 });
    observer.observe(box);
  }

  function insertComments() {
    if (!root.querySelector('h1')) return false;
    // 避免重复插入
    if (document.getElementById('comments')) return true;

    var box = document.createElement('section');
    box.className = 'comments';
    box.id = 'comments';
    box.innerHTML = '<h2>评论</h2><p class="comments-hint">评论由 giscus 提供，需登录 GitHub 账号。滚动到此处自动加载，或点击立即加载。</p>' +
      '<div class="comments-placeholder" id="comments-placeholder">加载评论…</div>';
    root.appendChild(box);

    var placeholder = document.getElementById('comments-placeholder');
    placeholder.addEventListener('click', function () {
      if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      mountGiscus(box);
    });

    setupObserver(box);
    return true;
  }

  // 等文章渲染完（h1 出现）
  var tries = 0;
  var timer = setInterval(function () {
    if (insertComments() || ++tries > 120) clearInterval(timer);
  }, 100);

  // 主题切换时通知 giscus
  new MutationObserver(function () {
    var iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: theme() } } }, 'https://giscus.app');
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
