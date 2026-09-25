# Habit Club 학생용 웹 개발 최종 작업 지시서

## 0. 역할

너는 이 프로젝트의 **시니어 풀스택 엔지니어이자 소프트웨어 아키텍트**다.

나는 비전공자이며 Cursor를 이용해 이 프로젝트를 단계적으로 개발할 예정이다.

따라서 단순히 "현재 기능이 작동하는 코드"를 만드는 것이 아니라, 아래 조건을 만족하는 구조를 우선한다.

- 유지보수가 쉬울 것
- 기능 확장이 쉬울 것
- 특정 데이터 저장소에 강하게 종속되지 않을 것
- 비전공자도 구조를 이해하고 수정할 수 있을 것
- 기능을 한 번에 크게 구현하지 않고 단계적으로 개발할 것
- 과도한 엔터프라이즈 구조는 피할 것
- 현재는 단순하지만 미래 변경에 대응할 수 있는 수준의 구조를 만들 것

**중요: 처음부터 전체 기능을 구현하지 않는다.  
먼저 구조를 설계하고, Phase 단위로 구현 → 검증 → 다음 단계 진행 방식으로 개발한다.**

---

# 1. 프로젝트 개요

서비스명: **Habit Club**

대상:
- 중학생
- 고등학생

목적:
학생이 해빗클럽에서

**계획 → 실행 → 확인 → 미완료 시 복구 → 누적 피드백**

의 자기조절학습 루프를 경험하게 하는 학생용 웹을 만든다.

현재 학원 운영에서는 코치들이 **Notion**을 사용하고 있다.

현재 Notion에는 다음 정보가 관리되고 있다.

- 학생 명부
- 출결 기록
- 코칭 기록
- 주간 점검
- 학생별 특이사항
- 코치 간 인수인계
- 학생별 코칭 기록

또한 학생의 등·하원 태깅 기록이 Notion에 연동되는 자동화가 이미 존재한다.

새롭게 개발하는 것은 **학생용 모바일 웹**이다.

학생은 복잡한 Notion 화면을 직접 보지 않고,
학생에게 필요한 기능만 단순한 UI에서 사용한다.

코치는 기존처럼 Notion을 중심으로 운영한다.

---

# 2. 기술 선택

기본 기술 스택은 다음과 같다.

## Frontend / Backend

- Next.js
- App Router
- TypeScript

## UI

- Tailwind CSS

## Authentication

- Supabase Auth

## 초기 운영 데이터

- Notion API

## 향후 확장

- Supabase PostgreSQL 또는 별도 DB

## 배포

- Vercel

## Validation

- Zod

---

# 3. Next.js 사용 원칙

Next.js를 선택하지만 **복잡한 Next.js 기능을 남용하지 않는다.**

이 프로젝트에서 Next.js를 사용하는 이유는 다음과 같다.

- 학생용 React UI
- 서버 API
- 로그인 사용자 검증
- Notion API Key 보호
- 학생별 데이터 접근 제어

를 하나의 코드베이스에서 관리하기 위함이다.

초기에는 아래 기능 중심으로 사용한다.

- React
- App Router
- Route Handler
- Server-side 환경변수
- 기본적인 Server / Client Component 구분

다음 기능은 필요할 때까지 사용하지 않는다.

- 복잡한 SSR 최적화
- ISR
- 복잡한 caching
- Server Action 남용
- Middleware 기반 복잡한 권한 처리
- Parallel Routes
- Intercepting Routes
- 과도한 React Server Component 패턴

목표는

**"Next.js를 풀스택 만능 프레임워크처럼 쓰는 것"이 아니라  
"React + 얇은 서버 API를 하나의 프로젝트에서 관리하는 것"**

이다.

---

# 4. 핵심 아키텍처 원칙

## 4-1. UI와 데이터 저장소를 분리한다

학생 화면에서 Notion API를 직접 호출하지 않는다.

반드시 다음 구조를 따른다.

```text
Student UI
    ↓
Application / API Layer
    ↓
Repository Interface
    ↓
Infrastructure Layer
    ↓
Notion
```

향후 Notion을 Supabase DB로 교체하더라도

- UI
- 주요 비즈니스 로직

은 거의 수정하지 않고,
Repository 구현체만 교체할 수 있어야 한다.

---

## 4-2. Repository Pattern을 사용한다

예:

```text
StudentRepository
DailyPlanRepository
AttendanceRepository
RecoveryRepository
```

Notion 구현체:

```text
NotionStudentRepository
NotionDailyPlanRepository
NotionAttendanceRepository
NotionRecoveryRepository
```

향후:

```text
SupabaseStudentRepository
SupabaseDailyPlanRepository
SupabaseAttendanceRepository
SupabaseRecoveryRepository
```

로 교체할 수 있어야 한다.

---

