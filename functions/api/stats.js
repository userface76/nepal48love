// GET /api/stats — 공개 투명성 대시보드용 집계
// ※ 검증된 값만 노출합니다. 입금 확인(paid)된 건만 구호재원으로 집계합니다.
import { json, bad } from '../../lib/util.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return bad('데이터베이스가 연결되지 않았습니다.', 500);

  const totals = await env.DB
    .prepare(
      `SELECT
         COUNT(*)                                            AS applied,
         SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END)      AS paid,
         SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END)   AS pending,
         COALESCE(SUM(CASE WHEN status='paid' THEN relief_amount ELSE 0 END), 0) AS relief_total,
         COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END), 0)        AS entry_total
       FROM participants`
    )
    .first();

  // LOVE 4 / LOVE 8 달성자 — 입금 확인된 연결 기준
  const { results: byRef } = await env.DB
    .prepare(
      `SELECT referrer_code AS code, COUNT(*) AS n
         FROM participants
        WHERE status='paid' AND referrer_code IS NOT NULL
        GROUP BY referrer_code`
    )
    .all();

  const love4 = byRef.filter((r) => r.n >= 4).length;
  const love8 = byRef.filter((r) => r.n >= 8).length;
  // Impact Attribution — 총 모금액과 합산하지 않는 별도 지표
  const loveImpact = byRef
    .filter((r) => r.n >= 8)
    .reduce((sum, r) => sum + Math.min(r.n, 8) * 2000, 0);

  const { results: statRows } = await env.DB.prepare('SELECT key, value FROM public_stats').all();
  const manual = Object.fromEntries(statRows.map((r) => [r.key, r.value]));

  const reliefTotal = Number(totals.relief_total || 0);
  const transferred = Number(manual.transferred_amount || 0);

  return json({
    ok: true,
    phase: manual.phase || 'proposal',
    legalStatus: manual.legal_status || 'review',
    target: Number(env.PILOT_TARGET || 300),
    participants: {
      applied: Number(totals.applied || 0),
      paid: Number(totals.paid || 0),
      pending: Number(totals.pending || 0),
    },
    relief: {
      raised: reliefTotal,           // 조성된 네팔 구호재원 (입금 확인 기준)
      transferred,                   // 다일공동체 전달 완료
      scheduled: Math.max(reliefTotal - transferred, 0), // 전달 예정
      transferredDate: manual.transferred_date || '',
    },
    entryTotal: Number(totals.entry_total || 0),
    love: { love4, love8, impactAttribution: loveImpact },
    product: {
      count: Number(manual.product_count || 0),
      value: Number(manual.product_value || 0),
    },
    updatedAt: new Date().toISOString(),
  });
}
