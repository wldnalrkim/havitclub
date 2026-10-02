import type { StudentLookupResult } from "@/domain/student/student";
import type { StudentRepository } from "@/repositories/interfaces/student-repository";

const NOTION_VERSION = "2022-06-28";
const ATTENDANCE_CODE_PROPERTY = "출결번호";
const STUDENT_NAME_PROPERTY = "학년 학교 이름";

type NotionText = {
  plain_text?: unknown;
};

type NotionPage = {
  id?: unknown;
  properties?: Record<
    string,
    {
      type?: unknown;
      title?: NotionText[];
      rich_text?: NotionText[];
    }
  >;
};

type NotionQueryResponse = {
  results?: NotionPage[];
};

class NotionStudentRepositoryError extends Error {
  constructor() {
    super("Notion 학생명부 조회에 실패했습니다.");
    this.name = "NotionStudentRepositoryError";
  }
}

function getTextValue(value: NotionText[] | undefined) {
  const text = value?.find((item) => typeof item.plain_text === "string")?.plain_text;
  return typeof text === "string" ? text.trim() : "";
}

export class NotionStudentRepository implements StudentRepository {
  async findByAttendanceCode(code: string): Promise<StudentLookupResult> {
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_STUDENT_DATABASE_ID;

    if (!token || !databaseId) {
      throw new NotionStudentRepositoryError();
    }

    let response: Response;
    try {
      response = await fetch(
        `https://api.notion.com/v1/databases/${encodeURIComponent(databaseId)}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
          },
          body: JSON.stringify({
            page_size: 2,
            filter: {
              property: ATTENDANCE_CODE_PROPERTY,
              rich_text: { equals: code },
            },
          }),
          cache: "no-store",
        },
      );
    } catch {
      throw new NotionStudentRepositoryError();
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new NotionStudentRepositoryError();
    }

    let data: NotionQueryResponse;
    try {
      data = (await response.json()) as NotionQueryResponse;
    } catch {
      throw new NotionStudentRepositoryError();
    }

    const pages = Array.isArray(data.results) ? data.results : [];
    if (pages.length === 0) {
      return { status: "not_found" };
    }
    if (pages.length > 1) {
      return { status: "ambiguous" };
    }

    const page = pages[0];
    const id = typeof page.id === "string" ? page.id : "";
    const nameProperty = page.properties?.[STUDENT_NAME_PROPERTY];
    const displayName = getTextValue(nameProperty?.title);

    if (!id) {
      throw new NotionStudentRepositoryError();
    }

    return {
      status: "found",
      student: {
        id,
        displayName: displayName || "학생",
      },
    };
  }
}

export { NotionStudentRepositoryError };
