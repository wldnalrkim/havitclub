# 주간 등하원 계획 Notion 설정

Phase 3는 학생명부 데이터베이스와 별도의 Notion 데이터베이스를 사용합니다.

## 1. 데이터베이스 생성

새 데이터베이스를 만들고, 현재 사용 중인 Notion Integration을 연결합니다.
Integration에 페이지 생성·조회·수정 권한이 있어야 합니다.

데이터베이스 속성은 아래 이름과 타입을 그대로 사용합니다.

| 속성명 | 타입 |
| --- | --- |
| Name | Title |
| Student ID | Text |
| Week Start Date | Date |
| Submitted At | Date |
| Updated At | Date |

요일별로 다음 세 속성을 추가합니다.

| 속성명 | 타입 |
| --- | --- |
| Monday Planned / Tuesday Planned / Wednesday Planned / Thursday Planned / Friday Planned / Saturday Planned / Sunday Planned | Checkbox |
| Monday Arrival / Tuesday Arrival / Wednesday Arrival / Thursday Arrival / Friday Arrival / Saturday Arrival / Sunday Arrival | Text |
| Monday Departure / Tuesday Departure / Wednesday Departure / Thursday Departure / Friday Departure / Saturday Departure / Sunday Departure | Text |

이 구조는 코치가 학생·주차·요일별 계획을 Notion View에서 필터링할 수 있도록
등원 여부와 시간을 구조화해 저장합니다.

## 2. 환경변수

데이터베이스 ID를 확인한 뒤 `.env.local`에 아래 항목을 추가합니다.

```text
NOTION_WEEKLY_SCHEDULE_DATABASE_ID=
```

기존 `NOTION_TOKEN`, `NOTION_STUDENT_DATABASE_ID`, `SESSION_SECRET`은 그대로 사용합니다.
환경변수의 실제 값은 Git에 커밋하지 않습니다.

## 3. 확인

환경변수와 Integration 권한이 설정되기 전에는 주간 계획 API가 안전하게 오류를 반환하며,
학생명부 데이터베이스에는 주간 계획을 쓰지 않습니다.
