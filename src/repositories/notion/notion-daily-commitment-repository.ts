import type {
  CheckoutTaskResult,
  DailyCheckout,
  DailyCommitment,
  DailyCommitmentInput,
  DailyCommitmentRevision,
  DailyCommitmentSummary,
  StudyTask,
} from "@/domain/daily-commitment/daily-commitment";
import type { DailyCommitmentRepository } from "@/repositories/interfaces/daily-commitment-repository";
import type { DailyCommitmentRevisionRepository } from "@/repositories/interfaces/daily-commitment-revision-repository";
import { getNotionEnvironmentVariable } from "@/infrastructure/notion/config";

const NOTION_VERSION = "2022-06-28";
const DAILY_DATABASE_ENV = "NOTION_DAILY_COMMITMENT_DATABASE_ID";
const REVISION_DATABASE_ENV = "NOTION_DAILY_COMMITMENT_REVISION_DATABASE_ID";
const CHUNK_SIZE = 1900;

const DAILY_PROPERTIES = {
  name: "Name",
  studentId: "Student ID",
  date: "Date",
  tasks: "Current Tasks",
  initialTasks: "Initial Tasks",
  initialSubmittedAt: "Initial Submitted At",
  updatedAt: "Updated At",
  version: "Version",
  requestId: "Last Request ID",
  checkoutResult: "Checkout Result",
  checkedOutAt: "Checked Out At",
  checkoutStatus: "Checkout Status",
  totalTasks: "Total Tasks",
  completedTasks: "Completed Tasks",
  partialTasks: "Partial Tasks",
  incompleteTasks: "Incomplete Tasks",
  needsCoaching: "Needs Coaching",
  coachReviewStatus: "Coach Review Status",
  resultSummary: "Result Summary",
  plannedCheckOutTime: "Planned Check Out Time",
  coachNote: "Coach Note",
  openRecoveryCount: "Open Recovery Count",
} as const;

const REVISION_PROPERTIES = {
  name: "Name",
  commitmentId: "Commitment ID",
  studentId: "Student ID",
  date: "Date",
  taskId: "Task ID",
  action: "Action",
  before: "Before",
  after: "After",
  changedAt: "Changed At",
  changedBy: "Changed By",
  version: "Version",
  requestId: "Request ID",
} as const;

type NotionText = { plain_text?: unknown; text?: { content?: unknown } };
type NotionProperty = {
  title?: NotionText[];
  rich_text?: NotionText[];
  date?: { start?: unknown } | null;
  number?: unknown;
  select?: { name?: unknown } | null;
  relation?: { id?: unknown }[];
};
type NotionPage = { id?: unknown; properties?: Record<string, NotionProperty> };
type NotionQueryResponse = {
  results?: NotionPage[];
  has_more?: unknown;
  next_cursor?: unknown;
};

const MAX_QUERY_PAGES = 5;

export class NotionDailyCommitmentRepositoryError extends Error {
  constructor() {
    super("당일 학습 계획 저장소에 접근할 수 없습니다.");
    this.name = "NotionDailyCommitmentRepositoryError";
  }
}

function textProperty(value: string) {
  return {
    rich_text: value
      ? Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) => ({
          type: "text",
          text: {
            content: value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
          },
        }))
      : [],
  };
}

function titleProperty(value: string) {
  return { title: [{ type: "text", text: { content: value } }] };
}

function dateProperty(value: string) {
  return { date: { start: value } };
}

function studentRelationProperty(studentId: string) {
  return { relation: [{ id: studentId }] };
}

function nullableNumberProperty(value: number | null) {
  return { number: value };
}

function summaryProperties(summary: DailyCommitmentSummary) {
  return {
    [DAILY_PROPERTIES.checkoutStatus]: { select: { name: summary.checkoutStatus } },
    [DAILY_PROPERTIES.totalTasks]: { number: summary.totalTasks },
    [DAILY_PROPERTIES.completedTasks]: nullableNumberProperty(summary.completedTasks),
    [DAILY_PROPERTIES.partialTasks]: nullableNumberProperty(summary.partialTasks),
    [DAILY_PROPERTIES.incompleteTasks]: nullableNumberProperty(summary.incompleteTasks),
    [DAILY_PROPERTIES.needsCoaching]: { select: { name: summary.needsCoaching } },
    [DAILY_PROPERTIES.resultSummary]: textProperty(summary.resultSummary),
    [DAILY_PROPERTIES.plannedCheckOutTime]: textProperty(summary.plannedCheckOutTime ?? ""),
    [DAILY_PROPERTIES.openRecoveryCount]: { number: summary.openRecoveryCount },
  };
}