## 4-3. 비즈니스 로직은 UI에 넣지 않는다

다음 로직을 React Component 내부에 직접 구현하지 않는다.

- 오늘 계획 제출 가능 여부
- Recovery 필요 여부
- 완료율 계산
- 주간 데이터 집계
- 시간 계산
- 상태 전환
- 계획 수정 가능 여부
- 향후 코칭 단계 판단

비즈니스 로직은

```text
domain
services
utils
```

등에 분리한다.

UI 컴포넌트는 가능한 한

- 데이터 표시
- 사용자 입력
- 이벤트 전달

역할만 담당한다.

---

# 5. 하드코딩 최소화

아래 값은 코드 곳곳에 직접 작성하지 않는다.

- 최대 과업 개수
- 과업 상태값
- 미완료 사유
- Recovery 상태
- 각종 기준값
- 학생에게 보여주는 주요 상태 문구
- 향후 코칭 최소 주기
- 향후 보상 기준

중앙에서 관리한다.

예:

```text
config/
constants/
```

운영 정책이 변경되었을 때 한 곳을 수정하면 전체 시스템에 반영될 수 있어야 한다.

---

# 6. 기능 단위 모듈화

페이지 기준이 아니라 **기능 중심**으로 구조를 나눈다.

예:

```text
features/
  auth/
  daily-plan/
  checkout/
  recovery/
  attendance/
  dashboard/
```

각 feature 내부에는 필요에 따라

```text
components/
services/
hooks/
schemas/
types/
```

를 둔다.

공통 UI와 공통 로직은 별도 shared 영역으로 분리한다.

---

# 7. MVP 기능

초기 버전에서는 아래 기능만 만든다.

기능을 임의로 추가하지 않는다.

---

## 7-1. 학생 로그인

학생은 로그인 후 자신의 데이터만 조회할 수 있어야 한다.

학생 계정은 내부 `student_id`와 연결된다.

로그인 상태는 일정 기간 유지한다.

학생 A가 URL이나 request parameter를 조작하여 학생 B의 데이터를 볼 수 없어야 한다.

---

## 7-2. 오늘 화면

학생이 로그인한 뒤 가장 먼저 보는 화면이다.

표시 정보:

- 오늘 날짜
- 실제 등원시간
- 예정 하원시간
- 오늘 계획 제출 여부
- 오늘 핵심 과업
- 미완료 Recovery 존재 여부

오늘 계획이 없다면

**오늘 계획 세우기**

CTA를 명확하게 표시한다.

---

## 7-3. 오늘 계획 작성

학생 입력 항목:

- 예정 하원시간
- 오늘 핵심 과업 최대 3개

각 과업은 최소한 다음 속성을 가진다.

- 과업명
- 과목

향후 아래 항목을 추가할 수 있도록 구조를 열어둔다.

- 예상 소요시간
- 중요도
- 세부 목표

---

## 7-4. 체크아웃

학생은 하원 전에 오늘 계획을 확인한다.

각 과업 상태:

- 완료
- 일부 완료
- 미완료

일부 완료 또는 미완료인 경우 이유를 선택한다.

예:

- 시간이 부족했다
- 계획량이 많았다
- 예상보다 어려웠다
- 다른 일정이 생겼다
- 집중하지 못했다
- 기타

필요하면 Recovery Plan을 생성한다.

---

## 7-5. Recovery Plan

Recovery에는 최소한 아래 정보가 포함된다.

- 원래 어떤 과업에서 발생했는지
- 무엇을 마무리할 것인지
- 언제 할 것인지
- 완료 여부

미완료 과업은 그냥 사라지지 않고,
다음 날 또는 추후 일정으로 이어질 수 있어야 한다.

---

## 7-6. 내 현황

학생이 이번 주 자신의 행동을 확인할 수 있는 화면이다.

초기 MVP에서는 다음만 보여준다.

- 출석일
- 계획한 체류시간
- 실제 체류시간
- 핵심 과업 완료율
- 미완료 과업 수
- Recovery 진행 상태

학생에게는 코치용 내부 판단을 보여주지 않는다.

예:

- Risk Level
- 코치 내부 메모
- Coaching Priority
- 코치 평가

등은 학생 화면에서 제외한다.

---

# 8. UX 원칙

대상은 중·고등학생이다.

**Mobile First**로 설계한다.

UX 목표:

> 학생이 웹에 들어온 뒤 5초 안에  
> 오늘 무엇을 해야 하는지 이해할 수 있어야 한다.

따라서:

- 한 화면의 정보량을 최소화한다.
- 긴 설명문을 피한다.
- 주요 행동은 CTA 1~2개로 명확하게 한다.
- 관리자용 데이터 구조를 노출하지 않는다.
- Notion 같은 복잡한 데이터베이스 UI를 만들지 않는다.
- 학생이 직접 이해해야 할 행동만 보여준다.
- 버튼과 입력 영역은 모바일 터치에 적합하게 만든다.

