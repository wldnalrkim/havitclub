import { NextResponse } from "next/server";
import {
  dailyCommitmentService as service,
  errorResponse,
  getSession,
  mapDomainError,
  responseCommitment,
} from "../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  try {
    const commitments = await service.getRange(session.studentId, from, to);
    return NextResponse.json({
      ok: true,
      from,
      to,
      commitments: commitments.map(responseCommitment),
    });
  } catch (error) {
    return (
      mapDomainError(error) ??
      errorResponse("DAILY_COMMITMENT_UNAVAILABLE", "학습 기록을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.", 503)
    );
  }
}