function getText(property: NotionProperty | undefined) {
  const value = property?.rich_text
    ?.map((item) => item.plain_text ?? item.text?.content ?? "")
    .join("");
  return typeof value === "string" ? value : "";
}

function getDate(property: NotionProperty | undefined) {
  return typeof property?.date?.start === "string" ? property.date.start : "";
}

function getNumber(property: NotionProperty | undefined) {
  return typeof property?.number === "number" ? property.number : 0;
}

function parseTasks(value: string): StudyTask[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as StudyTask[]) : [];
  } catch {
    throw new NotionDailyCommitmentRepositoryError();
  }
}

function parseCheckout(value: string, checkedOutAt: string): DailyCheckout | null {
  if (!value || !checkedOutAt) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) throw new Error();
    return { results: parsed as CheckoutTaskResult[], checkedOutAt };
  } catch {
    throw new NotionDailyCommitmentRepositoryError();
  }
}

function toCommitment(page: NotionPage, studentId: string, date?: string): DailyCommitment {
  if (!page.id || !page.properties) {
    throw new NotionDailyCommitmentRepositoryError();
  }
  const properties = page.properties;
  const initialSubmittedAt = getDate(properties[DAILY_PROPERTIES.initialSubmittedAt]);
  const updatedAt = getDate(properties[DAILY_PROPERTIES.updatedAt]);
  const pageDate = date ?? getDate(properties[DAILY_PROPERTIES.date]).slice(0, 10);
  if (!initialSubmittedAt || !updatedAt || !pageDate) {
    throw new NotionDailyCommitmentRepositoryError();
  }
  return {
    id: String(page.id),
    studentId,
    date: pageDate,
    tasks: parseTasks(getText(properties[DAILY_PROPERTIES.tasks])),
    initialTasks: parseTasks(getText(properties[DAILY_PROPERTIES.initialTasks])),
    initialSubmittedAt,
    updatedAt,
    version: getNumber(properties[DAILY_PROPERTIES.version]),
    lastRequestId: getText(properties[DAILY_PROPERTIES.requestId]) || null,
    checkout: parseCheckout(
      getText(properties[DAILY_PROPERTIES.checkoutResult]),
      getDate(properties[DAILY_PROPERTIES.checkedOutAt]),
    ),
  };
}

function buildDailyProperties(
  studentId: string,
  input: DailyCommitmentInput,
  initialSubmittedAt: string,
  updatedAt: string,
  version: number,
  summary: DailyCommitmentSummary,
) {
  return {
    [DAILY_PROPERTIES.name]: titleProperty(`당일 학습 계획 ${input.date}`),
    [DAILY_PROPERTIES.studentId]: textProperty(studentId),
    Student: studentRelationProperty(studentId),
    [DAILY_PROPERTIES.date]: dateProperty(input.date),
    [DAILY_PROPERTIES.tasks]: textProperty(JSON.stringify(input.tasks)),
    [DAILY_PROPERTIES.initialTasks]: textProperty(JSON.stringify(input.tasks)),
    [DAILY_PROPERTIES.initialSubmittedAt]: dateProperty(initialSubmittedAt),
    [DAILY_PROPERTIES.updatedAt]: dateProperty(updatedAt),
    [DAILY_PROPERTIES.version]: { number: version },
    [DAILY_PROPERTIES.requestId]: textProperty(input.requestId ?? ""),
    ...summaryProperties(summary),
    [DAILY_PROPERTIES.coachReviewStatus]: { select: { name: "확인 전" } },
  };
}

function buildUpdateProperties(
  input: DailyCommitmentInput,
  updatedAt: string,
  version: number,
  summary: DailyCommitmentSummary,
) {
  return {
    [DAILY_PROPERTIES.tasks]: textProperty(JSON.stringify(input.tasks)),
    [DAILY_PROPERTIES.updatedAt]: dateProperty(updatedAt),
    [DAILY_PROPERTIES.version]: { number: version },
    [DAILY_PROPERTIES.requestId]: textProperty(input.requestId ?? ""),
    ...summaryProperties(summary),
  };
}

abstract class NotionRepositoryBase {
  protected get token() {
    const token = getNotionEnvironmentVariable("NOTION_TOKEN");
    if (!token) throw new NotionDailyCommitmentRepositoryError();
    return token;
  }

