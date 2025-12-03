# 여행 정산 가계부

여행 시 결제 내역을 기록하고 최종 송금 안내를 자동 계산하는 웹 애플리케이션입니다.

## 기능

- 참여자 관리 (추가/삭제)
- 결제 내역 입력 (결제자, 금액, 항목, 참여자)
- 결제 내역 목록 (수정/삭제)
- 최적화된 송금 안내 (최소 송금 횟수)
- 깔끔한 하늘색 테마 UI
- 모바일 반응형 디자인

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (선택사항)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속합니다.

### 3. 빌드

```bash
npm run build
```

## Supabase 설정 (선택사항)

현재 버전은 로컬 상태 관리로 동작하지만, Supabase와 연동하려면:

### 1. Supabase 프로젝트 생성

[Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.

### 2. 데이터베이스 테이블 생성

SQL 에디터에서 다음 쿼리를 실행합니다:

```sql
-- 여행(정산 세션)
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 참여자
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 결제 내역
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES participants(id),
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 참여자 (N:M)
CREATE TABLE expense_participants (
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, participant_id)
);
```

### 3. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 값을 입력합니다:

```bash
cp .env.example .env
```

`.env` 파일:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 프로젝트 구조

```
jejudo/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── ParticipantManager.tsx
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseList.tsx
│   │   └── SettlementGuide.tsx
│   ├── lib/                 # 라이브러리 설정
│   │   ├── supabase.ts
│   │   └── database.types.ts
│   ├── utils/               # 유틸리티
│   │   └── settlement.ts    # 송금 최적화 알고리즘
│   ├── App.tsx              # 메인 앱
│   ├── main.tsx             # 엔트리 포인트
│   └── index.css            # 글로벌 스타일
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 송금 최적화 알고리즘

1. 각 참여자의 잔액 계산 (지불한 금액 - 내야 할 금액)
2. 채권자(+잔액)와 채무자(-잔액) 분리
3. 그리디 알고리즘으로 최소 송금 횟수 계산

예시:
- 잔액: A(+30,000), B(-10,000), C(-20,000)
- 결과: B → A 10,000원, C → A 20,000원

## 배포

Vercel, Netlify 등에 배포할 수 있습니다.

### Vercel 배포

```bash
npm install -g vercel
vercel
```

## 라이선스

MIT
