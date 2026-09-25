# Habit Club Architecture

## 1. 설계 목표

현재는 단순하게 이해할 수 있지만, 나중에 Notion을 Supabase PostgreSQL로 교체해도 학생 화면과 핵심 규칙을 크게 바꾸지 않는 구조를 목표로 합니다.

```text
학생 모바일 웹
      ↓
Next.js Route Handler (얇은 API)
      ↓
학생 식별·서버 세션·입력 검증·비즈니스 서비스
      ↓
Repository Interface
      ↓
Notion Repository (초기)
      ↓
Notion API
```

학생 UI는 데이터 저장소를 알지 못하고, Notion API도 직접 호출하지 않습니다.

## 2. Layer별 역할

### UI Layer

- 로그인, 오늘, 계획, 체크아웃, 현황 화면 표시
- 입력값 수집과 사용자 피드백
- loading / empty / error / success 상태 표시
- 비즈니스 규칙을 직접 계산하지 않음

### API Layer

- Route Handler로 HTTP 요청 처리
- 서버 세션에서 현재 학생 확인
- 요청 body와 path parameter 검증
- 서비스 호출 및 안전한 응답 변환

### Application / Service Layer

- 사용 사례를 조합함
- `studentId`를 서버 세션에서 결정
- 계획 제출, 체크아웃, Recovery 생성 등의 흐름을 관리
- UI나 Notion SDK에 의존하지 않음

### Domain Layer

- 도메인 타입, 상태값, 날짜·시간 계산
- 완료율, Recovery 필요 여부, 계획 수정 가능 여부
- 결정적인 규칙을 순수 함수로 작성해 단위 테스트 가능하게 함

### Repository Layer

- 데이터 저장·조회 계약(Interface) 정의
- 서비스는 구체적인 Notion 구현을 직접 알지 않음
- 초기에는 Mock Repository와 Notion Repository를 순서대로 구현

### Infrastructure Layer

- 서버 세션 저장·검증 모듈, Notion API 클라이언트
- 외부 응답을 내부 도메인 모델로 변환
- 외부 API 오류를 애플리케이션 오류로 변환

## 3. 추천 폴더 구조

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (student)/
│   │   ├── today/page.tsx
│   │   ├── plan/page.tsx
│   │   ├── checkout/page.tsx
│   │   └── dashboard/page.tsx
│   └── api/
│       ├── me/route.ts
│       ├── daily-plans/route.ts
│       ├── checkouts/route.ts
│       └── recoveries/route.ts
├── features/
│   ├── identity/
│   ├── today/
│   ├── daily-plan/
│   ├── checkout/
│   ├── recovery/
│   ├── attendance/
│   └── dashboard/
├── domain/
│   ├── student/
│   ├── planned-schedule/
│   ├── daily-plan/
│   ├── attendance/
│   ├── recovery/
│   └── coaching/
├── application/
│   ├── services/
│   └── dto/
├── repositories/
│   ├── interfaces/
│   ├── mock/
│   └── notion/
├── infrastructure/
│   ├── auth/
│   ├── notion/
│   └── config/
├── shared/
│   ├── components/
│   ├── errors/
│   ├── constants/
│   └── utils/
└── lib/
    ├── session/
    └── validation/
