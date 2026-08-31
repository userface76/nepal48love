import { getJSON, showMsg, won } from './common.js';

const $ = (id) => document.getElementById(id);
const KEY = 'n48_admin_token';
let TOKEN = sessionStorage.getItem(KEY) || '';

const auth = () => ({ authorization: `Bearer ${TOKEN}` });

// ── 인증 ─────────────────────────────────────────────────
async function tryLogin(token) {
  TOKEN = token;
  const res = await fetch('/api/admin/settings', { headers: auth() });
  if (!res.ok) return false;
  sessionStorage.setItem(KEY, token);
  const data = await res.json();
  fillSettings(data.settings || []);
  return true;
}

$('login-btn').onclick = async () => {
  const msg = $('login-msg');
  const token = $('token').value.trim();
  if (!token) return showMsg(msg, '토큰을 입력하세요.', 'error');
  showMsg(msg, '확인 중…');
  if (await tryLogin(token)) enterConsole();
  else showMsg(msg, '인증에 실패했습니다. 토큰을 확인해 주세요.', 'error');
};

$('token').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('login-btn').click(); });

function enterConsole() {
  $('login').classList.add('hidden');
  $('console').classList.remove('hidden');
  $('who').textContent = '인증됨';
  loadSummary();
  loadRows();
}

// 저장된 토큰으로 자동 로그인
(async () => { if (TOKEN && (await tryLogin(TOKEN))) enterConsole(); })();

// ── 요약 ─────────────────────────────────────────────────
async function loadSummary() {
  const { ok, data } = await getJSON('/api/stats');
  if (!ok) return;
  $('s-applied').textContent = won(data.participants.applied);
  $('s-paid').textContent = won(data.participants.paid);
  $('s-pending').textContent = won(data.participants.pending);
  $('s-relief').textContent = `${won(data.relief.raised)}원`;
  $('set-phase').value = data.phase;
  $('set-legal').value = data.legalStatus;
}

// ── 참여자 목록 ──────────────────────────────────────────
const STATUS_BADGE = {
  pending: '<span class="badge pending">대기</span>',
  paid: '<span class="badge paid">확인</span>',
  cancelled: '<span class="badge cancel">취소</span>',
  refunded: '<span class="badge cancel">환불</span>',
};

async function loadRows() {
  const msg = $('rows-msg');
  showMsg(msg, '불러오는 중…');
  const status = $('f-status').value;
  const q = $('f-q').value.trim();
  const { ok, data } = await getJSON(
    `/api/admin/participants?status=${status}&q=${encodeURIComponent(q)}`, auth()
  );
  if (!ok) return showMsg(msg, data.error || '조회 실패', 'error');

  const tbody = $('rows');
  if (!data.rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="muted">해당 조건의 참여자가 없습니다.</td></tr>';
    return showMsg(msg, '');
  }

  tbody.innerHTML = data.rows.map((r) => `
    <tr>
      <td><strong>${r.code}</strong></td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.deposit_name || '')}</td>
      <td class="muted">${esc(r.phone_enc || '')}</td>
      <td class="num">${won(r.amount)}</td>
      <td class="muted">${r.referrer_code || '—'}</td>
      <td class="num">${r.connectedPaid}</td>
      <td>${STATUS_BADGE[r.status] || r.status}</td>
      <td class="muted">${(r.created_at || '').slice(0, 10)}</td>
      <td>
        <div class="row-actions">
          ${r.status !== 'paid' ? `<button class="mini ok" data-code="${r.code}" data-to="paid">입금확인</button>` : ''}
          ${r.status !== 'pending' ? `<button class="mini warn" data-code="${r.code}" data-to="pending">되돌리기</button>` : ''}
          ${r.status !== 'cancelled' ? `<button class="mini" data-code="${r.code}" data-to="cancelled">취소</button>` : ''}
        </div>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('button[data-code]').forEach((btn) => {
    btn.onclick = () => mark(btn.dataset.code, btn.dataset.to);
  });
  showMsg(msg, `${data.rows.length}건 조회`, 'ok');
}

async function mark(code, to) {
  const labels = { paid: '입금 확인', pending: '대기 상태로 되돌리기', cancelled: '취소' };
  if (!confirm(`${code} — ${labels[to]} 처리할까요?`)) return;
  const res = await fetch('/api/admin/participants', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth() },
    body: JSON.stringify({ code, status: to }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) return showMsg($('rows-msg'), data.error || '처리 실패', 'error');
  await Promise.all([loadRows(), loadSummary()]);
}

$('reload').onclick = loadRows;
$('f-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadRows(); });

// ── 설정 저장 ────────────────────────────────────────────
function fillSettings(rows) {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  $('set-transferred').value = map.transferred_amount || '0';
  $('set-transferred-date').value = map.transferred_date || '';
  $('set-product-count').value = map.product_count || '0';
  $('set-product-value').value = map.product_value || '0';
  if (map.phase) $('set-phase').value = map.phase;
  if (map.legal_status) $('set-legal').value = map.legal_status;
}

$('save-settings').onclick = async () => {
  const msg = $('settings-msg');
  const updates = {
    phase: $('set-phase').value,
    legal_status: $('set-legal').value,
    transferred_amount: $('set-transferred').value.replace(/[^0-9]/g, '') || '0',
    transferred_date: $('set-transferred-date').value.trim(),
    product_count: $('set-product-count').value.replace(/[^0-9]/g, '') || '0',
    product_value: $('set-product-value').value.replace(/[^0-9]/g, '') || '0',
  };
  if (updates.phase === 'pilot' && !confirm('참여 신청을 실제로 오픈합니다.\n\n외부 법률의견과 계좌·정산 준비가 끝났는지 확인하셨나요?')) return;

  showMsg(msg, '저장 중…');
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth() },
    body: JSON.stringify({ updates }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) return showMsg(msg, data.error || '저장 실패', 'error');
  showMsg(msg, '저장되었습니다.', 'ok');
  loadSummary();
};

// ── CSV 내려받기 (인증 헤더 필요 → blob 다운로드) ────────
async function download(type) {
  const res = await fetch(`/api/admin/export?type=${type}`, { headers: auth() });
  if (!res.ok) return alert('내려받기에 실패했습니다.');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nepal48-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
$('export-p').onclick = (e) => { e.preventDefault(); download('participants'); };
$('export-w').onclick = (e) => { e.preventDefault(); download('waitlist'); };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
