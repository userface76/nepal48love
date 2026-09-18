// 제안서 챕터 나누기.
// 처음 들어오면 전체 페이지가 그대로 쭉 나옵니다.
// 위쪽 목차나 상단 메뉴에서 한 곳을 누르면 그 챕터만 따로 보이고,
// "전체 보기" 를 누르면 다시 전체 페이지로 돌아옵니다.
// 챕터를 바꾸고 싶으면 아래 GROUPS 의 label(이름)과 n(그 챕터에 들어갈 섹션 개수)만 고치면 됩니다.
// n 을 모두 더한 값이 페이지의 섹션 개수와 같아야 합니다.

(function () {
  const GROUPS = [
    { label: '표지 · 사업개요', n: 2 },
    { label: 'LOVE 감사제품', n: 1 },
    { label: 'Ⅱ·Ⅲ 배경과 목적', n: 2 },
    { label: 'Ⅴ 참여 구조', n: 2 },
    { label: '커뮤니케이션 원칙', n: 2 },
    { label: '파트너십 · 함께하는 기업', n: 3 },
    { label: '파일럿 · 성공 기준', n: 2 },
    { label: '법률 검토', n: 1 },
    { label: '최종 제안 · 참여', n: 3 },
  ];

  const sections = Array.from(document.querySelectorAll('body > section'));
  if (!sections.length) return;

  // 섹션 개수가 GROUPS 와 맞지 않으면(내용을 추가했다면) 마지막 챕터가 나머지를 다 받습니다.
  const total = GROUPS.reduce((a, g) => a + g.n, 0);
  if (total !== sections.length) GROUPS[GROUPS.length - 1].n += sections.length - total;

  // ── 1) 섹션들을 챕터로 묶는다 ──────────────────────────
  const chapters = [];
  let at = 0;
  for (const g of GROUPS) {
    const mine = sections.slice(at, at + g.n);
    at += g.n;
    if (!mine.length) continue;
    const box = document.createElement('div');
    box.className = 'chapter';
    mine[0].parentNode.insertBefore(box, mine[0]);
    mine.forEach((s) => box.appendChild(s));
    chapters.push({ label: g.label, el: box });
  }
  if (chapters.length < 2) return;

  // ── 2) 위쪽 목차 ─────────────────────────────────────
  const bar = document.createElement('nav');
  bar.className = 'chapter-bar';
  bar.setAttribute('aria-label', '제안서 목차');
  bar.innerHTML =
    '<div class="wrap">' +
    '<div class="chapter-chips">' +
    chapters
      .map((c, i) => `<button type="button" class="chip" data-go="${i}" title="이 챕터만 보기">
          <span class="chip-n">${i + 1}</span>${c.label}</button>`)
      .join('') +
    '</div>' +
    '<button type="button" class="chapter-all" id="ch-all">전체 보기</button>' +
    '</div>';
  const header = document.querySelector('.site-header');
  header.parentNode.insertBefore(bar, header.nextSibling);

  // ── 3) 아래쪽 이전/다음 ───────────────────────────────
  const pager = document.createElement('div');
  pager.className = 'chapter-pager';
  pager.innerHTML =
    '<div class="wrap">' +
    '<button type="button" class="pg prev" data-step="-1"><span class="pg-dir">← 이전</span><span class="pg-name"></span></button>' +
    '<div class="pg-count"></div>' +
    '<button type="button" class="pg next" data-step="1"><span class="pg-dir">다음 →</span><span class="pg-name"></span></button>' +
    '</div>';
  chapters[chapters.length - 1].el.parentNode.insertBefore(
    pager,
    chapters[chapters.length - 1].el.nextSibling
  );

  const chips = Array.from(bar.querySelectorAll('.chip'));
  const prevBtn = pager.querySelector('.prev');
  const nextBtn = pager.querySelector('.next');
  const countEl = pager.querySelector('.pg-count');
  const allBtn = bar.querySelector('#ch-all');

  let current = 0;
  let showAll = true;   // 처음에는 전체 페이지

  // ── 4) 챕터 전환 ─────────────────────────────────────
  function render() {
    document.body.classList.toggle('ch-all-on', showAll);
    chapters.forEach((c, i) => { c.el.hidden = !showAll && i !== current; });
    chips.forEach((b, i) => {
      const on = !showAll && i === current;
      b.classList.toggle('on', on);
      b.setAttribute('aria-current', on ? 'true' : 'false');
    });

    pager.hidden = showAll;
    const p = chapters[current - 1];
    const n = chapters[current + 1];
    prevBtn.hidden = !p;
    nextBtn.hidden = !n;
    if (p) prevBtn.querySelector('.pg-name').textContent = p.label;
    if (n) nextBtn.querySelector('.pg-name').textContent = n.label;
    countEl.textContent = `${current + 1} / ${chapters.length}`;

    const chip = chips[current];
    if (chip && !showAll) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
    allBtn.textContent = showAll ? '한 챕터씩 보기' : '전체 보기';
  }

  function go(i, opts = {}) {
    const next = Math.max(0, Math.min(chapters.length - 1, i));
    const moved = next !== current || showAll;
    current = next;
    showAll = false;
    render();
    if (opts.scrollTo) {
      opts.scrollTo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (moved) {
      const top = bar.getBoundingClientRect().top + window.scrollY - 62;
      window.scrollTo({ top: Math.max(0, top), behavior: opts.instant ? 'auto' : 'smooth' });
    }
    if (!opts.keepHash) history.replaceState(null, '', `#ch${current + 1}`);
  }

  // 어떤 요소가 몇 번째 챕터에 있나
  function chapterOf(el) {
    for (let i = 0; i < chapters.length; i++) if (chapters[i].el.contains(el)) return i;
    return -1;
  }

  // ── 5) 조작 ─────────────────────────────────────────
  chips.forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.go))));
  prevBtn.addEventListener('click', () => go(current - 1));
  nextBtn.addEventListener('click', () => go(current + 1));
  allBtn.addEventListener('click', () => {
    showAll = !showAll;
    render();
    if (showAll) window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 페이지 안의 #링크 — 그 내용이 있는 챕터로 넘어간 뒤 그 자리로 이동
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    const i = chapterOf(target);
    if (i < 0) return;
    e.preventDefault();
    go(i, { scrollTo: target, keepHash: true });
    history.replaceState(null, '', `#${id}`);
  });

  // ← → 키로 넘기기 (전체 페이지로 보는 중이거나 입력칸에 타이핑 중일 때는 빼고)
  document.addEventListener('keydown', (e) => {
    if (showAll) return;
    if (document.body.classList.contains('lb-open')) return;  // 사진 크게 보는 중
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === 'ArrowRight') go(current + 1);
    if (e.key === 'ArrowLeft') go(current - 1);
  });

  // ── 6) 첫 화면 — 주소의 #에 맞춰 연다 ──────────────────
  function openFromHash(instant) {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (!raw) { showAll = true; current = 0; render(); return; }   // 주소에 아무것도 없으면 전체 페이지
    const m = raw.match(/^ch(\d+)$/i);
    if (m) return go(Number(m[1]) - 1, { instant: true, keepHash: true });
    const target = document.getElementById(raw);
    const i = target ? chapterOf(target) : -1;
    if (i >= 0) return go(i, { scrollTo: instant ? null : target, instant: true, keepHash: true });
    go(0, { instant: true, keepHash: true });
  }

  window.addEventListener('hashchange', () => openFromHash(false));
  openFromHash(true);
})();
