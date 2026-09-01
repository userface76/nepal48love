// 함께하는 기업 — /data/partners.json 을 읽어 카드로 그립니다.
// 기업을 추가할 때는 이 파일이 아니라 public/data/partners.json 만 고치면 됩니다.

const mount = document.getElementById('supporters-list');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 외부 주소만 허용 (javascript: 등 차단)
function safeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return ''; }
}

function badge(status) {
  return status === 'confirmed'
    ? '<span class="sup-badge ok">함께하는 중</span>'
    : '<span class="sup-badge">협의 중</span>';
}

function logo(c) {
  const src = safeUrl(c.logo) || (c.logo && c.logo.startsWith('/') ? c.logo : '');
  if (src) return `<img class="sup-logo" src="${esc(src)}" alt="${esc(c.name)} 로고" loading="lazy" />`;
  return `<span class="sup-logo initial" aria-hidden="true">${esc((c.name || '?').trim().charAt(0))}</span>`;
}

function card(c) {
  const url = safeUrl(c.url);
  const inner = `
    ${logo(c)}
    <div class="sup-body">
      <span class="sup-role">${esc(c.role || '협력')}</span>
      <h3>${esc(c.name)}</h3>
      <p class="xsmall mb-0">${esc(c.blurb || '')}</p>
    </div>
    <div class="sup-foot">
      ${badge(c.status)}
      ${url ? '<span class="sup-link">홈페이지 →</span>' : '<span class="sup-link muted">링크 준비 중</span>'}
    </div>`;

  return url
    ? `<a class="sup-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<div class="sup-card">${inner}</div>`;
}

const inviteCard = `
  <a class="sup-card invite" href="${document.getElementById('contact') ? '#contact' : '/#contact'}">
    <span class="sup-logo initial invite-mark" aria-hidden="true">+</span>
    <div class="sup-body">
      <span class="sup-role">기업 사회공헌</span>
      <h3>우리 회사도 응원하기</h3>
      <p class="xsmall mb-0">제품 후원 · 홍보 협력 · 임직원 참여 어떤 형태든 좋습니다. 참여 결과는 Social Impact Report 로 정리해 드립니다.</p>
    </div>
    <div class="sup-foot"><span class="sup-badge ok">모집 중</span><span class="sup-link">제안하기 →</span></div>
  </a>`;

(async function render() {
  if (!mount) return;
  let companies = [];
  try {
    const res = await fetch('/data/partners.json', { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.companies)) companies = json.companies.filter((c) => c && c.name);
    }
  } catch (_) { /* 목록을 못 읽어도 초대 카드는 보여줍니다 */ }

  mount.innerHTML = companies.map(card).join('') + inviteCard;
})();
