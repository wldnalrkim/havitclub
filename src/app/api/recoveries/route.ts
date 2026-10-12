import { NextResponse } from "next/server";
import { dailyCommitmentService, getOperationalNow, getSession } from "../daily-commitments/shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status");
  if (status && status !== "pending" && status !== "completed") {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATUS", message: "Recovery 상태를 확인해주세요." },
      { status: 400 },
    );
  }
  try {
    const all = await dailyCommitmentService.reconcileRecoveries(
      session.studentId,
      await getOperationalNow(),
    );
    const recoveries = status
      ? all.filter((recovery) => recovery.recoveryStatus === status)
      : all;
    return NextResponse.json({
      ok: true,
      count: recoveries.length,
      pendingCount: all.filter((recovery) => recovery.recoveryStatus === "pending").length,
      recoveries,
    });
  } catch {
    return NextResponse.json(
      { ok: false, code: "RECOVERY_UNAVAILABLE", message: "Recovery를 불러올 수 없습니다. 잠시 후 다시 시도해주세요." },
      { status: 503 },
    );
  }
}
