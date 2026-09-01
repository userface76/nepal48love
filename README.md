# NEPAL 48 LOVE CHALLENGE

> 네 사람의 사랑에서, 여덟 사람의 희망으로.
> 시민참여형 네팔 긴급구호 · 사회공헌 프로젝트 사이트

GitHub + Cloudflare Pages + Cloudflare D1 로 동작하는 캠페인 사이트입니다.
서버 관리 없이 무료 티어 안에서 운영할 수 있고, 파일럿 300명 규모에는 넉넉합니다.

---

## 1. 무엇이 들어있나

| 페이지 | 경로 | 공개 여부 | 설명 |
|---|---|---|---|
| 제안서 사이트 | `/` | 공개 | 다일공동체·닥터힐러 설득용. 기획서 전 내용을 웹으로 재구성 + 사전 관심등록 폼 |
| 참여 신청 | `/join.html` | 단계 제어 | 신청 → 추천코드 발급 → 계좌이체 안내. `phase = pilot` 일 때만 열림 |
| 내 LOVE 현황 | `/my.html` | 링크 공유 | 추천코드 + 휴대폰 뒤 4자리로 조회. LOVE 4 / 8 진행률 |
| 투명성 대시보드 | `/dashboard.html` | 공개 | 참여자 수, 구호재원, 전달 현황, 기업 후원 |
| 운영 관리 | `/admin.html` | 토큰 인증 | 입금 대조, 상태 변경, 공개 수치 입력, CSV 내려받기 |

API (Cloudflare Pages Functions)

```
POST /api/waitlist              사전 관심등록
POST /api/apply                 참여 신청 (phase=pilot 일 때만)
GET  /api/status                내 LOVE 현황
GET  /api/stats                 공개 집계 (대시보드)
GET  /api/admin/participants    참여자 목록      [ADMIN]
POST /api/admin/participants    입금확인/취소     [ADMIN]
GET  /api/admin/settings        공개 수치 조회    [ADMIN]
POST /api/admin/settings        공개 수치 저장    [ADMIN]
GET  /api/admin/export          CSV 내려받기      [ADMIN]
```

---

## 2. 배포 순서 (처음 한 번)

### 2-1. GitHub 저장소 만들기

1. GitHub → **New repository** → 이름 `nepal48love` → **Private** 선택 → Create
2. 이 폴더에서 터미널을 열고:

```bash
git init
git add .
git commit -m "NEPAL 48 LOVE 캠페인 사이트 초기 커밋"
git branch -M main
git remote add origin https://github.com/<본인계정>/nepal48love.git
git push -u origin main
```

> 공개 저장소로 만들어도 되지만, 계좌번호·운영 문구가 확정되기 전까지는 **Private 권장**입니다.
> `.gitignore` 에 의해 `.dev.vars`(비밀값)는 절대 올라가지 않습니다.

### 2-2. Cloudflare D1 데이터베이스 만들기

```bash
npm install
npx wrangler login              # 브라우저에서 Cloudflare 계정 인증
npx wrangler d1 create nepal48love
```

출력에 나오는 `database_id` 를 **`wrangler.toml` 의 `database_id`** 자리에 붙여넣습니다.

이어서 테이블을 만듭니다.

```bash
npx wrangler d1 execute nepal48love --file=./schema.sql --remote
```

### 2-3. Cloudflare Pages 프로젝트 연결

1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 방금 만든 `nepal48love` 저장소 선택
3. 빌드 설정
   - Framework preset: **None**
   - Build command: **(비워둠)**
   - Build output directory: **`public`**
4. **Save and Deploy**

배포가 끝나면 `https://nepal48love.pages.dev` 같은 주소가 생깁니다.

### 2-4. D1 바인딩 연결 (중요)

Pages 프로젝트 → **Settings** → **Bindings** → **Add** → **D1 database**

- Variable name: **`DB`**
- D1 database: **`nepal48love`**

Production / Preview 양쪽 모두 추가하고 저장합니다.

### 2-5. 환경변수 · 시크릿 등록

Pages 프로젝트 → **Settings** → **Variables and Secrets**

**일반 변수 (Plaintext)**

| 이름 | 값 예시 |
|---|---|
| `CAMPAIGN_PHASE` | `proposal` |
| `ENTRY_FEE` | `16000` |
| `RELIEF_PER_PERSON` | `2000` |
| `PILOT_TARGET` | `300` |
| `BANK_NAME` | `국민은행` |
| `BANK_ACCOUNT` | `000000-00-000000` |
| `BANK_HOLDER` | `주식회사 메타매직` |

**시크릿 (Secret — 값이 가려지는 종류)**

| 이름 | 설명 |
|---|---|
| `ADMIN_TOKEN` | `/admin.html` 로그인 토큰. 아래 명령으로 강한 값을 만드세요 |
| `HASH_SALT` | 연락처 해시용. 한 번 정하면 **절대 바꾸지 마세요** (중복확인이 깨집니다) |
| `TURNSTILE_SECRET` | (선택) 스팸 방지용. 비워두면 검증을 건너뜁니다 |

