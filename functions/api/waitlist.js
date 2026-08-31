// POST /api/waitlist — 사전 관심등록
import { json, bad, clean, verifyTurnstile, rateLimit, clientIp } from '../../lib/util.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad('잘못된 요청 형식입니다.');
  }

  const ip = clientIp(request);
  if (!(await rateLimit(env, `wl:${ip}`, 5, 600))) {
    return bad('잠시 후 다시 시도해 주세요.', 429);
  }
  if (!(await verifyTurnstile(body.turnstileToken, env, ip))) {
    return bad('자동입력 방지 확인에 실패했습니다.');
  }

  const name = clean(body.name, 40);
  const contact = clean(body.contact, 80);
  const org = clean(body.org, 60);
  const message = clean(body.message, 500);
  const kind = ['citizen', 'corporate', 'ngo', 'press'].includes(body.kind) ? body.kind : 'citizen';

  if (!name) return bad('이름을 입력해 주세요.');
  if (!contact) return bad('연락처 또는 이메일을 입력해 주세요.');
  if (!body.consent) return bad('개인정보 수집·이용 동의가 필요합니다.');

  if (!env.DB) return bad('데이터베이스가 연결되지 않았습니다.', 500);

  await env.DB.prepare(
    'INSERT INTO waitlist (name, contact, org, kind, message) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(name, contact, org, kind, message)
    .run();

  return json({ ok: true, message: '사전 관심등록이 완료되었습니다.' });
}