```

기능 폴더는 화면 조각과 해당 기능의 입력 스키마·훅·서비스를 함께 두는 곳입니다. `domain`, `repositories`, `infrastructure`는 저장소 교체와 테스트를 위한 공통 영역입니다. 초기 구현에서 모든 폴더를 미리 만들지는 않고, 기능이 시작될 때 필요한 폴더만 생성합니다.

## 4. Domain Model

### Student

```text
id, name, grade, phoneSuffix, coachingLevel, active
```

`phoneSuffix`는 학생 후보를 찾기 위한 검색값일 뿐 인증수단이나 고유 식별자가 아닙니다. 실제 관계와 권한에는 `id`인 `studentId`를 사용합니다. 동일한 뒷자리를 가진 학생이 있으면 임의로 선택하지 않고 `ambiguous` 후보 상태로 처리합니다.

### PlannedSchedule

사전에 정해진 학생의 등원·하원 예정시간입니다.

```text
id
studentId
date
plannedCheckInTime
plannedCheckOutTime
source
```

`source`는 `monthly_plan | manual_adjustment | other` 중 하나이며, 초기 Source는 기존 Habit Club 운영 데이터입니다. PlannedSchedule은 실제 출결과 비교하고 계획 체류시간을 계산하기 위한 기준입니다. 학생에게 매일 예정 등원시간을 다시 입력시키지 않습니다.

### DailyPlan

```text
id, studentId, date, plannedScheduleId, dailyCommitmentCheckOutTime,
status, createdAt, updatedAt
```

DailyPlan은 학생이 당일 제출하는 Daily Commitment를 표현합니다. `dailyCommitmentCheckOutTime`은 필요할 때만 제출하는 당일 하원시간 수정값이며, 핵심 과업도 이 계획에 포함됩니다.

### DailyTask

```text
id, dailyPlanId, title, subject, status, incompleteReason
```

상태는 `pending | completed | partial | incomplete`로 제한합니다.

### ActualAttendance

```text
id, studentId, date, plannedScheduleId, checkInAt, checkOutAt, outings
```

ActualAttendance는 기존 자동화에서 수집되는 실제 등원·하원·외출·복귀 기록입니다. `plannedScheduleId`는 비교 기준을 추적하기 위한 참조이며, 예정 시간과 실제 시간은 섞지 않습니다.

### Recovery

```text
id, studentId, sourceTaskId, title, scheduledAt, status, completedAt, dedupeKey
```

`dedupeKey` 또는 동등한 중복 방지 규칙으로 같은 `sourceTaskId`와 목적의 Recovery가 여러 번 생성되지 않도록 합니다.

### CoachingLog

코치용 운영 데이터입니다. 학생 웹에서 직접 생성하지 않으며, 향후 학생 화면에 필요한 안전한 요약 정보만 별도로 제공합니다.

날짜와 시간은 서버와 저장소에서 일관되게 처리합니다. 화면 표시용 시간대는 운영 지역 정책으로 중앙 관리하고, 컴포넌트마다 임의로 계산하지 않습니다.

## 5. Repository Interface 설계

실제 구현 시 아래와 같은 최소 계약으로 시작합니다. 반환 타입은 내부 Domain 타입이며 Notion 응답 타입을 그대로 노출하지 않습니다.

```ts
interface StudentRepository {
  findByPhoneSuffix(phoneSuffix: string): Promise<StudentLookupResult>
}

interface PlannedScheduleRepository {
  findByStudentAndDate(studentId: string, date: string): Promise<PlannedSchedule | null>
}

interface DailyPlanRepository {
  findByStudentAndDate(studentId: string, date: string): Promise<DailyPlanWithTasks | null>
  create(input: CreateDailyPlanInput): Promise<DailyPlanWithTasks>
  update(input: UpdateDailyPlanInput): Promise<DailyPlanWithTasks>
}

interface AttendanceRepository {
  findByStudentAndDate(studentId: string, date: string): Promise<ActualAttendance | null>
  findByStudentAndDateRange(
    studentId: string,
    from: string,
    to: string,
  ): Promise<ActualAttendance[]>
}

interface RecoveryRepository {
  findOpenByStudent(studentId: string): Promise<Recovery[]>
  findBySourceTaskAndPurpose(
    studentId: string,
    sourceTaskId: string,
    purpose: string,
  ): Promise<Recovery | null>
  create(input: CreateRecoveryInput): Promise<Recovery>
  complete(studentId: string, recoveryId: string): Promise<Recovery>
}
```

학생 식별 조회 결과는 `found`, `not_found`, `ambiguous`처럼 구분합니다. `ambiguous`인 경우 Repository나 Service가 임의로 첫 번째 학생을 선택하지 않습니다. 추가 PIN·관리자 확인·일회성 코드 등 후속 식별 정책은 별도 Use Case로 확장할 수 있게 둡니다.

학생 데이터 Repository 메서드는 `studentId`를 필수로 받습니다. 학생 ID 없이 임의의 전체 목록을 반환하는 메서드는 만들지 않습니다. 구현체는 다음 순서로 확장합니다.

인증 관련 개념은 다음처럼 구분합니다.

```text
phoneSuffix
= 학생 후보를 찾기 위한 검색값

studentId
= 시스템 내부의 실제 학생 고유 ID

authentication
= 입력자가 실제 해당 학생인지 확인하는 절차

