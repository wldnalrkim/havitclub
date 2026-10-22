# 출결 Notion 읽기 연동

출결 연동은 기존 DB를 읽기 전용으로 조회합니다. n8n과 Notion 페이지를 생성·수정·삭제하지 않습니다.

## 환경변수

```text
NOTION_ATTENDANCE_DATABASE_ID=
# 선택: 설정하면 Database 조회를 생략하고 이 Data Source를 사용합니다.
NOTION_ATTENDANCE_DATA_SOURCE_ID=
```

Preview에서는 기존 환경 분리 규칙에 따라 다음 이름을 사용합니다.

```text
NOTION_ATTENDANCE_DATABASE_ID_TEST=
NOTION_ATTENDANCE_DATA_SOURCE_ID_TEST=
```

`NOTION_ATTENDANCE_DATA_SOURCE_ID`가 없으면 서버가 Database를 한 번 읽어 단일 Data Source ID를 확인합니다. 여러 Data Source가 있거나 속성이 맞지 않으면 운영 DB 전체 조회로 대체하지 않고 오류를 반환합니다.

## 필터 규칙

Notion 2025-09-03 API의 Data Source Query를 사용합니다. 속성명 대신 Data Source에서 확인한 속성 ID로 다음 조건을 함께 전송합니다.

- `🧑‍🎓 학생명부` Relation contains: 서버 세션의 `studentId`
- `날짜`: 요청 날짜 또는 날짜 범위

응답 페이지도 서버에서 다시 검증합니다.

- Relation이 정확히 세션 학생 ID 하나를 포함하는지
- `날짜`가 요청 범위 안에 있는지
- 메모가 `등원`, `외출`, `복귀`, `하원` 중 하나인지

## 시간 처리

등원·복귀는 `등원시각`, 외출·하원은 `하원시각`을 사용합니다. 시간에 날짜나 시간대가 없으므로 날짜를 임의로 붙이지 않습니다. 시간 필드가 비어 있거나 다른 이벤트 필드에만 값이 있으면 데이터 품질 상태로 반환하며 체류시간을 계산하지 않습니다.
