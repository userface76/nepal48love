// /api/admin/settings — 공개 대시보드 수기 항목 & 캠페인 단계
//   GET  현재값
//   POST { key, value } 또는 { updates: {key: value, ...} }
import { json, bad, clean, requireAdmin, logAdmin } from '../../../lib/util.js';

const ALLOWED_KEYS = [
  'transferred_amount', 'transferred_date',
  'product_count', 'product_value',
  'phase', 'legal_status',
];

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const { results } = await env.DB.prepare('SELECT key, value, updated_at FROM public_stats').all();
  return json({ ok: true, settings: results });
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); } catch { return bad('잘못된 요청'); }

  const updates = body.updates || (body.key ? { [body.key]: body.value } : null);
  if (!updates || typeof updates !== 'object') return bad('업데이트할 항목이 없습니다.');

  const stmts = [];
  for (const [k, v] of Object.entries(updates)) {
    if (!ALLOWED_KEYS.includes(k)) return bad(`허용되지 않는 항목: ${k}`);
    stmts.push(
      env.DB.prepare(
        `INSERT INTO public_stats (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
      ).bind(k, clean(v, 60))
    );
  }
  await env.DB.batch(stmts);
  await logAdmin(env.DB, 'admin', 'settings', Object.keys(updates).join(','), JSON.stringify(updates));
  return json({ ok: true });
}
