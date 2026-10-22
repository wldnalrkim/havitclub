# Phase 6 Stage 1 점검 결과

## 1. 테스트 환경 분리

Preview에서는 `VERCEL_ENV=preview`를 기준으로 자동으로 테스트 환경을 선택한다. 로컬에서 테스트 DB를 사용하려면 `NOTION_DATA_MODE=test`를 설정한다. 두 경우 모두 아래 `_TEST` 접미사 환경변수를 사용하며, 기본 이름은 사용하지 않는다.

```text
NOTION_TOKEN_TEST
NOTION_STUDENT_DATABASE_ID_TEST
NOTION_WEEKLY_SCHEDULE_DATABASE_ID_TEST
NOTION_DAILY_COMMITMENT_DATABASE_ID_TEST
NOTION_DAILY_COMMITMENT_REVISION_DATABASE_ID_TEST
NOTION_RECOVERY_DATABASE_ID_TEST
```

테스트 학생명부는 운영 학생명부를 복제하지 않고, 테스트 전용 Notion 페이지 아래에 별도 데이터베이스를 만든다. 테스트 학생은 최소 2명(서로 다른 출결번호), 주간 계획·당일 계획·변경 이력·Recovery DB는 모두 테스트 학생명부를 Relation 대상으로 사용해야 한다. Preview에서 `_TEST` 값이 누락되면 저장소가 실패하므로 운영 DB로 조용히 대체되지 않는다.

## 2. 인증 및 데이터 접근

- 현재 로그인은 출결번호 4자리만으로 세션을 발급한다.
- 세션은 서버 전용 `SESSION_SECRET` HMAC으로 서명되고 HttpOnly 쿠키에 저장된다.
- 모든 학생 데이터 API는 세션의 `studentId`를 저장소 조회 조건으로 사용한다. 클라이언트가 다른 학생 ID를 보내는 방식으로 조회·수정할 수 없다.
- Notion 토큰과 세션 비밀값은 서버 코드에서만 읽으며, API 응답에 포함하지 않는다.
- 출결번호만으로 로그인하는 구조는 운영용 인증으로 충분하지 않다. 정식 배포 전에 개인 PIN/초기 일회성 코드 또는 동등한 추가 인증, 실패 횟수 제한과 재설정 정책이 필요하다.

## 3. 오늘 View의 날짜 필터

Notion API로 생성·수정하는 View 필터는 현재 ISO 날짜(`YYYY-MM-DD`)를 값으로 저장한다. 따라서 `create-notion-coach-views.mjs`의 기존 필터는 실행 날짜에 고정되며, API에서 Notion UI의 “오늘” 상대 필터를 이식하는 방식은 안정적으로 확인되지 않았다.

가장 단순한 운영 방법은 Notion UI에서 `오늘의 학습 현황` View의 `Date is today` 상대 필터를 한 번 설정하고, 날짜를 계산해 View를 다시 PATCH하는 스크립트는 운영 환경에서 실행하지 않는 것이다. 이 변경은 데이터베이스 행을 수정하지 않고 View 설정만 바꾼다. 자동화가 필요하면 `Today?` Formula 속성을 추가해 `Date`와 `now()`의 날짜를 비교하고 그 값을 필터링하는 후속 작업이 필요하다.

## 4. Recovery 중복 생성

기존 로직은 `findByStudent` 후 `create`를 수행하므로 두 요청이 동시에 들어오면 두 요청 모두 빈 결과를 보고 중복 페이지를 만들 수 있다. 현재 구현에는 같은 서버 인스턴스에서 동일한 `(studentId, commitmentId, taskId)` 요청을 직렬화하고, 잠금 후 다시 조회하는 보호를 추가했다.

이 메모리 잠금은 다중 서버에서 공유되지 않는다. 다중 서버 운영 전에는 Recovery 저장소를 unique index가 있는 외부 DB로 옮기고 다음 키에 `INSERT ... ON CONFLICT DO NOTHING` 또는 원자적 `createIfAbsent`를 적용해야 한다.

```text
(student_id, original_plan_id, original_task_id)
```

Notion만 계속 사용할 경우 원자적 unique insert가 없으므로 완전한 중복 방지는 보장할 수 없다. 운영 전 중복 탐지·정리 작업도 별도로 필요하다.

## 5. Preview 배포 체크리스트

- GitHub 저장소의 Preview 브랜치/PR 연동은 Vercel 프로젝트에서 확인하고, 이 저장소에는 외부 연동 권한이나 배포를 실행하는 설정이 없다.
- Vercel Preview에 `NOTION_DATA_MODE=test`, 위의 `_TEST` 변수들, `SESSION_SECRET`, `NEXT_PUBLIC_APP_ENV=preview`를 등록한다.
- Production에는 `NOTION_DATA_MODE=production`, 운영용 기본 Notion 변수들, 별도의 강한 `SESSION_SECRET`, `NEXT_PUBLIC_APP_ENV=production`을 등록한다.
- `NOTION_TOKEN` 및 `SESSION_SECRET`은 `NEXT_PUBLIC_` 접두사를 사용하지 않는다.
- Preview와 Production Integration은 가능하면 별도 Notion Integration과 별도 상위 페이지를 사용한다. 최소한 모든 Preview DB ID는 `_TEST` 세트로 분리한다.
- 운영 DB 백필 4건, 운영 데이터 변경·삭제, 정식 배포, 유료 플랜 전환은 수행하지 않았다.

## 6. 검증

다음 명령으로 검증한다.

```bash
npm run lint
npx tsc --noEmit
npm run build
```

테스트 날짜 이동은 `VERCEL_ENV=production`에서 API가 거부하고 UI도 표시하지 않는다. Preview와 로컬 개발에서는 테스트 DB를 대상으로만 사용할 수 있다.
