import {
  normalizeAttendanceEvent,
  selectEventTime,
  type AttendanceEvent,
} from "@/domain/attendance/attendance";
import type { AttendanceRepository } from "@/repositories/interfaces/attendance-repository";
import { getNotionEnvironmentVariable } from "@/infrastructure/notion/config";

const NOTION_VERSION = "2025-09-03";
const DATABASE_ENV = "NOTION_ATTENDANCE_DATABASE_ID";
const DATA_SOURCE_ENV = "NOTION_ATTENDANCE_DATA_SOURCE_ID";
const MAX_QUERY_PAGES = 100;
const MAX_REQUEST_ATTEMPTS = 3;

const PROPERTY_NAMES = {
  student: "🧑‍🎓 학생명부",
  memo: "메모",
  arrival: "등원시각",
  departure: "하원시각",
  date: "날짜",
  recordedAt: "🕒 기록시각",
} as const;

type NotionTextPart = {
  plain_text?: unknown;
  text?: { content?: unknown };
};

type NotionProperty = {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  title?: NotionTextPart[];
  rich_text?: NotionTextPart[];
  date?: { start?: unknown } | null;
  created_time?: unknown;
  relation?: { id?: unknown }[];
};

type NotionPage = {
  id?: unknown;
  properties?: Record<string, NotionProperty>;
};

type NotionListResponse = {
  results?: NotionPage[];
  has_more?: unknown;
  next_cursor?: unknown;
};

type PropertyIds = Record<keyof typeof PROPERTY_NAMES, string>;

export class NotionAttendanceRepositoryError extends Error {
  constructor(message = "출결 저장소에 접근할 수 없습니다.") {
    super(message);
    this.name = "NotionAttendanceRepositoryError";
  }
}

export class NotionAttendanceDataIntegrityError extends NotionAttendanceRepositoryError {
  constructor() {
    super("출결 데이터 구조를 확인할 수 없습니다.");
    this.name = "NotionAttendanceDataIntegrityError";
  }
}

function getText(property: NotionProperty | undefined) {
  return (property?.rich_text ?? property?.title ?? [])
    .map((part) => part.plain_text ?? part.text?.content ?? "")
    .join("")
    .trim();
}

function getDate(property: NotionProperty | undefined) {
  return typeof property?.date?.start === "string"
    ? property.date.start
    : null;
}

function getRelationIds(property: NotionProperty | undefined) {
  return (property?.relation ?? [])
    .map((relation) => relation.id)
    .filter((id): id is string => typeof id === "string");
}

export class NotionAttendanceRepository implements AttendanceRepository {
  private configPromise?: Promise<{
    dataSourceId: string;
    propertyIds: PropertyIds;
  }>;

  private get config() {
    this.configPromise ??= this.loadConfig();
    return this.configPromise;
  }

  private async request(path: string, init: RequestInit = {}) {
    const token = getNotionEnvironmentVariable("NOTION_TOKEN");
    if (!token) throw new NotionAttendanceRepositoryError();

    for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
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
        if (attempt === MAX_REQUEST_ATTEMPTS) {
          throw new NotionAttendanceRepositoryError();
        }
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        continue;
      }

