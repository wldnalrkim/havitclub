import { NextResponse } from "next/server";
import {
  DailyCommitmentError,
  type CheckoutTaskResult,
  type DailyCheckoutInput,
} from "@/domain/daily-commitment/daily-commitment";
import { NotionRecoveryRepositoryError } from "@/repositories/notion/notion-recovery-repository";
import {
  dailyCommitmentService as service,
  errorResponse,
  getSession,
  getOperationalNow,
  mapDomainError,
  responseCommitment,
} from "../shared";

export const dynamic = "force-dynamic";

function parseInput(body: unknown): DailyCheckoutInput {
  if (typeof body !== "object" || body === null) {
    throw new DailyCommitmentError("INVALID_CHECKOUT");
  }
  const value = body as Record<string, unknown>;
  if (!Array.isArray(value.results)) {
    throw new DailyCommitmentError("INVALID_CHECKOUT");
  }
  const results = value.results.map((item): CheckoutTaskResult => {
    if (typeof item !== "object" || item === null) {
      throw new DailyCommitmentError("INVALID_CHECKOUT");
    }
    const result = item as Record<string, unknown>;
    return {
      taskId: typeof result.taskId === "string" ? result.taskId : "",
      status: result.status as CheckoutTaskResult["status"],
      reason: typeof result.reason === "string" ? result.reason : null,
    };
  });
  return {
    date: typeof value.date === "string" ? value.date : "",
    results,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let input: DailyCheckoutInput;
  try {
    input = parseInput(await request.json());
  } catch (error) {
    return mapDomainError(error) ?? errorResponse("INVALID_CHECKOUT", "체크아웃 내용을 다시 확인해주세요.", 400);
  }

  try {
    const commitment = await service.checkout(
      session.studentId,
      input,
      await getOperationalNow(),
    );
    return NextResponse.json({ ok: true, commitment: responseCommitment(commitment) });
  } catch (error) {
    if (error instanceof NotionRecoveryRepositoryError) {
      return errorResponse(
        "RECOVERY_SYNC_FAILED",
        "체크아웃 결과는 저장됐지만 이어서 할 일(Recovery) 기록에 실패했습니다. 다시 저장하면 빠진 항목만 기록됩니다.",
        503,
      );
    }
    return (
      mapDomainError(error) ??
      errorResponse("DAILY_COMMITMENT_UNAVAILABLE", "체크아웃을 저장할 수 없습니다. 잠시 후 다시 시도해주세요.", 503)
    );
  }
}
