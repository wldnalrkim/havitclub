import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DailyCommitmentError,
  type DailyCommitment,
} from "@/domain/daily-commitment/daily-commitment";
import { DailyCommitmentService } from "@/application/services/daily-commitment-service";
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
} from "@/infrastructure/auth/session";
import {
  NotionDailyCommitmentRepository,
  NotionDailyCommitmentRevisionRepository,
} from "@/repositories/notion/notion-daily-commitment-repository";
import { NotionWeeklyScheduleRepository } from "@/repositories/notion/notion-weekly-schedule-repository";
import { RecoveryService } from "@/application/services/recovery-service";
import { DEV_DATE_COOKIE_NAME } from "@/lib/dev-date";
import { NotionRecoveryRepository } from "@/repositories/notion/notion-recovery-repository";

export const dailyCommitmentService = new DailyCommitmentService(
  new NotionDailyCommitmentRepository(),
  new NotionDailyCommitmentRevisionRepository(),
  new NotionWeeklyScheduleRepository(),
  new RecoveryService(new NotionRecoveryRepository()),
);

export async function getSession() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function getOperationalNow() {
  if (process.env.NODE_ENV === "production") return new Date();
  const cookieStore = await cookies();
  const value = cookieStore.get(DEV_DATE_COOKIE_NAME)?.value;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  return new Date(`${value}T12:00:00+09:00`);
}

export function responseCommitment(commitment: DailyCommitment | null) {
  if (!commitment) return null;
  return {
    date: commitment.date,
    tasks: commitment.tasks,
    initialTasks: commitment.initialTasks,
    initialSubmittedAt: commitment.initialSubmittedAt,
    updatedAt: commitment.updatedAt,
    version: commitment.version,
    checkout: commitment.checkout,
  };
}

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

const messages: Record<DailyCommitmentError["code"], string> = {
  INVALID_DATE: "날짜 형식을 확인해주세요.",
  DATE_NOT_TODAY: "오늘의 계획만 작성하거나 수정할 수 있습니다.",
  INVALID_TASKS: "과목과 학습 내용을 모두 입력해주세요.",
  TASK_LIMIT_EXCEEDED: "학습 항목은 최대 20개까지 입력할 수 있습니다.",
  VERSION_CONFLICT: "다른 기기에서 변경되었습니다. 최신 계획을 다시 불러와주세요.",
  CHECK_OUT_TIME_READ_ONLY:
    "예정 하원시간은 확정된 주간 계획을 기준으로 하며 직접 변경할 수 없습니다.",
  WEEKLY_SCHEDULE_NOT_FOUND:
    "주간 등하원 계획을 확인할 수 없습니다. 담당 코치에게 문의해주세요.",
  NOT_ATTENDING_TODAY: "오늘은 주간 계획상 미등원 예정일입니다.",
  COMMITMENT_NOT_FOUND: "오늘 제출한 계획이 없습니다. 계획을 먼저 제출해주세요.",
  CHECKED_OUT: "체크아웃을 마친 계획은 수정할 수 없습니다.",
  INVALID_CHECKOUT: "모든 계획의 결과를 선택하고, 일부 완료·미완료 사유를 입력해주세요.",
  INVALID_RANGE: "조회 기간을 확인해주세요.",
};

const statusByCode: Partial<Record<DailyCommitmentError["code"], number>> = {
  VERSION_CONFLICT: 409,
  CHECKED_OUT: 409,
  COMMITMENT_NOT_FOUND: 404,
};

export function mapDomainError(error: unknown) {
  if (!(error instanceof DailyCommitmentError)) return null;
  return errorResponse(error.code, messages[error.code], statusByCode[error.code] ?? 400);
}
