// 공용 헬퍼
export const won = (n) => Number(n || 0).toLocaleString('ko-KR');

export async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  let json = {};
  try { json = await res.json(); } catch (_) {}
  return { ok: res.ok && json.ok !== false, status: res.status, data: json };
}

export async function getJSON(url, headers = {}) {
  const res = await fetch(url, { headers });
  let json = {};
  try { json = await res.json(); } catch (_) {}
  return { ok: res.ok && json.ok !== false, status: res.status, data: json };
}

export function setBusy(btn, busy, busyText = '처리 중…') {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.textContent;
    btn.textContent = busyText;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.label || btn.textContent;
    btn.disabled = false;
  }
}

export function showMsg(el, text, kind = 'info') {
  if (!el) return;
  const color = kind === 'error' ? 'var(--love)' : kind === 'ok' ? 'var(--hope)' : 'var(--ink-500)';
  el.style.color = color;
  el.textContent = text;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    return ok;
  }
}