      const retryable = [429, 500, 502, 503, 504].includes(response.status);
      if (response.ok) return response;
      if (!retryable || attempt === MAX_REQUEST_ATTEMPTS) {
        await response.body?.cancel();
        throw new NotionAttendanceRepositoryError();
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      await response.body?.cancel();
      await new Promise((resolve) =>
        setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 2000) : 200 * attempt),
      );
    }
    throw new NotionAttendanceRepositoryError();
  }

  private async loadConfig() {
    const databaseId = getNotionEnvironmentVariable(DATABASE_ENV);
    if (!databaseId) throw new NotionAttendanceRepositoryError();

    const configuredDataSourceId = getNotionEnvironmentVariable(DATA_SOURCE_ENV);
    let dataSourceId = configuredDataSourceId;
    if (!dataSourceId) {
      const response = await this.request(
        `/databases/${encodeURIComponent(databaseId)}`,
      );
      let database: {
        data_sources?: { id?: unknown }[];
      };
      try {
        database = (await response.json()) as typeof database;
      } catch {
        throw new NotionAttendanceRepositoryError();
      }
      const dataSources = database.data_sources ?? [];
      if (dataSources.length !== 1 || typeof dataSources[0]?.id !== "string") {
        throw new NotionAttendanceRepositoryError(
          "출결 데이터 소스를 하나로 확인할 수 없습니다.",
        );
      }
      dataSourceId = dataSources[0].id;
    }

    const response = await this.request(
      `/data_sources/${encodeURIComponent(dataSourceId)}`,
    );
    let dataSource: { properties?: Record<string, NotionProperty> };
    try {
      dataSource = (await response.json()) as typeof dataSource;
    } catch {
      throw new NotionAttendanceRepositoryError();
    }

    const propertyIds = {} as PropertyIds;
    for (const [key, name] of Object.entries(PROPERTY_NAMES) as [
      keyof typeof PROPERTY_NAMES,
      string,
    ][]) {
      const property = Object.values(dataSource.properties ?? {}).find(
        (candidate) => candidate.name === name,
      );
      if (!property || typeof property.id !== "string") {
        throw new NotionAttendanceRepositoryError(
          `출결 속성을 확인할 수 없습니다: ${name}`,
        );
      }
      propertyIds[key] = property.id;
    }

    return { dataSourceId, propertyIds };
  }

  private async query(
    studentId: string,
    from: string,
    to: string,
  ): Promise<NotionPage[]> {
    const { dataSourceId, propertyIds } = await this.config;
    const pages: NotionPage[] = [];
    let cursor: string | undefined;

    for (let index = 0; index < MAX_QUERY_PAGES; index += 1) {
      const response = await this.request(
        `/data_sources/${encodeURIComponent(dataSourceId)}/query`,
        {
          method: "POST",
          body: JSON.stringify({
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
            filter: {
              and: [
                {
                  property: propertyIds.student,
                  relation: { contains: studentId },
                },
                {
                  property: propertyIds.date,
                  date: { on_or_after: from, on_or_before: to },
                },
              ],
            },
          }),
        },
      );

      let data: NotionListResponse;
      try {
        data = (await response.json()) as NotionListResponse;
      } catch {
        throw new NotionAttendanceRepositoryError();
      }
      if (!Array.isArray(data.results)) {
        throw new NotionAttendanceRepositoryError();
      }
      pages.push(...data.results);
      if (data.has_more !== true || typeof data.next_cursor !== "string") {
        return pages;
      }
      cursor = data.next_cursor;
    }
    throw new NotionAttendanceRepositoryError(
      "출결 조회 결과가 허용된 페이지 수를 초과했습니다.",
    );
  }

  private toAttendanceEvent(page: NotionPage, studentId: string) {
    if (!page.id || !page.properties) {
      throw new NotionAttendanceDataIntegrityError();
    }
    const properties = page.properties;
    const relationIds = getRelationIds(properties[PROPERTY_NAMES.student]);
    const date = getDate(properties[PROPERTY_NAMES.date]);
    const event = normalizeAttendanceEvent(
      getText(properties[PROPERTY_NAMES.memo]),
    );
    if (
      typeof page.id !== "string" ||
      relationIds.length !== 1 ||
      relationIds[0] !== studentId ||
      !date ||
      !event
    ) {
      throw new NotionAttendanceDataIntegrityError();
    }

    const selectedTime = selectEventTime(
      event,
      getText(properties[PROPERTY_NAMES.arrival]),
      getText(properties[PROPERTY_NAMES.departure]),
    );
    const recordedValue = properties[PROPERTY_NAMES.recordedAt]?.created_time;
    const recordedAt =
      typeof recordedValue === "string" ? recordedValue : null;

    return {
      id: page.id,
      studentId,
      date,
      event,
      eventTime: selectedTime.value,
      eventTimeSource: selectedTime.source,
      timeQuality: selectedTime.quality,
      recordedAt,
    } satisfies AttendanceEvent;
  }

  private async find(
    studentId: string,
    from: string,
    to: string,
  ): Promise<AttendanceEvent[]> {
    const pages = await this.query(studentId, from, to);
    const events = pages.map((page) => this.toAttendanceEvent(page, studentId));
    return events.filter((event) => event.date >= from && event.date <= to);
  }

  async findByStudentAndDate(studentId: string, date: string) {
    return this.find(studentId, date, date);
  }

  async findByStudentAndDateRange(studentId: string, from: string, to: string) {
    return this.find(studentId, from, to);
  }
}
