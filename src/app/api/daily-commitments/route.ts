import { NextResponse } from "next/server";
import {
  DailyCommitmentError,
  getTodaySeoulDate,
  isValidDailyDate,
  type DailyCommitmentInput,
  type StudyTask,
} from "@/domain/daily-commitment/daily-commitment";
import { NotionDailyCommitmentRepositoryError } from "@/repositories/notion/notion-daily-commitment-repository";
import {
  dailyCommitmentService as service,
  errorResponse,
  getSession,
  getOperationalNow,
  mapDomainError,
  responseCommitment,
} from "./shared";

export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  const date = value ?? getTodaySeoulDate();
  if (!isValidDailyDate(date)) throw new DailyCommitmentError("INVALID_DATE");
  return date;
}

function parseInput(body: unknown): DailyCommitmentInput {
  if (typeof body !== "object" || body === null) {
    throw new DailyCommitmentError("INVALID_TASKS");
  }
  const value = body as Record<string, unknown>;
  const rawTasks = value.tasks;
  if (!Array.isArray(rawTasks)) {
    throw new DailyCommitmentError("INVALID_TASKS");
  }
  const tasks: StudyTask[] = rawTasks.map((task) => {
    if (typeof task !== "object" || task === null) {
      throw new DailyCommitmentError("INVALID_TASKS");
    }
    const item = task as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : "",
      subject: typeof item.subject === "string" ? item.subject : "",
      description:
        typeof item.description === "string" ? item.description : "",
      ...(typeof item.recoveryId === "string" ? { recoveryId: item.recoveryId } : {}),
    };
  });
  const input: DailyCommitmentInput = {
    date: typeof value.date === "string" ? value.date : "",
    tasks,
  };
  if (Object.prototype.hasOwnProperty.call(value, "plannedCheckOutTime")) {
    input.plannedCheckOutTime = value.plannedCheckOutTime;
  }
  if (typeof value.expectedVersion === "number") {
    input.expectedVersion = value.expectedVersion;
  }
  if (typeof value.requestId === "string") {
    input.requestId = value.requestId;
  }
  return input;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let date: string;
  try {
    date = parseDate(new URL(request.url).searchParams.get("date") ?? getTodaySeoulDate(await getOperationalNow()));
  } catch (error) {
    return mapDomainError(error) ?? errorResponse("INVALID_DATE", "날짜 형식을 확인해주세요.", 400);
  }

  try {
    const result = await service.get(session.studentId, date);
    return NextResponse.json({
      ok: true,
      date,
      commitment: responseCommitment(result.commitment),
      plannedCheckOut: result.plannedCheckOut,
    });
  } catch (error) {
    if (error instanceof NotionDailyCommitmentRepositoryError) {
      return errorResponse("DAILY_COMMITMENT_UNAVAILABLE", "오늘 계획을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.", 503);
    }
    return errorResponse("DAILY_COMMITMENT_UNAVAILABLE", "오늘 계획을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.", 503);
  }
}

export async function POST(request: Request) {
  return save(request);
}

export async function PATCH(request: Request) {
  return save(request);
}

async function save(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let input: DailyCommitmentInput;
  try {
    input = parseInput(await request.json());
  } catch (error) {
    return mapDomainError(error) ?? errorResponse("INVALID_TASKS", "학습 항목을 다시 확인해주세요.", 400);
  }

  try {
    const result = await service.save(session.studentId, input, await getOperationalNow());
    return NextResponse.json({
      ok: true,
      created: result.created,
      idempotent: result.idempotent,
      commitment: responseCommitment(result.commitment),
      plannedCheckOut: result.plannedCheckOut,
    });
  } catch (error) {
    const domainResponse = mapDomainError(error);
    if (domainResponse) return domainResponse;
    if (error instanceof NotionDailyCommitmentRepositoryError) {
      return errorResponse("DAILY_COMMITMENT_UNAVAILABLE", "오늘 계획을 저장할 수 없습니다. 잠시 후 다시 시도해주세요.", 503);
    }
    return errorResponse("DAILY_COMMITMENT_UNAVAILABLE", "오늘 계획을 저장할 수 없습니다. 잠시 후 다시 시도해주세요.", 503);
  }
}
