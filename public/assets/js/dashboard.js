import { getJSON, won } from './common.js';

const $ = (id) => document.getElementById(id);

const PHASE_NOTE = {
  proposal: '현재는 <strong>제안 · 법률검토 단계</strong>입니다. 공개 모금을 진행하고 있지 않으며, 아래 수치는 0으로 표시됩니다.',
  waitlist: '현재는 <strong>사전 관심등록 단계</strong>입니다. 참여 신청은 아직 열리지 않았습니다.',
  pilot: '현재 <strong>1차 파일럿(300명)</strong>을 진행 중입니다. 아래 수치는 실시간 집계입니다.',
  closed: '1차 파일럿이 <strong>종료</strong>되었습니다. 최종 결과를 공개합니다.',
};

(async function load() {
  const { ok, data } = await getJSON('/api/stats');
  if (!ok) {
    $('phase-note').textContent = '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return;
  }

  $('phase-note').innerHTML = PHASE_NOTE[data.phase] || PHASE_NOTE.proposal;

  const paid = data.participants.paid;
  const target = data.target || 300;
  $('d-progress').style.width = `${Math.min((paid / target) * 100, 100)}%`;
  $('d-progress-label').textContent = `${won(paid)} / ${won(target)}명`;

  $('d-paid').innerHTML = `${won(paid)}<span class="u">명</span>`;
  $('d-pending').textContent = `입금 대기 ${won(data.participants.pending)}명 · 총 신청 ${won(data.participants.applied)}명`;

  $('d-relief').innerHTML = `${won(data.relief.raised)}<span class="u">원</span>`;
  $('d-transferred').innerHTML = `${won(data.relief.transferred)}<span class="u">원</span>`;
  $('d-transferred-date').textContent = data.relief.transferredDate
    ? `최근 전달일 ${data.relief.transferredDate}`
    : '전달 이력 없음';
  $('d-scheduled').innerHTML = `${won(data.relief.scheduled)}<span class="u">원</span>`;

  $('d-love4').innerHTML = `${won(data.love.love4)}<span class="u">명</span>`;
  $('d-love8').innerHTML = `${won(data.love.love8)}<span class="u">명</span>`;
  $('d-impact').innerHTML = `${won(data.love.impactAttribution)}<span class="u">원</span>`;

  $('d-product').innerHTML = `${won(data.product.count)}<span class="u">개</span>`;
  $('d-product-value').innerHTML = `${won(data.product.value)}<span class="u">원</span>`;

  $('d-updated').textContent = `※ 실제 운영 시 검증된 데이터만 표시합니다. 최종 갱신 ${new Date(data.updatedAt).toLocaleString('ko-KR')}`;
})();