  protected async request(path: string, init: RequestInit) {
    let response: Response;
    try {
      response = await fetch(`https://api.notion.com/v1${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
          ...init.headers,
        },
        cache: "no-store",
      });
    } catch {
      throw new NotionDailyCommitmentRepositoryError();
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new NotionDailyCommitmentRepositoryError();
    }
    return response;
  }

  protected async query(
    databaseId: string,
    filter: Record<string, unknown>,
  ) {
    const pages: NotionPage[] = [];
    let cursor: string | undefined;
    for (let index = 0; index < MAX_QUERY_PAGES; index += 1) {
      const response = await this.request(
        `/databases/${encodeURIComponent(databaseId)}/query`,
        {
          method: "POST",
          body: JSON.stringify({ page_size: 100, filter, start_cursor: cursor }),
        },
      );
      let data: NotionQueryResponse;
      try {
        data = (await response.json()) as NotionQueryResponse;
      } catch {
        throw new NotionDailyCommitmentRepositoryError();
      }
      if (Array.isArray(data.results)) pages.push(...data.results);
      if (data.has_more !== true || typeof data.next_cursor !== "string") {
        return pages;
      }
      cursor = data.next_cursor;
    }
    throw new NotionDailyCommitmentRepositoryError();
  }
}

export class NotionDailyCommitmentRepository
  extends NotionRepositoryBase
  implements DailyCommitmentRepository
{
  private get databaseId() {
    const id = getNotionEnvironmentVariable(DAILY_DATABASE_ENV);
    if (!id) throw new NotionDailyCommitmentRepositoryError();
    return id;
  }

  private async findPage(studentId: string, date: string) {
    const pages = await this.query(this.databaseId, {
      and: [
        { property: DAILY_PROPERTIES.studentId, rich_text: { equals: studentId } },
        { property: DAILY_PROPERTIES.date, date: { equals: date } },
      ],
    });
    if (pages.length > 1) throw new NotionDailyCommitmentRepositoryError();
    return pages[0] ?? null;
  }

  async findByStudentAndDate(studentId: string, date: string) {
    const page = await this.findPage(studentId, date);
    return page ? toCommitment(page, studentId, date) : null;
  }

  async findByStudentAndDateRange(studentId: string, from: string, to: string) {
    const pages = await this.query(this.databaseId, {
      and: [
        { property: DAILY_PROPERTIES.studentId, rich_text: { equals: studentId } },
        { property: DAILY_PROPERTIES.date, date: { on_or_after: from } },
        { property: DAILY_PROPERTIES.date, date: { on_or_before: to } },
      ],
    });
    const commitments = pages.map((page) => toCommitment(page, studentId));
    const dates = new Set(commitments.map((commitment) => commitment.date));
    if (dates.size !== commitments.length) throw new NotionDailyCommitmentRepositoryError();
    return commitments.sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveCheckout(studentId: string, date: string, checkout: DailyCheckout) {
    const page = await this.findPage(studentId, date);
    if (!page?.id) throw new NotionDailyCommitmentRepositoryError();
    const response = await this.request(`/pages/${encodeURIComponent(String(page.id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: {
          [DAILY_PROPERTIES.checkoutResult]: textProperty(JSON.stringify(checkout.results)),
          [DAILY_PROPERTIES.checkedOutAt]: dateProperty(checkout.checkedOutAt),
        },
      }),
    });
    let updatedPage: NotionPage;
    try {
      updatedPage = (await response.json()) as NotionPage;
    } catch {
      throw new NotionDailyCommitmentRepositoryError();
    }
    return toCommitment(updatedPage, studentId, date);
  }

  async create(
    studentId: string,
    input: DailyCommitmentInput,
    submittedAt: string,
    summary: DailyCommitmentSummary,
  ) {
    const response = await this.request("/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: this.databaseId },
        properties: buildDailyProperties(
          studentId,
          input,
          submittedAt,
          submittedAt,
          1,
          summary,
        ),
      }),
    });
    let page: NotionPage;
    try {
      page = (await response.json()) as NotionPage;
    } catch {
      throw new NotionDailyCommitmentRepositoryError();
    }
    return toCommitment(page, studentId, input.date);
  }

  async update(
    studentId: string,
    input: DailyCommitmentInput,
    updatedAt: string,
    expectedVersion: number,
    summary: DailyCommitmentSummary,
  ) {
    const page = await this.findPage(studentId, input.date);
    if (!page?.id) throw new NotionDailyCommitmentRepositoryError();
    const response = await this.request(`/pages/${encodeURIComponent(String(page.id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: buildUpdateProperties(
          input,
          updatedAt,
          expectedVersion + 1,
          summary,
        ),
      }),
    });
    let updatedPage: NotionPage;
    try {
      updatedPage = (await response.json()) as NotionPage;
    } catch {
      throw new NotionDailyCommitmentRepositoryError();
    }
    return toCommitment(updatedPage, studentId, input.date);
  }

  async updateSummary(
    studentId: string,
    date: string,
    summary: DailyCommitmentSummary,
  ) {
    const page = await this.findPage(studentId, date);
    if (!page?.id) throw new NotionDailyCommitmentRepositoryError();
    const response = await this.request(`/pages/${encodeURIComponent(String(page.id))}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: summaryProperties(summary) }),
    });
    let updatedPage: NotionPage;
    try {
      updatedPage = (await response.json()) as NotionPage;
    } catch {
      throw new NotionDailyCommitmentRepositoryError();
    }
    return toCommitment(updatedPage, studentId, date);
  }
}

