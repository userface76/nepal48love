// 전역 미들웨어 — 보안 헤더 부여 및 관리자 페이지 검색엔진 차단
export async function onRequest(context) {
  const response = await context.next();
  const url = new URL(context.request.url);

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('Cache-Control', 'no-store');
  }

  return new Response(response.body, { status: response.status, headers });
}
