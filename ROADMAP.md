# Habit Club 개발 로드맵

## 현재 상태

### Phase 0 — Architecture Design

상태: 완료

완료 항목:

- 시스템 구조와 Layer 역할 정의
- 기능 중심 폴더 구조 설계
- Domain Model 정의
- Repository Interface 방향 정의
- 학생 인증 및 학생별 권한 흐름 정의
- Notion 연동과 DB 교체 전략 정의
- Daily Plan, Checkout, Recovery 데이터 흐름 정의
- 모바일 우선 UI/UX 원칙과 검증 기준 정의
- 주요 리스크와 방지책 정리

관련 문서: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Phase 1 — UI Prototype

상태: 완료

실제 Supabase와 Notion을 연결하지 않고 Mock Data로 아래 화면을 구현합니다.

- Login
- Today
- Daily Plan
- Checkout
- Dashboard

완료 기준:

- 모바일 화면을 우선으로 동작
- 로그인 후 오늘의 다음 행동이 명확함
- loading / empty / error / success 상태 포함
- 계획 과업은 최대 3개
- UI 컴포넌트에 비즈니스 규칙을 과도하게 넣지 않음
- 화면별 수동 검증 방법 기록

구현 결과:

- Next.js + TypeScript + Tailwind CSS 기본 구성
- Mock Data 기반 Login, Today, Daily Plan, Checkout, Dashboard 화면
- 모바일 우선 하단 네비게이션
- 입력 오류, 저장 성공, Recovery 결과, loading 상태 UI
- 실제 인증·서버 세션·Notion·Supabase 연동 없음

## Phase 2 — Identity + Minimal Data Layer

상태: 대기

- `StudentRepository` Interface 작성
- `MockStudentRepository` 구현
- 전화번호 뒷자리 기반 학생 후보 조회
- 중복 후보를 임의 선택하지 않는 흐름
- 전화번호 뒷자리만으로 인증을 완료하지 않는 흐름
- 추가 인증 또는 신뢰된 기기 확인을 위한 인증 계층 확장 지점
- 서버 세션 생성 및 `studentId` 저장
- 서버 세션 기반 학생 식별
- 타 학생 데이터 접근 차단

완료 기준:

- 세션이 없는 사용자는 학생 화면에 접근할 수 없음
- 전화번호 뒷자리 자체가 고유 ID로 사용되지 않음
- 추가 인증을 통과하기 전에는 서버 세션이 발급되지 않음
- 중복 후보 발생 시 추가 식별 정책으로 연결할 수 있음
- URL이나 body의 학생 ID를 바꿔도 다른 학생 데이터가 나오지 않음
- 세션 만료와 로그아웃 처리

Supabase Auth는 이 단계의 필수 구현이 아닙니다. 향후 정식 계정 체계가 필요해질 때 인증 계층 뒤에 추가합니다.

## Phase 3 — Notion Data Layer

상태: 대기

- `NotionStudentRepository` 구현
- `PlannedScheduleRepository` 구현
- `DailyPlanRepository` 구현
- `AttendanceRepository` 구현
- `RecoveryRepository` 구현
- Notion 데이터베이스 매핑 문서화
- 공통 오류 타입과 외부 응답 변환 규칙 작성
- Notion Repository의 작은 조회 기능부터 구현
- Recovery 중복 방지와 재시도 규칙 구현

완료 기준:

- Application Service가 Notion SDK를 직접 참조하지 않음
- Mock Repository로 화면을 계속 검증할 수 있음
- Notion 오류가 학생용 안전한 메시지로 변환됨
- 동일한 `sourceTaskId`와 목적의 Recovery가 중복 생성되지 않음

## Phase 4 — Daily Plan

상태: 대기

- 오늘 계획 조회
- 계획 생성
- 계획 수정 정책 구현
- 서버가 `Asia/Seoul` 기준 오늘 날짜 결정
- Daily Commitment의 핵심 과업과 필요 시 예정 하원시간 수정 검증
- PlannedSchedule의 예정 등원시간을 학생에게 중복 입력시키지 않음
- PlannedSchedule과 DailyCommitment를 바탕으로 `effectivePlannedCheckOutTime` 계산
- 계획 변경 전·후 값을 변경 기록으로 보존
- Notion 저장 연결

완료 기준:

- 학생 본인의 오늘 계획만 조회·수정
- 서버에서 입력을 다시 검증
- 계획이 없을 때 명확한 CTA 표시
- PlannedSchedule과 DailyCommitment의 우선순위가 Domain/Application Layer에서 일관되게 적용됨

## Phase 5 — Checkout / Recovery

상태: 대기

- 과업별 완료·일부 완료·미완료 입력
- 미완료 사유 검증
- 완료율 계산
- Recovery 생성과 조회
- Recovery 완료 처리

완료 기준:

- 미완료 과업이 사라지지 않고 원래 과업과 연결됨
- Recovery 필요 여부가 UI가 아닌 Domain 규칙으로 결정됨
- Checkout 재요청에도 Recovery가 중복 생성되지 않음
- Task 미완료·Recovery 누락 시 재시도 또는 복구 가능
- 중복 제출과 잘못된 학생 접근을 방지함

## Phase 6 — Dashboard

상태: 대기

- 이번 주 출석일 표시
- 계획한 체류시간과 실제 체류시간 표시
- 핵심 과업 완료율 표시
- 미완료 과업 수 표시
- Recovery 진행 상태 표시
- 예정 등원·하원과 실제 등원·하원 비교

시간 데이터는 Planned Schedule, Daily Commitment, Actual Attendance를 구분해 표시합니다.

학생 화면에서 Risk Level, 코치 메모, Coaching Priority 등 내부 판단은 제외합니다.

## Phase 7 — 실제 운영 테스트

상태: 대기

소수 학생을 대상으로 운영합니다.

관찰 항목:

- 계획 제출률
- 체크아웃 완료율
- Recovery 실제 사용 여부
- 학생이 다음 행동을 쉽게 이해하는지
- 코치 업무가 증가하거나 줄어드는지
- Notion 데이터 누락·지연·중복 여부
- Notion View에서 계획 미제출·체크아웃 미완료·미해결 Recovery를 실제로 확인할 수 있는지

운영 중 발견한 문제는 기능을 무작정 추가하지 않고, 먼저 UX·데이터·업무 흐름 중 어느 부분의 문제인지 분류합니다.

## Phase 8 — 확장 검토

상태: 운영 결과에 따라 결정

후보:

- 보상 시스템
- PWA
- 알림
- 장기 목표
- 학생·코치 메시지
- Supabase PostgreSQL 이전
- 성적·시험 관리
- 추가 통계

확장 기능은 Phase 7의 실제 사용 데이터와 운영 피드백을 근거로 우선순위를 정합니다.

## 다음 작업

다음 구현 단계는 **Phase 2 — Identity + Minimal Data Layer**입니다.

구현에 들어갈 때는 먼저 인증 계층과 StudentRepository의 변경 파일 목록을 설명합니다. 전화번호 뒷자리 식별, 추가 인증 확장 지점, 서버 세션, `studentId` 기반 접근 제어를 구현합니다.