function revisionProperties(revision: Omit<DailyCommitmentRevision, "id">) {
  return {
    [REVISION_PROPERTIES.name]: titleProperty(`${revision.action} ${revision.date} ${revision.taskId}`),
    [REVISION_PROPERTIES.commitmentId]: textProperty(revision.commitmentId),
    [REVISION_PROPERTIES.studentId]: textProperty(revision.studentId),
    Student: studentRelationProperty(revision.studentId),
    [REVISION_PROPERTIES.date]: dateProperty(revision.date),
    [REVISION_PROPERTIES.taskId]: textProperty(revision.taskId),
    [REVISION_PROPERTIES.action]: { select: { name: revision.action } },
    [REVISION_PROPERTIES.before]: textProperty(revision.before ? JSON.stringify(revision.before) : ""),
    [REVISION_PROPERTIES.after]: textProperty(revision.after ? JSON.stringify(revision.after) : ""),
    [REVISION_PROPERTIES.changedAt]: dateProperty(revision.changedAt),
    [REVISION_PROPERTIES.changedBy]: textProperty(revision.changedBy),
    [REVISION_PROPERTIES.version]: { number: revision.version },
    [REVISION_PROPERTIES.requestId]: textProperty(""),
  };
}

export class NotionDailyCommitmentRevisionRepository
  extends NotionRepositoryBase
  implements DailyCommitmentRevisionRepository
{
  private get databaseId() {
    const id = getNotionEnvironmentVariable(REVISION_DATABASE_ENV);
    if (!id) throw new NotionDailyCommitmentRepositoryError();
    return id;
  }

  async findByCommitment(studentId: string, commitmentId: string) {
    const pages = await this.query(this.databaseId, {
      and: [
        { property: REVISION_PROPERTIES.studentId, rich_text: { equals: studentId } },
        { property: REVISION_PROPERTIES.commitmentId, rich_text: { equals: commitmentId } },
      ],
    });
    return pages.map((page) => {
      if (!page.id || !page.properties) throw new NotionDailyCommitmentRepositoryError();
      const properties = page.properties;
      const action = properties[REVISION_PROPERTIES.action]?.select?.name;
      if (
        typeof action !== "string" ||
        !["CREATE", "UPDATE", "DELETE"].includes(action)
      ) {
        throw new NotionDailyCommitmentRepositoryError();
      }
      return {
        id: String(page.id),
        commitmentId,
        studentId,
        date: getDate(properties[REVISION_PROPERTIES.date]),
        taskId: getText(properties[REVISION_PROPERTIES.taskId]),
        action: action as DailyCommitmentRevision["action"],
        before: parseOptionalTask(getText(properties[REVISION_PROPERTIES.before])),
        after: parseOptionalTask(getText(properties[REVISION_PROPERTIES.after])),
        changedAt: getDate(properties[REVISION_PROPERTIES.changedAt]),
        changedBy: getText(properties[REVISION_PROPERTIES.changedBy]) as "student",
        version: getNumber(properties[REVISION_PROPERTIES.version]),
      };
    });
  }

  async createMany(revisions: Omit<DailyCommitmentRevision, "id">[]) {
    const created: DailyCommitmentRevision[] = [];
    for (const revision of revisions) {
      const response = await this.request("/pages", {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: this.databaseId },
          properties: revisionProperties(revision),
        }),
      });
      let page: NotionPage;
      try {
        page = (await response.json()) as NotionPage;
      } catch {
        throw new NotionDailyCommitmentRepositoryError();
      }
      if (!page.id) throw new NotionDailyCommitmentRepositoryError();
      created.push({ ...revision, id: String(page.id) });
    }
    return created;
  }
}

function parseOptionalTask(value: string) {
  if (!value) return null;
  try {
    return JSON.parse(value) as StudyTask;
  } catch {
    throw new NotionDailyCommitmentRepositoryError();
  }
}
