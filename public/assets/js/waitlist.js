import { postJSON, setBusy, showMsg } from './common.js';

const form = document.getElementById('waitlist-form');
if (form) {
  const result = document.getElementById('w-result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMsg(result, '');

    const name = form.querySelector('#w-name');
    const contact = form.querySelector('#w-contact');
    let valid = true;

    for (const el of [name, contact]) {
      const field = el.closest('.field');
      if (!el.value.trim()) { field.classList.add('invalid'); valid = false; }
      else field.classList.remove('invalid');
    }
    if (!form.querySelector('#w-consent').checked) {
      showMsg(result, '개인정보 수집·이용에 동의해 주세요.', 'error');
      valid = false;
    }
    if (!valid) return;

    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, '등록 중…');

    const { ok, data } = await postJSON('/api/waitlist', {
      kind: form.querySelector('#w-kind').value,
      name: name.value,
      contact: contact.value,
      org: form.querySelector('#w-org').value,
      message: form.querySelector('#w-message').value,
      consent: true,
    });

    setBusy(btn, false);

    if (ok) {
      form.reset();
      showMsg(result, '감사합니다. 캠페인이 열리면 가장 먼저 안내드리겠습니다.', 'ok');
    } else {
      showMsg(result, data.error || '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    }
  });
}