PWA 확장 가능성을 고려하되,
초기 MVP에서는 핵심 기능 구현을 우선한다.

---

# 9. Domain Model

## Student

```text
id
name
grade
authUserId
coachingLevel
active
```

향후 속성 확장 가능해야 한다.

---

## DailyPlan

```text
id
studentId
date
plannedLeaveTime
status
createdAt
updatedAt
```

DailyPlan은 여러 DailyTask를 가진다.

---

## DailyTask

```text
id
dailyPlanId
title
subject
status
incompleteReason
```

status 예시:

```text
pending
completed
partial
incomplete
```

---

## Attendance

```text
id
studentId
date
checkInAt
checkOutAt
```

기존 출결 시스템과 연계한다.

---

## Recovery

```text
id
studentId
sourceTaskId
title
scheduledAt
status
completedAt
```

원래 어떤 과업에서 발생했는지 추적할 수 있어야 한다.

---

## CoachingLog

학생 웹에서는 직접 생성하지 않는다.

코치용 Notion에서 관리한다.

향후 학생 Dashboard에 일부 정보가 사용될 수 있으므로
독립된 Domain Entity로 고려한다.

---

# 10. Notion 사용 원칙

Notion은 초기 운영 단계에서

**Source of Truth + 코치 운영 도구**

역할을 한다.

학생 웹은 직접 Notion을 보지 않는다.

학생 입력:

```text
학생 웹
↓
Next.js API
↓
Validation
↓
Repository
↓
Notion
```

방식으로 저장한다.

---

# 11. AI 사용 원칙

현재 Habit Club에서는 AI가

- 불필요하게 긴 요약
- 다음 코칭에 필요하지 않은 정보
- 과도하게 AI다운 문장

을 생성하면서 가독성을 떨어뜨리는 문제가 있었다.

따라서 학생 웹 MVP에는 AI 기능을 넣지 않는다.

향후 AI를 사용하더라도 다음 역할에 제한한다.

- 구조화
- 정보 추출
- 반복 패턴 탐지
- 매우 짧은 요약

AI가 다음을 임의로 판단하게 하지 않는다.

- 출결 상태
- 완료 여부
- Recovery 필요 여부
- 날짜 기준
- 학생의 실제 행동 데이터

객관적으로 계산 가능한 정보는 반드시
**deterministic rule**로 처리한다.

---

# 12. 보안 원칙

반드시 지킨다.

- `NOTION_API_KEY`는 client-side에 노출하지 않는다.
- Supabase service role key를 client-side에 노출하지 않는다.
- secret은 `.env.local`에서 관리한다.
- 외부 API 호출은 server-side에서 수행한다.
- 학생은 자신의 데이터만 접근할 수 있어야 한다.
- URL 조작으로 다른 학생 데이터를 조회할 수 없어야 한다.
- 모든 입력은 서버에서 다시 validation한다.
- secret을 Git에 커밋하지 않는다.

---

# 13. Error / Loading / Empty State

정상 상태만 구현하지 않는다.

주요 화면마다 아래 상태를 고려한다.

- Loading
- Empty
- Error
- Success

예:

- 오늘 계획 없음
- Recovery 없음
- 출결 정보 없음
- Notion API 오류
- 네트워크 오류
- 입력 오류

학생에게는 기술적인 에러 메시지를 그대로 노출하지 않는다.

---

# 14. 코드 품질 원칙

- TypeScript의 `any` 사용 최소화
- 중복 코드 최소화
- 함수 하나당 역할 하나
- 컴포넌트 과대화 금지
- Server / Client 코드 명확하게 분리
- 파일명과 함수명은 역할이 드러나게 작성
- 임시방편 코드 남발 금지
- 불필요한 패키지 설치 금지
- 요구하지 않은 기능 추가 금지

---

# 15. 테스트 가능성

초기부터 대규모 테스트 시스템을 만들 필요는 없다.

다만 아래 비즈니스 로직은 UI와 분리하여
unit test가 가능하도록 만든다.

- 완료율 계산
- 주간 데이터 집계
- Recovery 필요 여부
- 시간 계산
- 상태 전환
- 학생별 접근 검증 로직

---

# 16. 문서화

프로젝트 루트에 다음 문서를 유지한다.

## README.md

내용:

- 프로젝트 목적
- 기술 스택
- 실행 방법
- 환경변수
- 폴더 구조
- 주요 Domain 설명

## ARCHITECTURE.md

내용:

- 전체 시스템 구조
- Layer별 역할
- 데이터 흐름
- Notion 연동 방식
- 인증 구조
- Repository 구조
- 향후 DB 전환 방법
- 주요 설계 결정

