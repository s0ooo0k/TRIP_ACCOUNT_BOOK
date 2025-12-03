# 여행 정산 가계부 요구사항

## 프로젝트 개요

여행 시 결제 내역을 기록하고, 최종 송금 안내를 자동 계산하는 웹 애플리케이션

## 핵심 기능

### 1. 참여자 관리

- 참여자 이름 추가/삭제
- 최소 2명 이상

### 2. 결제 내역 입력

- 결제자 선택 (드롭다운)
- 결제 금액 입력
- 결제 항목명 입력 (예: 점심, 숙소, 택시)
- 함께한 사람 다중 선택 (체크박스)

### 3. 결제 내역 목록

- 입력된 모든 결제 내역 리스트
- 수정/삭제 기능

### 4. 최종 송금 안내

- 자동 계산된 최적 송금 가이드만 표시
- 예: "영희 → 철수: 15,000원"
- 송금 횟수 최소화 알고리즘 적용

## 기술 스택

- Frontend: React + TypeScript + Tailwind CSS
- Backend/DB: Supabase (PostgreSQL)
- 배포: Vercel

## Supabase 테이블 설계

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

## UI 구성

```
┌─────────────────────────────────────┐
│  🧳 여행 정산                        │
├─────────────────────────────────────┤
│  [참여자]                            │
│  철수  영희  민수  [+추가]           │
├─────────────────────────────────────┤
│  [결제 추가]                         │
│  결제자: [▼]  금액: [____]원        │
│  항목: [____]                       │
│  참여: ☑철수 ☑영희 ☐민수           │
│                          [추가]     │
├─────────────────────────────────────┤
│  [결제 내역]                         │
│  • 점심 45,000원 (철수→철수,영희)   │
│  • 택시 12,000원 (영희→전체)        │
├─────────────────────────────────────┤
│  [💸 송금 안내]                      │
│  ┌────────────────────────────────┐ │
│  │  민수 → 철수  25,000원         │ │
│  │  영희 → 철수  10,000원         │ │
│  └────────────────────────────────┘ │
│                                     │
│  ✅ 이대로 송금하면 정산 완료!       │
└─────────────────────────────────────┘
```

## 송금 최적화 알고리즘

```typescript
// 1. 각 참여자의 잔액 계산
// 잔액 = 본인이 결제한 총액 - 본인이 내야 할 총액

// 2. 채권자(+잔액)와 채무자(-잔액) 분리

// 3. 그리디 알고리즘으로 매칭
//    - 가장 많이 받을 사람 + 가장 많이 낼 사람 매칭
//    - 둘 중 작은 금액만큼 송금 처리
//    - 반복

// 예시:
// 잔액: A(+30,000), B(-10,000), C(-20,000)
// 결과: B → A 10,000원, C → A 20,000원
```

## 핵심 사용자 플로우

1. 새 여행 만들기 → 고유 URL 생성
2. URL 공유 → 일행들도 같은 화면 접근
3. 각자 결제할 때마다 바로 입력
4. 여행 끝나면 송금 안내대로 정산

## 추가 고려사항

- 모바일 우선 반응형
- 실시간 동기화 (Supabase Realtime)
- URL로 여행 공유 (로그인 없이)
- 금액 천 단위 콤마 포맷
- 여행 삭제/초기화 기능
