(function () {
  var cfg = window.BLOG_GISCUS;
  if (!cfg || !cfg.repo || !cfg.repoId || !cfg.categoryId) return;

  var slug = new URLSearchParams(location.search).get('slug');
  var root = document.getElementById('article-root');
  if (!slug || !root) return;

  var style = document.createElement('style');
  style.textContent = '.comments{margin:34px 0 0}' +
    '.comments h2{font-family:Georgia,"Songti SC","Noto Serif SC",serif;font-weight:500;font-size:18px;margin:0 0 8px}' +
    '.comments-hint{margin:0 0 18px;font-size:12.5px;color:var(--faint)}';
  document.head.appendChild(style);

  function theme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  var mounted = false;

  function mount() {
    if (mounted || !root.querySelector('h1')) return;
    mounted = true;

    var box = document.createElement('section');
    box.className = 'comments';
    box.id = 'comments';
    box.innerHTML = '<h2>评论</h2><p class="comments-hint">评论由 giscus 提供，需登录 GitHub 账号。</p>';
    root.appendChild(box);

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

  var tries = 0;
  var timer = setInterval(function () {
    mount();
    if (mounted || ++tries > 60) clearInterval(timer);
  }, 100);

  new MutationObserver(function () {
    var iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: theme() } } }, 'https://giscus.app');
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