## ROADMAP.md

내용:

- 현재 개발 Phase
- 완료 기능
- 다음 작업
- 추후 기능

구조가 변경되면 관련 문서도 함께 수정한다.

---

# 17. 개발 단계

## Phase 0 — Architecture

아직 코드를 작성하지 않는다.

먼저 아래를 설계한다.

1. 전체 시스템 구조
2. 데이터 흐름
3. 추천 폴더 구조
4. Domain Model
5. Repository Interface
6. 인증 구조
7. Notion 연동 구조
8. 향후 DB 전환 전략
9. 예상 리스크
10. 전체 개발 Roadmap

---

## Phase 1 — UI Prototype

실제 Notion / Supabase 데이터를 연결하지 않는다.

Mock Data로 아래 화면 구현:

- Login
- Today
- Daily Plan
- Checkout
- Dashboard

모바일 UX를 우선 검증한다.

---

## Phase 2 — Authentication

Supabase Auth 연결.

학생 계정과 `student_id` 연결.

권한 검증 구현.

---

## Phase 3 — Data Layer

Repository Interface 구현.

먼저 Mock Repository를 만든다.

이후 Notion Repository 구현.

---

## Phase 4 — Daily Plan

오늘 계획 생성 / 조회 / 수정 연결.

---

## Phase 5 — Checkout / Recovery

과업 결과 입력.

미완료 시 Recovery 생성.

---

## Phase 6 — Dashboard

이번 주 학생 데이터를 집계해 표시.

---

## Phase 7 — 실제 운영 테스트

소수 학생에게 테스트.

관찰 항목:

- 계획 제출률
- 체크아웃 완료율
- Recovery 실제 사용 여부
- 학생 UX 불편
- 코치 업무 증가 여부

운영 피드백에 따라 UX와 데이터 구조 수정.

---

## Phase 8 — 확장 검토

실제 운영 결과를 바탕으로 아래 기능을 검토한다.

- 새로운 보상 시스템
- PWA
- 알림
- 장기 목표
- 학생 / 코치 메시지
- Supabase DB 이전
- 성적 / 시험 관리
- 추가 통계

---

# 18. Cursor 작업 규칙

앞으로 기능 구현 요청을 받을 때마다 다음 순서를 따른다.

1. 현재 프로젝트 구조를 먼저 확인한다.
2. 이번 변경이 기존 Architecture에 미치는 영향을 판단한다.
3. 수정할 파일 목록을 먼저 설명한다.
4. 최소 범위만 수정한다.
5. 기존 기능이 깨지지 않는지 확인한다.
6. 구현 후 테스트 방법을 알려준다.
7. 문서 수정이 필요하면 함께 업데이트한다.

기능 하나를 위해 전체 구조를 임시방편으로 바꾸지 않는다.

새 요구사항이 기존 Architecture와 충돌하면
바로 구현하지 말고 먼저 문제와 더 나은 설계를 설명한다.

---

# 19. 하지 말아야 할 것

다음을 금지한다.

- 전체 기능을 한 파일에 구현
- React Component에서 직접 Notion API 호출
- client-side에 secret 저장
- UI와 데이터 저장 구조 강결합
- 기준값 여러 파일에 하드코딩
- 설명 없는 임시 코드 추가
- 필요 없는 패키지 설치
- 요구하지 않은 기능 임의 추가
- AI 기능 임의 추가
- 과도한 Clean Architecture 구현
- 필요 없는 Next.js 고급 기능 사용

---

# 20. 아키텍처 복잡도 원칙

이 프로젝트는 대규모 엔터프라이즈 서비스가 아니다.

따라서 패턴과 Layer를 도입하되,
구조 자체가 개발 속도를 방해할 정도로 복잡해지면 안 된다.

목표:

> 현재는 단순하게 이해할 수 있고  
> 향후 데이터 저장소와 기능을 교체할 수 있는 구조

를 유지한다.

즉,

**"확장 가능성은 확보하되, 과도하게 추상화하지 않는다."**

---

# 21. 첫 번째 작업 요청

지금 바로 코드를 작성하지 마라.

먼저 **Phase 0 — Architecture Design**만 수행한다.

아래 순서로 결과를 작성한다.

1. 추천 시스템 구조
2. 각 Layer의 역할
3. 추천 폴더 구조
4. Domain Model
5. Repository Interface 설계
6. 학생 인증 및 권한 구조
7. Notion 연동 방식
8. Daily Plan 제출 데이터 흐름
9. Checkout / Recovery 데이터 흐름
10. 향후 Notion → Supabase DB 전환 전략
11. 예상 리스크와 방지책
12. Phase 1~8 개발 Roadmap

비전공자도 이해할 수 있도록 설명하되,
실제 개발에 바로 사용할 수 있을 정도로 구체적으로 작성한다.
