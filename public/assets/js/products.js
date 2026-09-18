// LOVE 감사제품 — /data/products.json 을 읽어 카드로 그리고,
// 사진을 누르면 큰 화면으로 보여줍니다.
// 제품을 바꿀 때는 이 파일이 아니라 public/data/products.json 만 고치면 됩니다.

const pMount = document.getElementById('product-list');

const pEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pWon = (n) => Number(n || 0).toLocaleString('ko-KR');

// 이미지 경로는 우리 폴더 안의 것만 허용합니다.
const safeImg = (v) => (/^\/assets\/img\/[\w.-]+$/.test(String(v || '')) ? v : '');

function card(item, i) {
  const name = pEsc(item.name);
  const volume = pEsc(item.volume);
  const note = pEsc(item.note);
  const img = safeImg(item.image);

  return `
    <li class="prod">
      ${img
        ? `<button type="button" class="prod-img" data-i="${i}" aria-label="${name} 크게 보기">
             <img src="${img}" alt="${name}" loading="lazy" width="400" height="400" />
             <span class="prod-zoom" aria-hidden="true">크게 보기</span>
           </button>`
        : '<div class="prod-img"><span class="prod-noimg">이미지 준비 중</span></div>'}
      <div class="prod-body">
        <p class="prod-name">${name}</p>
        <p class="prod-meta">
          ${volume ? `<span>${volume}</span>` : ''}
          ${Number(item.price) > 0 ? `<span class="prod-price">${pWon(item.price)}원</span>` : ''}
        </p>
        ${note ? `<p class="prod-note">${note}</p>` : ''}
      </div>
    </li>`;
}

// ── 큰 화면으로 보기 ────────────────────────────────────
function setupLightbox(items) {
  const shots = items.map((it, i) => ({ ...it, i })).filter((it) => safeImg(it.image));
  if (!shots.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', '제품 사진 크게 보기');
  box.innerHTML = `
    <button type="button" class="lb-close" aria-label="닫기">✕</button>
    <button type="button" class="lb-nav lb-prev" aria-label="이전 제품">←</button>
    <figure class="lb-figure">
      <img alt="" />
      <figcaption>
        <p class="lb-name"></p>
        <p class="lb-meta"></p>
        <p class="lb-count"></p>
      </figcaption>
    </figure>
    <button type="button" class="lb-nav lb-next" aria-label="다음 제품">→</button>`;
  document.body.appendChild(box);

  const imgEl = box.querySelector('img');
  const nameEl = box.querySelector('.lb-name');
  const metaEl = box.querySelector('.lb-meta');
  const countEl = box.querySelector('.lb-count');
  const closeBtn = box.querySelector('.lb-close');

  let at = 0;
  let lastFocus = null;

  function show(k) {
    at = (k + shots.length) % shots.length;
    const it = shots[at];
    imgEl.src = it.image;
    imgEl.alt = it.name || '';
    nameEl.textContent = it.name || '';
    const bits = [];
    if (it.volume) bits.push(it.volume);
    if (Number(it.price) > 0) bits.push(`${pWon(it.price)}원`);
    metaEl.textContent = bits.join('  ·  ');
    countEl.textContent = `${at + 1} / ${shots.length}`;
  }

  function open(idx) {
    const k = shots.findIndex((s) => s.i === idx);
    lastFocus = document.activeElement;
    show(k < 0 ? 0 : k);
    box.hidden = false;
    document.body.classList.add('lb-open');
    closeBtn.focus();
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove('lb-open');
    imgEl.removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  pMount.addEventListener('click', (e) => {
    const btn = e.target.closest('.prod-img[data-i]');
    if (btn) open(Number(btn.dataset.i));
  });

  closeBtn.addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', () => show(at - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(at + 1));
  // 사진 바깥의 검은 부분을 누르면 닫힙니다.
  box.addEventListener('click', (e) => { if (e.target === box) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
    if (e.key === 'ArrowLeft') { e.stopImmediatePropagation(); show(at - 1); }
    if (e.key === 'ArrowRight') { e.stopImmediatePropagation(); show(at + 1); }
  });
}

// ── 그리기 ─────────────────────────────────────────────
if (pMount) {
  fetch('/data/products.json')
    .then((r) => r.json())
    .then((data) => {
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) { pMount.innerHTML = ''; return; }

      pMount.innerHTML = `<ul class="products">${items.map(card).join('')}</ul>`;

      const sum = items.reduce((a, it) => a + (Number(it.price) || 0), 0);
      const foot = document.getElementById('product-sum');
      if (foot) {
        foot.textContent = `총 ${items.length}종 · 정가 합계 ${pWon(sum)}원 (소비자가 기준)`;
      }

      setupLightbox(items);
    })
    .catch(() => {
      pMount.innerHTML = '<p class="small muted">제품 목록을 불러오지 못했습니다.</p>';
    });
}
