import type {
  PlannedDay,
  WeeklySchedule,
  WeeklyScheduleInput,
} from "@/domain/weekly-schedule/weekly-schedule";
import type { WeeklyScheduleRepository } from "@/repositories/interfaces/weekly-schedule-repository";

const NOTION_VERSION = "2022-06-28";
const NAME_PROPERTY = "Name";
const STUDENT_ID_PROPERTY = "Student ID";
const WEEK_START_PROPERTY = "Week Start Date";
const SUBMITTED_AT_PROPERTY = "Submitted At";
const UPDATED_AT_PROPERTY = "Updated At";

const DAY_PROPERTY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type NotionText = {
  plain_text?: unknown;
};

type NotionProperty = {
  title?: NotionText[];
  rich_text?: NotionText[];
  checkbox?: unknown;
  date?: { start?: unknown } | null;
};

type NotionPage = {
  id?: unknown;
  properties?: Record<string, NotionProperty>;
};

type NotionQueryResponse = {
  results?: NotionPage[];
};

export class NotionWeeklyScheduleRepositoryError extends Error {
  constructor() {
    super("주간 계획 저장소에 접근할 수 없습니다.");
    this.name = "NotionWeeklyScheduleRepositoryError";
  }
}

function textProperty(content: string | null) {
  return {
    rich_text: content
      ? [{ type: "text", text: { content } }]
      : [],
  };
}

function titleProperty(content: string) {
  return {
    title: [{ type: "text", text: { content } }],
  };
}

function dateProperty(value: string) {
  return { date: { start: value } };
}

function getText(property: NotionProperty | undefined) {
  const value = property?.rich_text?.find(
    (item) => typeof item.plain_text === "string",
  )?.plain_text;
  return typeof value === "string" ? value : "";
}

function getDate(property: NotionProperty | undefined) {
  const value = property?.date?.start;
  return typeof value === "string" ? value : "";
}

function toWeeklySchedule(
  page: NotionPage,
  studentId: string,
  weekStartDate: string,
) {
  const properties = page.properties;
  if (!properties) throw new NotionWeeklyScheduleRepositoryError();

  const days: PlannedDay[] = DAY_PROPERTY_NAMES.map((propertyName, index) => {
    const isPlanned = properties[`${propertyName} Planned`]?.checkbox === true;
    const plannedArrivalTime = getText(
      properties[`${propertyName} Arrival`],
    );
    const plannedDepartureTime = getText(
      properties[`${propertyName} Departure`],
    );

    return {
      date: addDays(weekStartDate, index),
      isPlanned,
      plannedArrivalTime: isPlanned ? plannedArrivalTime || null : null,
      plannedDepartureTime: isPlanned ? plannedDepartureTime || null : null,
    };
  });

  const submittedAt = getDate(properties[SUBMITTED_AT_PROPERTY]);
  const updatedAt = getDate(properties[UPDATED_AT_PROPERTY]);
  if (!submittedAt || !updatedAt) {
    throw new NotionWeeklyScheduleRepositoryError();
  }

  return {
    studentId,
    weekStartDate,
    days,
    submittedAt,
    updatedAt,
  };
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export class NotionWeeklyScheduleRepository
  implements WeeklyScheduleRepository
{
  private getConfig() {
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_WEEKLY_SCHEDULE_DATABASE_ID;
    if (!token || !databaseId) {
      throw new NotionWeeklyScheduleRepositoryError();
    }
    return { token, databaseId };
  }

  private async request(
    path: string,
    init: RequestInit,
  ) {
    const { token } = this.getConfig();
    let response: Response;
    try {
      response = await fetch(`https://api.notion.com/v1${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          ...init.headers,
        },
        cache: "no-store",
      });
    } catch {
      throw new NotionWeeklyScheduleRepositoryError();
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new NotionWeeklyScheduleRepositoryError();
    }
    return response;
  }

  private async findPage(
    studentId: string,
    weekStartDate: string,
  ) {
    const { databaseId } = this.getConfig();
    const response = await this.request(
      `/databases/${encodeURIComponent(databaseId)}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_size: 2,
          filter: {
            and: [
              {
                property: STUDENT_ID_PROPERTY,
                rich_text: { equals: studentId },
              },
              {
                property: WEEK_START_PROPERTY,
                date: { equals: weekStartDate },
              },
            ],
          },
        }),
      },
    );

    let data: NotionQueryResponse;
    try {
      data = (await response.json()) as NotionQueryResponse;
    } catch {
      throw new NotionWeeklyScheduleRepositoryError();
    }

    const pages = Array.isArray(data.results) ? data.results : [];
    if (pages.length > 1) {
      throw new NotionWeeklyScheduleRepositoryError();
    }
    return pages[0] ?? null;
  }

  async findByStudentAndWeek(
    studentId: string,
    weekStartDate: string,
  ): Promise<WeeklySchedule | null> {
    const page = await this.findPage(studentId, weekStartDate);
    return page
      ? toWeeklySchedule(page, studentId, weekStartDate)
      : null;
  }

  private buildProperties(
    studentId: string,
    input: WeeklyScheduleInput,
    submittedAt: string,
    updatedAt: string,
  ) {
    const properties: Record<string, unknown> = {
      [NAME_PROPERTY]: titleProperty(`주간 등하원 계획 ${input.weekStartDate}`),
      [STUDENT_ID_PROPERTY]: textProperty(studentId),
      [WEEK_START_PROPERTY]: dateProperty(input.weekStartDate),
      [SUBMITTED_AT_PROPERTY]: dateProperty(submittedAt),
      [UPDATED_AT_PROPERTY]: dateProperty(updatedAt),
    };

    input.days.forEach((day, index) => {
      const propertyName = DAY_PROPERTY_NAMES[index];
      properties[`${propertyName} Planned`] = { checkbox: day.isPlanned };
      properties[`${propertyName} Arrival`] = textProperty(
        day.plannedArrivalTime,
      );
      properties[`${propertyName} Departure`] = textProperty(
        day.plannedDepartureTime,
      );
    });

    return properties;
  }

  async create(
    studentId: string,
    input: WeeklyScheduleInput,
    submittedAt: string,
  ) {
    const updatedAt = submittedAt;
    const { databaseId } = this.getConfig();
    const response = await this.request("/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: this.buildProperties(
          studentId,
          input,
          submittedAt,
          updatedAt,
        ),
      }),
    });
    await response.body?.cancel();

    return {
      studentId,
      weekStartDate: input.weekStartDate,
      days: input.days,
      submittedAt,
      updatedAt,
    };
  }

  async update(
    existing: WeeklySchedule,
    input: WeeklyScheduleInput,
    updatedAt: string,
  ) {
    const page = await this.findPage(
      existing.studentId,
      existing.weekStartDate,
    );
    if (!page || typeof page.id !== "string") {
      throw new NotionWeeklyScheduleRepositoryError();
    }

    const response = await this.request(
      `/pages/${encodeURIComponent(page.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: this.buildProperties(
            existing.studentId,
            input,
            existing.submittedAt,
            updatedAt,
          ),
        }),
      },
    );
    await response.body?.cancel();

    return {
      studentId: existing.studentId,
      weekStartDate: input.weekStartDate,
      days: input.days,
      submittedAt: existing.submittedAt,
      updatedAt,
    };
  }
}