session
= 인증 이후 해당 학생 권한을 유지하는 서버 상태
```

```text
MockStudentRepository
NotionStudentRepository
SupabaseStudentRepository (향후)
```

## 6. 학생 인증 및 권한 구조

1. 학생이 전화번호 뒷자리를 입력합니다.
2. Next.js Server가 `StudentRepository`를 통해 후보를 조회합니다.
3. 후보가 없으면 재입력을 안내합니다.
4. 후보가 둘 이상이면 임의로 선택하지 않고 추가 식별 절차를 요구합니다.
5. 후보가 하나여도 전화번호 뒷자리만으로 인증을 완료하지 않습니다.
6. 개인 PIN·일회성 코드·관리자 발급 코드·최초 기기 등록·Supabase Auth 등 별도 인증 또는 신뢰된 기기 확인을 통과합니다.
7. 인증이 완료된 뒤에만 서버가 세션을 발급하고 `studentId`를 세션에 저장합니다.
8. 이후 모든 서비스 호출은 서버 세션에서 확인한 `studentId`를 사용합니다.
9. URL의 `studentId`, request body의 `studentId`는 신뢰하지 않습니다.

```text
전화번호 뒷자리
    ↓
StudentRepository 후보 조회
    ↓
단일 후보 확인 또는 중복 후보 정책 처리
    ↓
추가 인증 또는 신뢰된 기기 확인
    ↓
인증 완료 후 서버 세션에 studentId 저장
    ↓
모든 요청은 세션의 studentId 사용
```

```text
학생 식별
    ↓ 서버에서 확인
서버 세션 → studentId
    ↓
모든 Repository 조회 조건에 studentId 포함
```

초기에는 복잡한 Middleware 권한 체계보다 Route Handler 공통 세션 함수와 서비스의 학생 소유권 검증을 사용합니다. 세션이 없는 요청은 `401`, 소유하지 않은 리소스는 존재 여부가 노출되지 않도록 `404` 또는 정책에 맞는 안전한 오류로 응답합니다. 전화번호 뒷자리만으로 학생 개인 데이터 접근 권한을 부여하지 않습니다. 최초 추가 인증 방식은 아직 확정하지 않고 인증 계층 뒤에 교체 가능하게 둡니다.

## 7. Notion 연동 방식

Notion 데이터베이스는 초기 Source of Truth입니다. 데이터베이스 ID와 속성명은 환경변수·설정으로 분리하고, Notion 페이지 속성 ↔ Domain Model 변환기를 둡니다.

```text
Route Handler
  → Service
    → Repository Interface
      → Notion Repository
        → Notion API