```bash
# 강한 랜덤값 만들기
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

변수를 바꾼 뒤에는 **Deployments → Retry deployment** 로 한 번 재배포해야 반영됩니다.

### 2-6. 도메인 연결 (선택)

Pages 프로젝트 → **Custom domains** → **Set up a domain**

- 도메인을 Cloudflare 에서 샀거나 네임서버를 Cloudflare 로 옮겼다면 클릭 몇 번으로 끝납니다.
- 다른 곳(가비아·후이즈 등)에서 산 도메인이라면, 안내되는 **CNAME 레코드**를 그 업체 DNS 관리에 추가하면 됩니다.
- 추천 도메인 형태: `nepal48.love` · `48love.kr` · `nepal48love.org`

---

## 3. 로컬에서 미리 보기

```bash
npm install
cp .dev.vars.example .dev.vars      # 값을 채워넣기
npx wrangler d1 execute nepal48love --file=./schema.sql --local
npm run dev
```

`http://localhost:8788` 에서 확인할 수 있습니다.

---

## 4. 운영 흐름

```
[1] proposal   제안서 사이트만 공개. 참여 신청 불가. 사전 관심등록만 수집
      ↓  외부 법률의견 수령 (XXVIII 컴플라이언스 게이트 — docs/LEGAL-CHECKLIST.md)
[2] waitlist   구조 확정. 계좌·정산·CS 준비
      ↓  admin.html 에서 phase 를 pilot 으로 변경
[3] pilot      참여 신청 오픈 (300명 목표)
      ↓
[4] closed     정산 · 다일공동체 전달 · Social Impact Report
```

### 매일 하는 일 (파일럿 기간)

1. 은행 앱에서 입금 내역 확인
2. `/admin.html` → 상태 `입금 대기` 로 조회
3. 입금자명이 일치하면 **입금확인** 버튼 클릭
   - 자동으로 자금원장에 A(구호재원 2,000원) / B(사업재원 14,000원) 이 분리 기록됩니다
   - 그 참여자를 소개한 사람의 LOVE 4 / LOVE 8 카운트가 즉시 올라갑니다
4. 참여자에게 확정 안내 문자 발송

### 구호재원을 다일공동체에 전달한 뒤

`/admin.html` → **공개 대시보드 수기 항목** → 전달완료 금액 · 전달일 입력 → 저장
→ `/dashboard.html` 에 즉시 공개됩니다.

### 함께하는 기업(협력기업) 추가하기

사이트에 노출되는 협력기업 카드는 **`public/data/partners.json` 한 파일**로 관리합니다.
HTML 을 고칠 필요가 없고, 저장 후 배포하면 제안서 사이트(`/#supporters`)와
투명성 대시보드(`/dashboard.html`) 양쪽에 함께 반영됩니다.

```json
{
  "name": "회사명",
  "role": "제품 후원",
  "blurb": "이 기업이 무엇으로 시민을 응원하는지 한 줄",
  "url": "https://회사홈페이지",
  "logo": "/assets/img/회사-logo.png",
  "status": "confirmed"
}
```

| 항목 | 설명 |
|---|---|
| `url` | 비워두면 링크 없이 "링크 준비 중" 으로 표시됩니다 |
| `logo` | 비워두면 회사명 첫 글자로 표시됩니다. 이미지 파일은 `public/assets/img/` 에 영문 파일명으로 |
| `status` | `confirmed` → 초록 "함께하는 중" / `talking` → 노랑 "협의 중" |

**협의가 끝나지 않은 기업을 `confirmed` 로 올리지 마세요.** 확정 전 후원사 표기는
기업과의 신뢰 문제이면서 표시광고 이슈가 됩니다.

목록 맨 뒤의 **"우리 회사도 응원하기"** 카드는 자동으로 붙으며 문의 폼으로 연결됩니다.

---

## 5. 지켜야 할 문구 원칙 (기획서 Ⅴ · XII)

사이트 문구를 수정할 때 아래를 반드시 지켜주세요.

**쓰지 않는 표현**

- ❌ "16,000원 전액 기부"
- ❌ "원금 회수" · "손해 없음" · "본전 보장"
- ❌ "8명만 모집하면 돈 번다"

**정확한 표현**

- ✅ "16,000원 캠페인 참여금 중 2,000원이 네팔 구호재원으로 조성됩니다"
- ✅ LOVE 4 · LOVE 8 리워드는 "외부 법률검토를 통과한 경우에만 시행"
- ✅ 사회공헌 인증서는 "세액공제용 기부금영수증이 아님"을 항상 병기

`npm run check` 로 사이트 전체에서 금지 표현을 자동 검사할 수 있습니다.

---

## 6. 다음 단계에서 붙일 것

| 항목 | 언제 | 방법 |
|---|---|---|
| PG 결제 (포트원 등) | 법률검토 통과 + 사업자·PG 심사 후 | `functions/api/payment/` 추가, `apply.js` 의 계좌안내를 결제창 호출로 교체 |
| 문자 자동발송 | 파일럿 참여자 100명 이상 | 알리고·솔라피 API 를 `admin/participants.js` 입금확인 시점에 연결 |
| 사회공헌 인증서 자동발급 | LOVE 8 달성자 발생 시 | 인증서 이미지 생성 Worker + 이메일 발송 |
| Turnstile 스팸 차단 | 공개 홍보 시작 시 | Cloudflare Turnstile 위젯 추가 + `TURNSTILE_SECRET` 등록 |

---

## 7. 라이선스 · 책임

이 저장소는 주식회사 메타매직의 캠페인 운영용 코드입니다.
캠페인의 리워드 구조는 **방문판매 등에 관한 법률** 및 기부금품 관련 법령에 대한
외부 서면 법률의견을 받은 뒤에만 시행합니다. `docs/LEGAL-CHECKLIST.md` 를 참조하세요.
