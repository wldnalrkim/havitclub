import { NextResponse } from "next/server";

const NOTION_VERSION = "2022-06-28";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_STUDENT_DATABASE_ID;

  if (!token || !databaseId) {
    return NextResponse.json(
      { ok: false, stage: "configuration" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${encodeURIComponent(databaseId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, stage: "notion_request" },
        { status: 502 },
      );
    }

    await response.body?.cancel();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, stage: "notion_request" },
      { status: 502 },
    );
  }
}