```

Notion Repository의 책임:

- 페이지 조회·생성·업데이트
- Notion 속성을 Domain 값으로 변환
- Notion 오류와 누락 속성 처리
- 외부 응답을 학생에게 노출하지 않도록 정규화

학생이 보는 응답에는 Notion page ID, 코치 메모, Risk Level 등 내부 운영 정보를 포함하지 않습니다.

### 코치 운영 연결

코치용 별도 웹은 만들지 않습니다. 코치는 기존처럼 Notion을 사용하되, 학생 웹이 생성한 구조화된 데이터를 Notion View에서 필터링해 업무에 활용할 수 있어야 합니다.

향후 Notion View에서 확인할 수 있는 상태:

- 오늘 계획 미제출
- 체크아웃 미완료
- 미해결 Recovery
- Recovery 확인 예정
- 계획 시간과 실제 출결의 차이
- 일정 기간 학생 기록 공백

처음부터 긴 AI 요약문을 만들지 않고, 날짜·상태·시간·학생 ID처럼 필터 가능한 구조화 필드를 우선 저장합니다. AI는 필수 기능이 아니며, 객관적으로 계산 가능한 상태를 대신 판단하지 않습니다.

## 8. Daily Plan 제출 데이터 흐름

학생은 날짜를 입력하지 않습니다. 서버가 `Asia/Seoul` 기준으로 오늘 날짜를 결정합니다.

1. 학생이 예정 하원시간(필요한 경우)과 최대 3개 과업을 입력합니다.
2. Client에서 사용성을 위한 1차 검사를 합니다.
3. `POST /api/daily-plans`가 Zod로 서버 검증을 다시 합니다.
4. 서버가 운영 시간대 기준 오늘 날짜와 세션의 `studentId`를 결정합니다.
5. 서비스가 오늘 날짜·과업 수·수정 가능 여부를 Domain 규칙으로 검사합니다.
6. `DailyPlanRepository`가 저장합니다.
7. 서버가 학생 화면용 응답만 반환합니다.
8. UI는 성공 상태를 표시하고 오늘 화면으로 이동합니다.

검증 기준과 최대 과업 수는 `shared/constants` 또는 정책 설정에 둡니다.

과거·미래 날짜 계획은 초기 MVP의 이 Use Case에서 허용하지 않습니다. 별도 날짜 계획 기능이 필요해질 때 새로운 Use Case로 설계합니다.

### 시간 개념

| 개념 | 의미 | 초기 Source |
| --- | --- | --- |
| PlannedSchedule | 월간·사전 계획의 예정 등원·하원시간 | 기존 운영 데이터 |
| DailyCommitment | 학생이 당일 제출하는 학습계획과 필요 시 당일 하원 예정시간 수정 | 학생 웹 |
| ActualAttendance | 실제 등원·하원·외출·복귀 기록 | 기존 출결 자동화 |

학생에게 PlannedSchedule의 예정 등원시간을 매일 다시 입력시키지 않습니다. Dashboard는 세 시간 개념을 구분해 예정 등원과 실제 등원, 예정 하원과 실제 하원, 계획 체류시간과 실제 체류시간을 비교합니다.

### 최종 약속 기준과 Effective Daily Plan

당일 하원시간의 최종 기준은 UI가 아니라 Domain/Application Layer에서 계산합니다.

1. 기본 기준은 해당 날짜의 `PlannedSchedule`입니다.
2. 학생이 당일 하원시간을 수정하지 않았다면 `PlannedSchedule.plannedCheckOutTime`을 사용합니다.
3. 학생이 `DailyCommitment`의 하원시간 수정값을 정상 제출했다면 그 값을 해당 날짜의 최종 기준으로 사용합니다.
4. 원래 `PlannedSchedule` 값은 삭제하지 않습니다.
5. 수정 전·후 값과 수정 시점은 변경 기록으로 남깁니다.

이 계산 결과를 `effectivePlannedCheckOutTime`으로 표현할 수 있습니다.

```text
PlannedSchedule
        ↓
DailyCommitment의 수정 여부
        ↓
Effective Daily Plan
        ↓
ActualAttendance와 비교
```

예를 들어 PlannedSchedule이 22:00이고 DailyCommitment가 21:30이면, 해당 날짜의 `effectivePlannedCheckOutTime`은 21:30입니다. 다만 22:00에서 21:30으로 변경했다는 사실은 별도 기록으로 보존해 향후 변경 빈도와 실제 행동을 분석할 수 있게 합니다.

## 9. Checkout / Recovery 데이터 흐름

1. 학생이 오늘 계획의 각 과업을 `completed`, `partial`, `incomplete` 중 하나로 선택합니다.
2. `partial` 또는 `incomplete`에는 미완료 사유를 요구합니다.
3. 서버가 계획의 소유자와 오늘 날짜를 다시 확인합니다.
4. 서비스가 완료율과 Recovery 필요 여부를 결정합니다.
5. 계획 과업 상태를 저장합니다.
6. Recovery가 필요하면 원래 `sourceTaskId`와 목적을 기준으로 기존 Recovery를 먼저 조회합니다.
7. 동일 Recovery가 없을 때만 생성합니다.
8. 학생에게는 저장 결과와 다음 행동만 반환합니다.

```text
Checkout 입력
  → 서버 검증
  → 학생 소유권 확인
  → 과업 상태 저장
  → Recovery 필요 여부 계산
  → 기존 Recovery 확인
  → Recovery 생성(없을 때만)
  → 결과 응답
