/**
 * Decap CMS GitHub OAuth 代理（Cloudflare Worker）
 *
 * 路由：
 *   GET /auth      跳转 GitHub 授权页
 *   GET /callback  用 code 换取 access_token，并回传给 Decap 管理后台窗口
 *
 * 环境变量：
 *   GITHUB_CLIENT_ID       GitHub OAuth App 的 Client ID
 *   GITHUB_CLIENT_SECRET   GitHub OAuth App 的 Client Secret（用 wrangler secret 设置）
 *   ALLOWED_ORIGIN         站点来源，例如 https://hejunjiea.github.io
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/auth') return auth(request, env);
    if (url.pathname === '/callback') return callback(request, env);
    return new Response('Decap OAuth proxy', { status: 200 });
  }
};

function auth(request, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response('缺少 GITHUB_CLIENT_ID，请先执行 wrangler secret put GITHUB_CLIENT_ID', { status: 500 });
  }
  const url = new URL(request.url);
  const target = new URL('https://github.com/login/oauth/authorize');
  target.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  target.searchParams.set('redirect_uri', `${url.origin}/callback`);
  target.searchParams.set('scope', 'repo');
  target.searchParams.set('state', 'decap-cms');
  return Response.redirect(target.toString(), 302);
}

async function callback(request, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response('缺少 OAuth 密钥，请先配置 GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET', { status: 500 });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return new Response('缺少 code 参数', { status: 400 });

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`
    })
  });

  const data = await res.json();
  if (!data.access_token) {
    return new Response(`获取 token 失败：${data.error_description || data.error || 'unknown'}`, { status: 400 });
  }

  return new Response(callbackPage(data.access_token, env.ALLOWED_ORIGIN), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function callbackPage(token, allowedOrigin) {
  const message = 'authorization:github:success:' + JSON.stringify({ token, provider: 'github' });
  const payload = JSON.stringify(message).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="zh-CN">
<body>
<script>
(function () {
  if (!window.opener) return;
  var allowed = ${JSON.stringify(allowedOrigin || '')};
  function receiveMessage(e) {
    if (allowed && e.origin !== allowed) return;
    window.opener.postMessage(${payload}, e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`;
}
