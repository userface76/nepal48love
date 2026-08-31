// GET /api/status?code=XXXXXX&last4=1234 — 내 LOVE 현황
// 추천코드 + 휴대전화 뒤 4자리로 본인 확인합니다.
import { json, bad, clean, maskName } from '../../lib/util.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return bad('데이터베이스가 연결되지 않았습니다.', 500);

  const url = new URL(request.url);
  const code = clean(url.searchParams.get('code'), 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const last4 = clean(url.searchParams.get('last4'), 4).replace(/[^0-9]/g, '');

  if (!code || last4.length !== 4) return bad('추천코드와 휴대전화 뒤 4자리를 입력해 주세요.');

  const me = await env.DB
    .prepare('SELECT code, name, phone_enc, status, amount, relief_amount, created_at, paid_at FROM participants WHERE code = ?')
    .bind(code)
    .first();

  if (!me || !String(me.phone_enc).endsWith(last4)) {
    return bad('일치하는 참여 정보를 찾을 수 없습니다.', 404);
  }

  // 내가 연결한 사람들
  const { results: invited } = await env.DB
    .prepare(
      `SELECT name, status, created_at FROM participants
        WHERE referrer_code = ? AND status IN ('pending','paid')
        ORDER BY created_at ASC`
    )
    .bind(code)
    .all();

  const paidCount = invited.filter((r) => r.status === 'paid').length;
  const pendingCount = invited.filter((r) => r.status === 'pending').length;

  // LOVE 단계 — 입금이 확인된(paid) 연결만 인정합니다.
  let stage = 'LOVE START';
  if (paidCount >= 8) stage = 'LOVE 8';
  else if (paidCount >= 4) stage = 'LOVE 4';

  const reliefPer = Number(me.relief_amount || 2000);

  return json({
    ok: true,
    me: {
      code: me.code,
      name: me.name,
      status: me.status,
      amount: me.amount,
      relief: reliefPer,
      createdAt: me.created_at,
      paidAt: me.paid_at,
    },
    stage,
    connected: {
      paid: paidCount,
      pending: pendingCount,
      list: invited.map((r) => ({
        name: maskName(r.name),
        status: r.status,
        createdAt: r.created_at,
      })),
    },
    // LOVE IMPACT — 내가 연결한 사람들이 만든 '구호재원' (내 참여금은 제외)
    loveImpact: paidCount * reliefPer,
    nextTarget: paidCount >= 8 ? null : paidCount >= 4 ? 8 : 4,
  });
}
