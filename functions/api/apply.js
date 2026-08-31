// POST /api/apply — 캠페인 참여 신청 (계좌이체 방식)
// 신청 시점에는 status = 'pending'. 관리자가 입금을 확인하면 'paid' 로 전환됩니다.
import {
  json, bad, clean, sha256, hashPhone, normalizePhone, isValidPhone, isValidEmail,
  issueUniqueCode, verifyTurnstile, rateLimit, clientIp,
  ENTRY_FEE_DEFAULT, RELIEF_DEFAULT,
} from '../../lib/util.js';

export async function onRequestPost({ request, env }) {
  // ── 0) 캠페인 단계 확인 ────────────────────────────────
  if (!env.DB) return bad('데이터베이스가 연결되지 않았습니다.', 500);

  const phaseRow = await env.DB
    .prepare("SELECT value FROM public_stats WHERE key = 'phase'")
    .first();
  const phase = phaseRow?.value || env.CAMPAIGN_PHASE || 'proposal';
  if (phase !== 'pilot') {
    return bad('현재는 참여 신청을 받고 있지 않습니다. 사전 관심등록을 이용해 주세요.', 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('잘못된 요청 형식입니다.');
  }

  const ip = clientIp(request);
  if (!(await rateLimit(env, `ap:${ip}`, 5, 600))) {
    return bad('잠시 후 다시 시도해 주세요.', 429);
  }
  if (!(await verifyTurnstile(body.turnstileToken, env, ip))) {
    return bad('자동입력 방지 확인에 실패했습니다.');
  }

  // ── 1) 입력 검증 ──────────────────────────────────────
  const name = clean(body.name, 30);
  const phone = normalizePhone(body.phone);
  const email = clean(body.email, 80);
  const depositName = clean(body.depositName, 30) || name;
  const referrerCodeRaw = clean(body.referrerCode, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!name) return bad('이름을 입력해 주세요.');
  if (!isValidPhone(phone)) return bad('휴대전화 번호를 정확히 입력해 주세요.');
  if (!isValidEmail(email)) return bad('이메일 형식을 확인해 주세요.');
  if (!body.consentPrivacy) return bad('개인정보 수집·이용 동의가 필요합니다.');
  if (!body.consentTerms) return bad('캠페인 참여 안내 확인이 필요합니다.');

  const salt = env.HASH_SALT || 'nepal48love-dev-salt';
  const phoneHash = await hashPhone(phone, salt);

  // ── 2) 중복 신청 확인 ─────────────────────────────────
  const dup = await env.DB
    .prepare('SELECT code, status FROM participants WHERE phone_hash = ?')
    .bind(phoneHash)
    .first();
  if (dup) {
    return json({
      ok: false,
      duplicated: true,
      code: dup.code,
      status: dup.status,
      error: '이미 신청하신 연락처입니다. 내 LOVE 현황에서 확인해 주세요.',
    }, 409);
  }

  // ── 3) 추천인 확인 (없거나 잘못돼도 신청은 성립) ────────
  let referrerCode = null;
  let referrerName = null;
  if (referrerCodeRaw) {
    const ref = await env.DB
      .prepare("SELECT code, name FROM participants WHERE code = ? AND status IN ('pending','paid')")
      .bind(referrerCodeRaw)
      .first();
    if (ref) {
      referrerCode = ref.code;
      referrerName = ref.name;
    }
  }

  // ── 4) 저장 ───────────────────────────────────────────
  const code = await issueUniqueCode(env.DB);
  const entryFee = Number(env.ENTRY_FEE || ENTRY_FEE_DEFAULT);
  const relief = Number(env.RELIEF_PER_PERSON || RELIEF_DEFAULT);

  await env.DB.prepare(
    `INSERT INTO participants
       (code, name, phone_hash, phone_enc, email, referrer_code, amount, relief_amount,
        deposit_name, status, consent_privacy, consent_terms, consent_marketing)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, 1, ?)`
  )
    .bind(
      code, name, phoneHash, phone, email || null, referrerCode,
      entryFee, relief, depositName, body.consentMarketing ? 1 : 0
    )
    .run();

  // 신청 조회용 토큰 (연락처 뒤 4자리 + code 로 본인확인)
  const lookupKey = await sha256(`${code}:${phone.slice(-4)}`);

  return json({
    ok: true,
    code,
    lookupKey,
    referrerName,
    amount: entryFee,
    relief,
    bank: {
      name: env.BANK_NAME || '',
      account: env.BANK_ACCOUNT || '',
      holder: env.BANK_HOLDER || '',
    },
    depositName,
    message: '신청이 접수되었습니다. 입금이 확인되면 문자로 안내드립니다.',
  });
}
