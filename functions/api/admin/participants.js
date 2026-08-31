// /api/admin/participants — 관리자 전용
//   GET  ?status=pending&q=홍길동   참여자 목록
//   POST { code, status, memo }     입금확인 / 취소 처리
import { json, bad, clean, requireAdmin, logAdmin } from '../../../lib/util.js';

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return bad('DB 미연결', 500);

  const url = new URL(request.url);
  const status = clean(url.searchParams.get('status'), 12);
  const q = clean(url.searchParams.get('q'), 40);
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 500);

  let sql = `SELECT id, code, name, phone_enc, email, referrer_code, amount, relief_amount,
                    deposit_name, status, memo, created_at, paid_at
               FROM participants WHERE 1=1`;
  const binds = [];
  if (status && status !== 'all') { sql += ' AND status = ?'; binds.push(status); }
  if (q) {
    sql += ' AND (name LIKE ? OR deposit_name LIKE ? OR phone_enc LIKE ? OR code = ?)';
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`, q.toUpperCase());
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  binds.push(limit);

  const { results } = await env.DB.prepare(sql).bind(...binds).all();

  // 각 참여자가 연결한 입금완료 인원 수
  const { results: refCounts } = await env.DB
    .prepare(`SELECT referrer_code AS code, COUNT(*) AS n FROM participants
               WHERE status='paid' AND referrer_code IS NOT NULL GROUP BY referrer_code`)
    .all();
  const refMap = Object.fromEntries(refCounts.map((r) => [r.code, r.n]));

  return json({
    ok: true,
    rows: results.map((r) => ({ ...r, connectedPaid: refMap[r.code] || 0 })),
  });
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return bad('DB 미연결', 500);

  let body;
  try { body = await request.json(); } catch { return bad('잘못된 요청'); }

  const code = clean(body.code, 12).toUpperCase();
  const status = clean(body.status, 12);
  const memo = clean(body.memo, 200);
  const allowed = ['pending', 'paid', 'cancelled', 'refunded'];
  if (!code) return bad('code 가 필요합니다.');
  if (!allowed.includes(status)) return bad('허용되지 않는 상태값입니다.');

  const cur = await env.DB.prepare('SELECT status FROM participants WHERE code = ?').bind(code).first();
  if (!cur) return bad('참여자를 찾을 수 없습니다.', 404);

  if (status === 'paid') {
    await env.DB
      .prepare("UPDATE participants SET status='paid', paid_at=datetime('now'), memo=? WHERE code=?")
      .bind(memo || null, code).run();
    // 자금 원장 A(구호재원) / B(사업재원) 자동 기록
    const p = await env.DB
      .prepare('SELECT id, amount, relief_amount FROM participants WHERE code=?').bind(code).first();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO ledger (bucket, direction, amount, counterparty, participant_id, note, occurred_on)
         VALUES ('A','in',?,'참가자',?,?,date('now'))`
      ).bind(p.relief_amount, p.id, `${code} 구호재원`),
      env.DB.prepare(
        `INSERT INTO ledger (bucket, direction, amount, counterparty, participant_id, note, occurred_on)
         VALUES ('B','in',?,'참가자',?,?,date('now'))`
      ).bind(p.amount - p.relief_amount, p.id, `${code} 사업재원`),
    ]);
  } else if (status === 'cancelled' || status === 'refunded') {
    await env.DB
      .prepare("UPDATE participants SET status=?, cancelled_at=datetime('now'), memo=? WHERE code=?")
      .bind(status, memo || null, code).run();
  } else {
    await env.DB
      .prepare("UPDATE participants SET status='pending', paid_at=NULL, memo=? WHERE code=?")
      .bind(memo || null, code).run();
  }

  await logAdmin(env.DB, 'admin', `status:${cur.status}->${status}`, code, memo);
  return json({ ok: true });
}
