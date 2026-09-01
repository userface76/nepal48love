#!/usr/bin/env node
// 사이트 문구 규정 점검 — 기획서 Ⅴ · XII 항 위반 표현 검사
// 사용: npm run check
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGET_DIR = join(ROOT, 'public');

// 금지 표현 — 정규식과 설명
const BANNED = [
  [/전액\s*기부/g, '"전액 기부" — 참여금 전액이 기부되는 구조가 아닙니다'],
  [/16,?000원\s*전액/g, '"16,000원 전액" — 오해 소지'],
  [/원금\s*(회수|보장)/g, '"원금 회수/보장"'],
  [/손해\s*없/g, '"손해 없음"'],
  [/본전/g, '"본전"'],
  [/돈을?\s*번다/g, '"돈을 번다"'],
  [/수익\s*(보장|배분)/g, '"수익 보장/배분"'],
  [/후원수당/g, '"후원수당" — 방문판매법 용어. 마케팅 문구에 사용 금지'],
  [/무조건\s*(지급|제공)/g, '"무조건 지급/제공"'],
];

// 필수 표현 — index.html 과 join.html 에 있어야 함
const REQUIRED = [
  ['public/index.html', /2,000원이?\s*네팔\s*구호재원/, '"2,000원이 네팔 구호재원으로 조성" 안내'],
  ['public/index.html', /법률검토/, '법률검토 조건부 안내'],
  ['public/index.html', /기부금영수증/, '기부금영수증 구분 안내'],
  ['public/join.html', /2,000원이?\s*네팔\s*구호재원/, '참여 신청 페이지의 구호재원 안내'],
  ['public/join.html', /개인정보\s*수집/, '개인정보 수집 동의 문구'],
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (['.html', '.js', '.md'].includes(extname(p))) out.push(p);
  }
  return out;
}

// "우리가 쓰지 않는 말" 목록, 법률의견 질의서 등 의도적으로 금지어를 인용하는 구간은
// 아래 주석으로 감싸면 검사에서 제외됩니다.
//   <!-- copycheck:ignore-start -->  …  <!-- copycheck:ignore-end -->
const IGNORE_START = /copycheck:ignore-start/;
const IGNORE_END = /copycheck:ignore-end/;

let errors = 0;
let warnings = 0;

console.log('\n▶ 금지 표현 검사\n');
for (const file of walk(TARGET_DIR)) {
  const rel = file.replace(ROOT, '');
  const lines = readFileSync(file, 'utf8').split('\n');
  let ignoring = false;

  lines.forEach((line, i) => {
    if (IGNORE_START.test(line)) { ignoring = true; return; }
    if (IGNORE_END.test(line)) { ignoring = false; return; }
    if (ignoring) return;

    for (const [re, label] of BANNED) {
      re.lastIndex = 0;
      if (!re.test(line)) continue;
      re.lastIndex = 0;
      // 부정문("전액 기부되는 것이 아닙니다", "사용하지 않습니다") 안의 등장은 경고만
      const isDisclaimer = /아닙니다|않습니다|않으며|않고|금지|사용하지/.test(line);
      if (isDisclaimer) {
        warnings++;
        console.log(`  · ${rel}:${i + 1}  ${label} — 부정문 안 (확인 필요)`);
      } else {
        errors++;
        console.log(`  ✕ ${rel}:${i + 1}  ${label}`);
      }
    }
  });
}
if (errors === 0) console.log('  ✓ 금지 표현이 발견되지 않았습니다.');

console.log('\n▶ 필수 표현 검사\n');
for (const [rel, re, label] of REQUIRED) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  if (re.test(text)) {
    console.log(`  ✓ ${rel} — ${label}`);
  } else {
    errors++;
    console.log(`  ✕ ${rel} — ${label} 누락`);
  }
}

console.log(
  `\n결과: 오류 ${errors}건 / 확인필요 ${warnings}건\n` +
  (errors ? '수정 후 다시 실행하세요.\n' : '배포 가능합니다.\n')
);
process.exit(errors ? 1 : 0);
