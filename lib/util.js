// ============================================================
// NEPAL 48 LOVE — 공용 유틸 (Cloudflare Pages Functions 에서 import)
// ============================================================

export const ENTRY_FEE_DEFAULT = 16000;
export const RELIEF_DEFAULT = 2000;

/** JSON 응답 */
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function bad(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

/** SHA-256 hex */
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 연락처 해시 (중복 참여 확인용) */
export async function hashPhone(phone, salt) {
  return sha256(`${salt}::${normalizePhone(phone)}`);
}

/** 숫자만 남긴 전화번호 */
export function normalizePhone(v) {
  return String(v || '').replace(/[^0-9]/g, '');
}

export function isValidPhone(v) {
  const p = normalizePhone(v);
  return p.length >= 9 && p.length <= 11;
}

export function isValidEmail(v) {
  if (!v) return true; // 선택 항목
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v));
}

/** 사람이 읽고 옮겨 적기 쉬운 추천코드 (혼동문자 제외) */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

/** 중복 없는 추천코드 발급 */
export async function issueUniqueCode(db, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const code = makeCode(6);
    const row = await db.prepare('SELECT 1 FROM participants WHERE code = ?').bind(code).first();
    if (!row) return code;
  }
  throw new Error('CODE_ISSUE_FAILED');
}

/** 입력 문자열 정리 */
export function clean(v, max = 200) {
  return String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

/** 관리자 토큰 확인 — Authorization: Bearer <ADMIN_TOKEN> */
export function requireAdmin(request, env) {
  const token = (env.ADMIN_TOKEN || '').trim();
  if (!token) return bad('ADMIN_TOKEN 이 설정되지 않았습니다.', 500);
  const header = request.headers.get('authorization') || '';
  const given = header.replace(/^Bearer\s+/i, '').trim();
  if (!given || given !== token) return bad('인증 실패', 401);
  return null; // 통과
}

/** Cloudflare Turnstile 검증 (TURNSTILE_SECRET 미설정 시 통과) */
export async function verifyTurnstile(token, env, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = await res.json();
  return !!data.success;
}

/** 간단 레이트리밋 — 같은 IP 가 짧은 시간에 반복 제출하는 것을 차단 */
export async function rateLimit(env, key, limit = 5, windowSec = 300) {
  if (!env.RATE_KV) return true; // KV 미바인딩이면 통과
  const now = Math.floor(Date.now() / 1000);
  const raw = await env.RATE_KV.get(key);
  const hits = raw ? JSON.parse(raw).filter((t) => now - t < windowSec) : [];
  if (hits.length >= limit) return false;
  hits.push(now);
  await env.RATE_KV.put(key, JSON.stringify(hits), { expirationTtl: windowSec });
  return true;
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || '0.0.0.0';
}

export function maskName(name) {
  const n = String(name || '');
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + '○';
  return n[0] + '○'.repeat(n.length - 2) + n[n.length - 1];
}

export function won(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

export async function logAdmin(db, actor, action, target, detail) {
  try {
    await db
      .prepare('INSERT INTO admin_log (actor, action, target, detail) VALUES (?, ?, ?, ?)')
      .bind(actor || 'admin', action, target || '', detail || '')
      .run();
  } catch (_) { /* 로깅 실패는 무시 */ }
}
