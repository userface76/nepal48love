import { getJSON, setBusy, showMsg, copyText, won } from './common.js';

const $ = (id) => document.getElementById(id);

const STATUS_LABEL = {
  pending: '입금 대기중',
  paid: '참여 확정 (입금 확인)',
  cancelled: '취소됨',
  refunded: '환불됨',
};

// URL 의 code 를 미리 채워줍니다.
const preCode = (new URLSearchParams(location.search).get('code') || '').toUpperCase();
if (preCode) $('q-code').value = preCode;

$('q-last4')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

$('lookup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('q-result');
  showMsg(msg, '');

  const code = $('q-code').value.trim().toUpperCase();
  const last4 = $('q-last4').value.trim();
  if (!code || last4.length !== 4) {
    showMsg(msg, '추천코드와 휴대전화 뒤 4자리를 모두 입력해 주세요.', 'error');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  setBusy(btn, true, '조회 중…');
  const { ok, data } = await getJSON(`/api/status?code=${encodeURIComponent(code)}&last4=${last4}`);
  setBusy(btn, false);

  if (!ok) {
    showMsg(msg, data.error || '조회에 실패했습니다.', 'error');
    return;
  }
  render(data);
});

function render(d) {
  $('lookup-card').classList.add('hidden');
  $('status-view').classList.remove('hidden');

  $('v-stage').textContent = d.stage;
  $('v-name').textContent = `${d.me.name} 님`;
  $('v-status').textContent = STATUS_LABEL[d.me.status] || d.me.status;
  $('v-code').textContent = d.me.code;

  const paid = d.connected.paid;
  $('v-paid').innerHTML = `${paid}<span class="u">명</span>`;
  $('v-pending').innerHTML = `${d.connected.pending}<span class="u">명</span>`;
  $('v-impact').innerHTML = `${won(d.loveImpact)}<span class="u">원</span>`;

  const target = d.nextTarget || 8;
  const pct = Math.min((paid / target) * 100, 100);
  $('v-progress').style.width = `${pct}%`;
  $('v-progress-label').textContent = `입금 확인된 연결 ${paid}명`;
  $('v-progress-target').textContent = d.nextTarget
    ? `다음 단계: LOVE ${d.nextTarget} (${Math.max(d.nextTarget - paid, 0)}명 남음)`
    : 'LOVE 8 달성 🎉';

  const link = `${location.origin}/join.html?ref=${d.me.code}`;
  $('v-link').value = link;

  const msg = $('v-copy-msg');
  $('v-copy').onclick = async () => {
    showMsg(msg, (await copyText(link)) ? '링크를 복사했습니다.' : '복사에 실패했습니다.', 'ok');
  };
  $('v-share').onclick = async () => {
    const text = '16,000원으로 시작하는 작은 사회공헌, 네팔 구호 캠페인에 함께해요.';
    if (navigator.share) {
      try { await navigator.share({ title: 'NEPAL 48 LOVE CHALLENGE', text, url: link }); } catch (_) {}
    } else {
      showMsg(msg, (await copyText(`${text}\n${link}`)) ? '공유 문구를 복사했습니다.' : '복사에 실패했습니다.', 'ok');
    }
  };

  const tbody = $('v-list');
  if (!d.connected.list.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="muted">아직 연결된 참여자가 없습니다.</td></tr>';
  } else {
    tbody.innerHTML = d.connected.list
      .map((r) => {
        const cls = r.status === 'paid' ? 'paid' : 'pending';
        const label = r.status === 'paid' ? '참여 확정' : '입금 대기';
        return `<tr><td>${r.name}</td><td><span class="badge ${cls}">${label}</span></td><td class="muted">${(r.createdAt || '').slice(0, 10)}</td></tr>`;
      })
      .join('');
  }
}
