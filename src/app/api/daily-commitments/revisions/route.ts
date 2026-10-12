import { NextResponse } from "next/server";
import {
  getTodaySeoulDate,
  isValidDailyDate,
} from "@/domain/daily-commitment/daily-commitment";
import {
  dailyCommitmentService as service,
  getOperationalNow,
  getSession,
} from "../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const date =
    new URL(request.url).searchParams.get("date") ??
    getTodaySeoulDate(await getOperationalNow());
  if (!isValidDailyDate(date)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_DATE", message: "날짜 형식을 확인해주세요." },
      { status: 400 },
    );
  }

  try {
    const result = await service.get(session.studentId, date);
    if (!result.commitment) {
      return NextResponse.json({ ok: true, revisions: [] });
    }
    const revisions = await service.getRevisions(
      session.studentId,
      result.commitment.id,
    );
    return NextResponse.json({ ok: true, revisions });
  } catch {
    return NextResponse.json(
      { ok: false, code: "REVISION_UNAVAILABLE", message: "변경 이력을 불러올 수 없습니다." },
      { status: 503 },
    );
  }
}
