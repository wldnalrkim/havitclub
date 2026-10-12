import type { Recovery, RecoveryInput, RecoveryStatus } from "@/domain/recovery/recovery";
import type { RecoveryRepository } from "@/repositories/interfaces/recovery-repository";
import { randomUUID } from "node:crypto";

const NOTION_VERSION = "2022-06-28";
const MAX_QUERY_PAGES = 10;
const PROPERTIES = {
  name: "Name",
  id: "Recovery ID",
  studentId: "Student ID",
  planId: "Original Plan ID",
  taskId: "Original Task ID",
  date: "Original Date",
  subject: "Subject",
  content: "Content",
  completionStatus: "Original Completion Status",
  reason: "Incomplete Reason",
  status: "Recovery Status",
  createdAt: "Created At",
  updatedAt: "Updated At",
  completedAt: "Completed At",
  carriedDate: "Carried Date",
  carriedTaskId: "Carried Task ID",
} as const;

type TextPart = { plain_text?: unknown; text?: { content?: unknown } };
type Property = {
  title?: TextPart[];
  rich_text?: TextPart[];
  date?: { start?: unknown } | null;
  select?: { name?: unknown } | null;
};
type Page = { id?: unknown; properties?: Record<string, Property> };

export class NotionRecoveryRepositoryError extends Error {
  constructor() {
    super("Recovery 저장소에 접근할 수 없습니다.");
    this.name = "NotionRecoveryRepositoryError";
  }
}

function text(value: string) {
  return { rich_text: value ? [{ type: "text", text: { content: value } }] : [] };
}
function title(value: string) {
  return { title: [{ type: "text", text: { content: value } }] };
}
function date(value: string | null) {
  return { date: value ? { start: value } : null };
}
function getText(property: Property | undefined) {
  return (property?.rich_text ?? property?.title ?? [])
    .map((part) => part.plain_text ?? part.text?.content ?? "")
    .join("");
}
function getDate(property: Property | undefined) {
  return typeof property?.date?.start === "string" ? property.date.start : null;
}
function getSelect(property: Property | undefined) {
  return typeof property?.select?.name === "string" ? property.select.name : "";
}

export class NotionRecoveryRepository implements RecoveryRepository {
  private get databaseId() {
    const value = process.env.NOTION_RECOVERY_DATABASE_ID;
    if (!value) throw new NotionRecoveryRepositoryError();
    return value;
  }

