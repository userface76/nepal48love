import { postJSON, getJSON, setBusy, showMsg, copyText, won } from './common.js';

const $ = (id) => document.getElementById(id);

// ── 캠페인 단계 확인 ─────────────────────────────────────
(async function boot() {
  const { ok, data } = await getJSON('/api/stats');
  const phase = ok ? data.phase : 'proposal';
  if (phase === 'pilot') $('apply-section').classList.remove('hidden');
  else $('closed-notice').classList.remove('hidden');
})();

// ── 추천코드 자동 입력 (?ref=CODE) ───────────────────────
const params = new URLSearchParams(location.search);
const refFromUrl = (params.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
if (refFromUrl) {
  const el = $('a-ref');
  if (el) {
    el.value = refFromUrl;
    $('ref-hint').textContent = '소개해주신 분의 코드가 자동으로 입력되었습니다.';
  }
}

// ── 전화번호 입력 정리 ───────────────────────────────────
$('a-phone')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

// ── 신청 제출 ────────────────────────────────────────────
$('apply-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const result = $('a-result');
  showMsg(result, '');

  const name = $('a-name');
  const phone = $('a-phone');
  let valid = true;

  const invalidate = (el, cond) => {
    const f = el.closest('.field');
    if (cond) { f.classList.add('invalid'); valid = false; } else f.classList.remove('invalid');
  };
  invalidate(name, !name.value.trim());
  invalidate(phone, phone.value.replace(/[^0-9]/g, '').length < 9);

  if (!$('a-privacy').checked || !$('a-terms').checked) {
    showMsg(result, '필수 동의 항목을 확인해 주세요.', 'error');
    valid = false;
  }
  if (!valid) return;

  const btn = e.target.querySelector('button[type="submit"]');
  setBusy(btn, true, '신청 중…');

  const { ok, data } = await postJSON('/api/apply', {
    name: name.value,
    phone: phone.value,
    email: $('a-email').value,
    depositName: $('a-deposit').value,
    referrerCode: $('a-ref').value,
    consentPrivacy: true,
    consentTerms: true,
    consentMarketing: $('a-marketing').checked,
  });

  setBusy(btn, false);

  if (!ok) {
    if (data.duplicated) {
      showMsg(result, `${data.error} (내 추천코드: ${data.code})`, 'error');
    } else {
      showMsg(result, data.error || '신청에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    }
    return;
  }

  renderDone(data);
});

// ── 신청 완료 화면 ───────────────────────────────────────
function renderDone(data) {
  $('apply-section').classList.add('hidden');
  $('done-section').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  $('done-greeting').innerHTML = data.referrerName
    ? `<strong>${escapeHtml(data.referrerName)}</strong> 님의 소개로 함께하게 되셨습니다. 아래 계좌로 입금해 주시면 참여가 확정됩니다.`
    : '아래 계좌로 입금해 주시면 참여가 확정됩니다.';

  $('bank-amount').textContent = `${won(data.amount)}원`;
  $('bank-name').textContent = data.bank.name || '—';
  $('bank-account').textContent = data.bank.account || '—';
  $('bank-holder').textContent = data.bank.holder || '—';
  $('bank-depositor').textContent = data.depositName || '—';
  $('my-code').textContent = data.code;

  const link = `${location.origin}/join.html?ref=${data.code}`;
  $('my-link').value = link;
  $('go-my').href = `/my.html?code=${data.code}`;

  const bankText =
    `[NEPAL 48 LOVE CHALLENGE 참여금 입금 안내]\n` +
    `금액: ${won(data.amount)}원\n` +
    `${data.bank.name} ${data.bank.account}\n` +
    `예금주: ${data.bank.holder}\n` +
    `입금자명: ${data.depositName}\n` +
    `내 추천코드: ${data.code}`;

  const msg = $('copy-result');
  $('copy-account').onclick = async () => {
    showMsg(msg, (await copyText(data.bank.account)) ? '계좌번호를 복사했습니다.' : '복사에 실패했습니다.', 'ok');
  };
  $('copy-all').onclick = async () => {
    showMsg(msg, (await copyText(bankText)) ? '입금정보를 복사했습니다.' : '복사에 실패했습니다.', 'ok');
  };
  $('copy-link').onclick = async () => {
    showMsg(msg, (await copyText(link)) ? '초대 링크를 복사했습니다.' : '복사에 실패했습니다.', 'ok');
  };
  $('share-link').onclick = async () => {
    const text = '16,000원으로 시작하는 작은 사회공헌, 네팔 구호 캠페인에 함께해요.';
    if (navigator.share) {
      try { await navigator.share({ title: 'NEPAL 48 LOVE CHALLENGE', text, url: link }); } catch (_) {}
    } else {
      showMsg(msg, (await copyText(`${text}\n${link}`)) ? '공유 문구를 복사했습니다.' : '복사에 실패했습니다.', 'ok');
    }
  };

  // 새로고침해도 코드가 사라지지 않도록 URL 갱신
  history.replaceState(null, '', `/join.html?done=${data.code}`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
