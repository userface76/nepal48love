// GET /api/admin/export?type=participants|waitlist|ledger — CSV 다운로드 (관리자 전용)
import { bad, clean, requireAdmin } from '../../../lib/util.js';

const QUERIES = {
  participants: `SELECT code, name, phone_enc AS phone, email, referrer_code, amount, relief_amount,
                        deposit_name, status, memo, created_at, paid_at FROM participants ORDER BY created_at DESC`,
  waitlist: `SELECT name, contact, org, kind, message, created_at FROM waitlist ORDER BY created_at DESC`,
  ledger: `SELECT bucket, direction, amount, qty, counterparty, note, occurred_on, created_at
             FROM ledger ORDER BY occurred_on DESC, id DESC`,
};

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const type = clean(new URL(request.url).searchParams.get('type'), 20) || 'participants';
  const sql = QUERIES[type];
  if (!sql) return bad('type 은 participants | waitlist | ledger 중 하나여야 합니다.');

  const { results } = await env.DB.prepare(sql).all();
  const csv = '﻿' + toCsv(results); // 엑셀 한글 깨짐 방지 BOM

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="nepal48-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