```

Notion은 여러 작업을 하나의 transaction으로 보장하지 않으므로, Checkout 재요청에도 같은 `sourceTaskId`와 목적의 Recovery가 중복 생성되지 않게 합니다. Task가 미완료인데 Recovery가 없으면 재시도·복구 작업이 누락 Recovery를 생성할 수 있어야 합니다. API에는 요청 식별자 또는 동등한 멱등성 전략을 적용하고, 최종 상태를 재조회해 일관성을 확인합니다. 이 흐름은 UI에서 완료율을 계산하거나 Recovery를 임의로 생성하지 않도록 합니다.

## 10. Notion → Supabase 전환 전략

1. Domain Model과 Repository Interface를 먼저 고정합니다.
2. Notion 속성과 Domain 변환 규칙을 문서화합니다.
3. Supabase 테이블을 Domain Model에 맞춰 설계합니다.
4. `Supabase*Repository`를 기존 Interface에 맞게 구현합니다.
5. Service와 UI는 동일한 Interface를 사용하므로 변경하지 않습니다.
6. 마이그레이션 기간에는 읽기 비교와 소수 학생 검증을 진행합니다.
7. 데이터 정합성을 확인한 후 Repository 구현체를 교체합니다.

즉, 교체 범위는 주로 `repositories/supabase`와 설정·마이그레이션 영역입니다. 다만 Notion의 느슨한 속성·페이지 구조와 관계형 DB의 제약 차이는 별도 데이터 정제 작업이 필요합니다.

## 11. UI / UX 설계 원칙

### 모바일 우선

- 기본 기준 폭은 작은 모바일 화면입니다.
- 주요 버튼은 엄지손가락으로 누르기 쉬운 크기로 만듭니다.
- 한 화면의 주요 CTA는 1개, 보조 CTA는 최대 1개로 제한합니다.
- 긴 표와 관리자용 데이터베이스 UI를 사용하지 않습니다.

### 5초 안에 이해하는 오늘 화면

오늘 화면의 위에서부터 다음 순서로 배치합니다.

1. 오늘 날짜와 짧은 환영 문구
2. 현재 상태 요약: 계획 여부, 등원·하원 정보
3. 오늘의 핵심 행동 CTA
4. 핵심 과업 미리보기
5. Recovery가 있을 때만 복구 카드

계획이 없으면 `오늘 계획 세우기`, 계획이 있으면 `체크아웃 준비하기`처럼 다음 행동을 하나로 명확하게 보여줍니다.

### 상태와 접근성

- Loading: 화면 구조를 유지하는 간단한 skeleton
- Empty: 무엇이 없는지보다 다음에 무엇을 할지 안내
- Error: 기술 용어 대신 재시도·문의 등 행동을 안내
- Success: 저장 결과와 다음 화면을 명확히 표시
- 색상만으로 완료·미완료를 구분하지 않고 텍스트와 아이콘을 함께 사용
- 입력 오류는 입력 영역 가까이에 표시

### Phase 1 UI 검증 기준

- 로그인 후 오늘 해야 할 행동을 5초 안에 찾을 수 있는가
- 계획 작성에서 과업 3개를 부담 없이 입력할 수 있는가
- 체크아웃에서 완료 상태와 미완료 이유가 혼동되지 않는가
- Recovery가 벌점처럼 느껴지지 않고 다음 행동으로 이해되는가
- 모바일에서 스크롤과 버튼 터치가 불편하지 않은가

## 12. 주요 리스크와 방지책

| 리스크 | 방지책 |
| --- | --- |
| 전화번호 뒷자리 중복 | 임의 선택 금지, `ambiguous` 결과와 추가 식별 정책 분리 |
| 학생 ID 조작으로 타인 데이터 조회 | 서버 세션의 `studentId`로만 데이터 조회 |
| Notion API 키 노출 | 서버 Route Handler와 서버 전용 환경변수에서만 호출 |
| Notion 속성명 변경 | Repository 변환기와 설정으로 외부 구조를 격리 |
| Notion API 지연·실패 | timeout, 안전한 오류 메시지, 재시도 가능한 UI |
| 시간대·날짜 조작·오류 | 서버가 `Asia/Seoul` 기준 오늘 날짜를 결정하고 중앙 날짜 유틸리티 사용 |
| 예정 시간과 실제 출결 혼동 | Planned Schedule, Daily Commitment, Actual Attendance를 별도 Domain 개념으로 관리 |
| UI에 규칙이 흩어짐 | Domain 순수 함수와 Application Service에 규칙 집중 |
| 초기 구조 과복잡화 | 실제 기능이 시작될 때 필요한 파일만 추가 |
| 학생에게 내부 정보 노출 | 학생용 DTO를 별도로 만들고 응답을 화이트리스트화 |
| Checkout 부분 실패 | Task 저장 후 Recovery 존재 여부를 확인하고 누락 Recovery 재시도 |
| Recovery 중복 생성 | `sourceTaskId` + 목적 조회, 요청 멱등성, 생성 전 중복 확인 |
| 코치 업무 데이터 활용 어려움 | AI 요약보다 Notion View용 구조화 상태·시간 필드 우선 |