  private async request(path: string, init: RequestInit) {
    const token = process.env.NOTION_TOKEN;
    if (!token) throw new NotionRecoveryRepositoryError();
    let response: Response;
    try {
      response = await fetch(`https://api.notion.com/v1${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
          ...init.headers,
        },
        cache: "no-store",
      });
    } catch {
      throw new NotionRecoveryRepositoryError();
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new NotionRecoveryRepositoryError();
    }
    return response;
  }

  private async query(filter: Record<string, unknown>) {
    const pages: Page[] = [];
    let cursor: string | undefined;
    for (let index = 0; index < MAX_QUERY_PAGES; index += 1) {
      const response = await this.request(`/databases/${this.databaseId}/query`, {
        method: "POST",
        body: JSON.stringify({ page_size: 100, filter, start_cursor: cursor }),
      });
      let data: { results?: Page[]; has_more?: unknown; next_cursor?: unknown };
      try {
        data = (await response.json()) as typeof data;
      } catch {
        throw new NotionRecoveryRepositoryError();
      }
      if (Array.isArray(data.results)) pages.push(...data.results);
      if (data.has_more !== true || typeof data.next_cursor !== "string") {
        return pages;
      }
      cursor = data.next_cursor;
    }
    throw new NotionRecoveryRepositoryError();
  }

  private toRecovery(page: Page, studentId: string): Recovery {
    if (!page.id || !page.properties) throw new NotionRecoveryRepositoryError();
    const p = page.properties;
    const status = getSelect(p[PROPERTIES.status]);
    const originalStatus = getSelect(p[PROPERTIES.completionStatus]);
    if (
      !["pending", "completed"].includes(status) ||
      !["partial", "incomplete"].includes(originalStatus)
    ) {
      throw new NotionRecoveryRepositoryError();
    }
    const createdAt = getDate(p[PROPERTIES.createdAt]);
    const updatedAt = getDate(p[PROPERTIES.updatedAt]);
    if (!createdAt || !updatedAt) throw new NotionRecoveryRepositoryError();
    return {
      id: getText(p[PROPERTIES.id]) || String(page.id),
      studentId,
      originalPlanId: getText(p[PROPERTIES.planId]),
      originalTaskId: getText(p[PROPERTIES.taskId]),
      originalDate: getDate(p[PROPERTIES.date]) ?? "",
      subject: getText(p[PROPERTIES.subject]),
      content: getText(p[PROPERTIES.content]),
      originalCompletionStatus: originalStatus as "partial" | "incomplete",
      incompleteReason: getText(p[PROPERTIES.reason]) || null,
      recoveryStatus: status as RecoveryStatus,
      createdAt,
      updatedAt,
      completedAt: getDate(p[PROPERTIES.completedAt]),
      carriedDate: getDate(p[PROPERTIES.carriedDate]),
      carriedTaskId: getText(p[PROPERTIES.carriedTaskId]) || null,
    };
  }

  async findByStudent(studentId: string, status?: RecoveryStatus) {
    const filters: Record<string, unknown>[] = [
      { property: PROPERTIES.studentId, rich_text: { equals: studentId } },
    ];
    if (status) filters.push({ property: PROPERTIES.status, select: { equals: status } });
    return (await this.query({ and: filters })).map((page) => this.toRecovery(page, studentId));
  }

  async findById(studentId: string, recoveryId: string) {
    const pages = await this.query({
      and: [
        { property: PROPERTIES.studentId, rich_text: { equals: studentId } },
        { property: PROPERTIES.id, rich_text: { equals: recoveryId } },
      ],
    });
    if (pages.length > 1) throw new NotionRecoveryRepositoryError();
    return pages[0] ? this.toRecovery(pages[0], studentId) : null;
  }

  async create(input: RecoveryInput & { studentId: string }) {
    const id = randomUUID();
    const properties = {
      [PROPERTIES.name]: title(`${input.originalDate} ${input.task.subject}`),
      [PROPERTIES.id]: text(id),
      [PROPERTIES.studentId]: text(input.studentId),
      Student: { relation: [{ id: input.studentId }] },
      [PROPERTIES.planId]: text(input.commitmentId),
      [PROPERTIES.taskId]: text(input.task.id),
      [PROPERTIES.date]: date(input.originalDate),
      [PROPERTIES.subject]: text(input.task.subject),
      [PROPERTIES.content]: text(input.task.description),
      [PROPERTIES.completionStatus]: { select: { name: input.status } },
      [PROPERTIES.reason]: text(input.reason ?? ""),
      [PROPERTIES.status]: { select: { name: "pending" } },
      [PROPERTIES.createdAt]: date(input.createdAt),
      [PROPERTIES.updatedAt]: date(input.createdAt),
      [PROPERTIES.completedAt]: date(null),
      [PROPERTIES.carriedDate]: date(null),
      [PROPERTIES.carriedTaskId]: text(""),
    };
    const response = await this.request("/pages", {
      method: "POST",
      body: JSON.stringify({ parent: { database_id: this.databaseId }, properties }),
    });
    try {
      const page = (await response.json()) as Page;
      if (!page.id) throw new Error();
      return this.toRecovery(page, input.studentId);
    } catch {
      throw new NotionRecoveryRepositoryError();
    }
  }

  private async updatePage(studentId: string, recoveryId: string, properties: Record<string, unknown>) {
    const pages = await this.query({
      and: [
        { property: PROPERTIES.studentId, rich_text: { equals: studentId } },
        { property: PROPERTIES.id, rich_text: { equals: recoveryId } },
      ],
    });
    if (pages.length !== 1 || !pages[0].id) throw new NotionRecoveryRepositoryError();
    const response = await this.request(`/pages/${pages[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
    try {
      return this.toRecovery((await response.json()) as Page, studentId);
    } catch {
      throw new NotionRecoveryRepositoryError();
    }
  }

  async markCarried(studentId: string, recoveryId: string, carriedDate: string, carriedTaskId: string, updatedAt: string) {
    return this.updatePage(studentId, recoveryId, {
      [PROPERTIES.carriedDate]: date(carriedDate),
      [PROPERTIES.carriedTaskId]: text(carriedTaskId),
      [PROPERTIES.updatedAt]: date(updatedAt),
    });
  }

  async complete(studentId: string, recoveryId: string, completedAt: string) {
    return this.updatePage(studentId, recoveryId, {
      [PROPERTIES.status]: { select: { name: "completed" } },
      [PROPERTIES.completedAt]: date(completedAt),
      [PROPERTIES.updatedAt]: date(completedAt),
    });
  }
}
