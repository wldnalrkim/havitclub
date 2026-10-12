import { NextResponse } from "next/server";
import { dailyCommitmentService, getOperationalNow, getSession } from "../../daily-commitments/shared";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recoveryId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const { recoveryId } = await params;
  try {
    const recoveries = await dailyCommitmentService.reconcileRecoveries(
      session.studentId,
      await getOperationalNow(),
    );
    const recovery = recoveries.find((item) => item.id === recoveryId);
    if (!recovery) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Recovery를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, recovery });
  } catch {
    return NextResponse.json(
      { ok: false, code: "RECOVERY_UNAVAILABLE", message: "Recovery를 불러올 수 없습니다. 잠시 후 다시 시도해주세요." },
      { status: 503 },
    );
  }
}
