# Habit Club 학생용 웹

## 프로젝트 목적

Habit Club은 중·고등학생이 다음 학습 루프를 경험하도록 돕는 모바일 웹입니다.

> 계획 → 실행 → 확인 → 미완료 복구 → 누적 피드백

학생은 단순한 화면에서 자신의 계획과 실행 상태를 관리하고, 코치는 기존처럼 Notion을 운영 도구로 사용합니다. 학생 웹은 Notion 화면을 직접 노출하지 않습니다.

## 현재 단계

현재 상태:

- **Phase 0 — Architecture Design: 완료**
- **Phase 1 — UI Prototype: 완료**
- **Phase 2 — Identity + Minimal Data Layer: 다음 단계**

Phase 1은 Mock Data 기반으로 구현되었으며, 실제 인증·세션·Notion 연동은 아직 추가하지 않았습니다.

## 기술 스택

초기 MVP:

- Next.js + App Router
- TypeScript
- Tailwind CSS
- Notion API
- Zod
- Server-side Session
- Vercel

향후 필요 시:

- Supabase Auth
- Supabase PostgreSQL

Next.js는 React 화면과 학생 식별·권한 검증·Notion 연동을 위한 얇은 서버 API를 한 프로젝트에서 관리하기 위해 선택합니다. Vite는 프론트엔드 빌드 도구이므로, 이 프로젝트에서 단독으로 사용하면 별도 백엔드가 필요합니다.

## 핵심 원칙

1. 학생 화면에서 Notion API를 직접 호출하지 않습니다.
2. `NOTION_API_KEY`는 서버에서만 사용합니다.
3. 전화번호 뒷자리는 학생 식별용 입력일 뿐, 고유 ID로 사용하지 않습니다.
4. UI, 비즈니스 규칙, Repository, 외부 API 연동을 분리합니다.
5. 학생은 서버 세션의 `studentId`에 해당하는 데이터만 조회·수정합니다.
6. 초기 MVP에는 AI 기능을 넣지 않습니다.
7. 기능은 Phase 단위로 구현하고 검증합니다.

## 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md): 시스템 구조, 도메인, 인증, 데이터 흐름, UI 설계
- [ROADMAP.md](./ROADMAP.md): Phase 0~8 개발 계획
- [habit_club_student_web_final_instructions.md](./habit_club_student_web_final_instructions.md): 원본 작업 지시서

## 예정 기능

- 학생 로그인
- 오늘 화면
- 오늘 계획 작성
- 체크아웃
- Recovery Plan
- 주간 내 현황

## 실행 방법

아직 애플리케이션 코드가 없어 실행할 프로젝트는 없습니다. Phase 1에서 Next.js 프로젝트를 생성한 후 다음 내용을 추가합니다.

- 설치 명령
- `.env.local` 설정
- 개발 서버 실행 명령
- 테스트 명령

## 환경변수 원칙

실제 키와 세션 비밀값은 커밋하지 않습니다. 구현 시 서버 전용 변수와 브라우저 공개 변수를 구분합니다.

초기 예정 변수:

```text
NOTION_API_KEY
SESSION_SECRET
```

학생 식별과 서버 세션 발급은 서버에서 처리합니다. Supabase를 도입하는 시점에 Supabase 관련 환경변수를 추가합니다.
