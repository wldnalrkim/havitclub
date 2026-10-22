# 당일 학습 계획 Notion 설정

Phase 4는 기존 학생명부와 주간 등하원 계획 데이터베이스를 수정하지 않고, 아래 두 데이터베이스를 별도로 사용합니다.

Phase 5는 같은 스크립트로 Recovery 데이터베이스를 하나 더 확인·생성합니다.

## 자동 생성

기존 Integration이 상위 페이지에 연결되어 있고 콘텐츠 읽기·삽입·업데이트 권한이 있는 상태에서 실행합니다.

```bash
node scripts/create-notion-daily-commitment-dbs.mjs 3f309317e1bc802bafc8cdcc43d47a02
```

스크립트는 같은 상위 페이지에 같은 이름의 데이터베이스가 있는지 먼저 확인하고, 없을 때만 생성합니다. 기존 데이터베이스의 속성이 기대값과 다르면 중단하며 임의로 새 데이터베이스를 추가하지 않습니다.

## 데이터베이스

### 해빗클럽 | 당일 학습 계획

`Name`(Title), `Student ID`(Text), `Student`(Relation → 학생명부), `Date`(Date), `Current Tasks`(Text), `Initial Tasks`(Text), `Initial Submitted At`(Date), `Updated At`(Date), `Version`(Number), `Last Request ID`(Text), `Checkout Result`(Text), `Checked Out At`(Date)

현재 학습 항목과 최초 제출 당시 항목은 JSON으로 저장합니다. 학생 ID와 날짜를 조합해 한 학생의 하루에 하나의 레코드만 허용합니다.

`Checkout Result`에는 학습 항목별 결과(`completed`, `partial`, `incomplete`)와 사유를 JSON으로 저장합니다. 체크아웃을 마친 계획은 학습 항목을 수정할 수 없고, 체크아웃 결과만 당일에 다시 저장할 수 있습니다. 출결·하원 기록과는 무관하며 기존 출결 시스템을 호출하지 않습니다.

이미 생성된 데이터베이스에 속성이 일부 누락되어 있으면 스크립트는 누락된 속성만 추가합니다. 기대하지 않은 속성이 있거나 타입이 다르면 중단합니다.

### 해빗클럽 | 당일 학습 계획 변경 이력

`Name`(Title), `Commitment ID`(Text), `Student ID`(Text), `Student`(Relation → 학생명부), `Date`(Date), `Task ID`(Text), `Action`(Select: `CREATE`, `UPDATE`, `DELETE`), `Before`(Text), `After`(Text), `Changed At`(Date), `Changed By`(Text), `Version`(Number), `Request ID`(Text)

이력 레코드는 추가만 하며 학생용 API에서 수정·삭제하지 않습니다. JSON은 Notion rich text 조각으로 나눠 저장합니다.

### 해빗클럽 | Recovery

`Name`(Title), `Recovery ID`(Text), `Student ID`(Text), `Student`(Relation → 학생명부), `Original Plan ID`(Text), `Original Task ID`(Text), `Original Date`(Date), `Subject`(Text), `Content`(Text), `Original Completion Status`(Select: `partial`, `incomplete`), `Incomplete Reason`(Text), `Recovery Status`(Select: `pending`, `completed`), `Created At`(Date), `Updated At`(Date), `Completed At`(Date), `Carried Date`(Date), `Carried Task ID`(Text)

체크아웃 결과가 `partial` 또는 `incomplete`인 항목만 `Original Plan ID + Original Task ID` 기준으로 멱등 생성됩니다. 체크아웃 직후뿐 아니라 Recovery 조회 시에도 최근 62일의 저장된 체크아웃 결과와 대조해 누락된 Recovery만 생성하므로, Recovery 저장이 실패했거나 DB 설정 전에 저장된 체크아웃도 복구됩니다. 이월된 항목(`recoveryId` 보유)이 다시 미완료가 되면 새 Recovery를 만들지 않고 기존 Recovery를 `pending`으로 유지합니다. 다음 계획에 이월하면 `Carried Date`와 `Carried Task ID`를 기록하고, 이월 항목의 체크아웃 결과가 `completed`일 때만 `Recovery Status`를 `completed`로 변경합니다.

## 환경변수

스크립트가 `.env.local`에 다음 키를 추가하거나 갱신합니다.

```text
NOTION_DAILY_COMMITMENT_DATABASE_ID=
NOTION_DAILY_COMMITMENT_REVISION_DATABASE_ID=
NOTION_RECOVERY_DATABASE_ID=
NOTION_STUDENT_DATA_SOURCE_ID=
```

실제 토큰과 ID는 Git에 커밋하지 않습니다.

## Preview 테스트 환경

Preview는 `VERCEL_ENV=preview`일 때 자동으로 `_TEST` 환경변수를 사용합니다. 로컬에서 같은 동작을 확인하려면 `NOTION_DATA_MODE=test`를 설정합니다.

```text
NOTION_TOKEN_TEST=
NOTION_STUDENT_DATABASE_ID_TEST=
NOTION_WEEKLY_SCHEDULE_DATABASE_ID_TEST=
NOTION_DAILY_COMMITMENT_DATABASE_ID_TEST=
NOTION_DAILY_COMMITMENT_REVISION_DATABASE_ID_TEST=
NOTION_RECOVERY_DATABASE_ID_TEST=
```

테스트 학생명부와 모든 관련 DB는 운영 상위 페이지와 분리된 테스트 전용 상위 페이지에 구성합니다. `_TEST` 값이 없을 때 운영 DB로 대체하지 않으므로 Preview 배포 전에 모든 값을 등록해야 합니다.

## 데이터 정합성

당일 계획 페이지 갱신과 변경 이력 페이지 추가는 Notion API의 별도 요청입니다. 이력 생성이 실패하면 API는 성공을 반환하지 않지만, 이미 계획 페이지가 갱신된 경우 자동 롤백은 보장되지 않습니다. 향후 Supabase 이전 또는 코치용 운영 기능에서 트랜잭션·복구 처리를 추가해야 합니다.
