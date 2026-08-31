-- NEPAL 48 LOVE CHALLENGE — Cloudflare D1 schema
-- 적용: npx wrangler d1 execute nepal48love --file=./schema.sql --remote

-- 1) 참가자 -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participants (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT NOT NULL UNIQUE,          -- 본인의 LOVE 추천코드 (예: L4K9QX)
  name            TEXT NOT NULL,
  phone_hash      TEXT NOT NULL,                 -- 연락처 해시(중복확인용)
  phone_enc       TEXT NOT NULL,                 -- 연락처(운영자 조회용, 관리자만 열람)
  email           TEXT,
  referrer_code   TEXT,                          -- 나를 소개한 사람의 code
  amount          INTEGER NOT NULL DEFAULT 16000,-- 참여금(원)
  relief_amount   INTEGER NOT NULL DEFAULT 2000, -- 그 중 네팔 기본 구호재원(원)
  deposit_name    TEXT,                          -- 입금자명(계좌이체 대조용)
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid | cancelled | refunded
  consent_privacy INTEGER NOT NULL DEFAULT 0,
  consent_terms   INTEGER NOT NULL DEFAULT 0,
  consent_marketing INTEGER NOT NULL DEFAULT 0,
  memo            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at         TEXT,
  cancelled_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_participants_referrer ON participants(referrer_code);
CREATE INDEX IF NOT EXISTS idx_participants_status   ON participants(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_phone ON participants(phone_hash);

-- 2) 자금 구분 원장 (기획서 XXVII. 자금관리 원칙 A~E) -------------------------
--    A 구호재원 / B 캠페인 사업재원 / C 메타매직 기업지원금
--    D 닥터힐러 제품후원 / E 추가 자발적 기부
CREATE TABLE IF NOT EXISTS ledger (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket       TEXT NOT NULL CHECK (bucket IN ('A','B','C','D','E')),
  direction    TEXT NOT NULL CHECK (direction IN ('in','out')),
  amount       INTEGER NOT NULL,                 -- 원 단위. D(제품후원)는 환산가액
  qty          INTEGER,                          -- 제품 수량 등
  counterparty TEXT,                             -- 다일공동체 / 닥터힐러 / 메타매직 ...
  participant_id INTEGER,
  note         TEXT,
  occurred_on  TEXT NOT NULL,                    -- YYYY-MM-DD
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_bucket ON ledger(bucket);

-- 3) 사전 관심등록 (결제 오픈 전 대기명단) -----------------------------------
CREATE TABLE IF NOT EXISTS waitlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  contact    TEXT NOT NULL,
  org        TEXT,
  kind       TEXT NOT NULL DEFAULT 'citizen',    -- citizen | corporate | ngo | press
  message    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4) 공개 대시보드 수기 항목 (검증된 값만 운영자가 입력) ----------------------
CREATE TABLE IF NOT EXISTS public_stats (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO public_stats (key, value) VALUES
  ('transferred_amount', '0'),   -- 다일공동체 전달완료 금액(원)
  ('transferred_date',   ''),    -- 최근 전달일
  ('product_count',      '0'),   -- 닥터힐러 감사제품 제공 수량
  ('product_value',      '0'),   -- 제품지원 환산가액(원)
  ('phase',              'proposal'), -- proposal | waitlist | pilot | closed
  ('legal_status',       'review');   -- review | passed | modified

-- 5) 관리자 조작 로그 ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT,
  action     TEXT NOT NULL,
  target     TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
