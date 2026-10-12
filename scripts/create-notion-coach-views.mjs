import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const NOTION_VERSION = "2025-09-03";

function readEnv() {
  return Object.fromEntries(
    fs.readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

const env = readEnv();
const headers = {
  Authorization: `Bearer ${env.NOTION_TOKEN}`,
  "Notion-Version": NOTION_VERSION,
  "Content-Type": "application/json",
};

async function request(endpoint, init = {}) {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${response.status}: ${body?.message ?? "Notion API 오류"}`);
  }
  return body;
}

async function getDataSource(databaseId) {
  const database = await request(`/databases/${databaseId}`);
  const dataSourceId = database.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error(`데이터 소스를 찾을 수 없습니다: ${databaseId}`);
  const dataSource = await request(`/data_sources/${dataSourceId}`);
  return { database, dataSource };
}

async function getViews(databaseId) {
  const result = await request(`/views?database_id=${encodeURIComponent(databaseId)}`);
  const views = [];
  for (const item of result.results ?? []) {
    views.push(await request(`/views/${item.id}`));
  }
  return views;
}

function propertyConfig(properties, visible, widths = {}) {
  return Object.keys(properties).map((name) => ({
    property_id: name,
    visible: visible.has(name),
    ...(widths[name] ? { width: widths[name] } : {}),
  }));
}

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function ensureView(databaseId, dataSourceId, definition, existingViews) {
  const current = existingViews.find((view) => view.name === definition.name);
  const body = {
    database_id: databaseId,
    data_source_id: dataSourceId,
    name: definition.name,
    type: "table",
    ...(definition.filter ? { filter: definition.filter } : {}),
    ...(definition.sorts ? { sorts: definition.sorts } : {}),
    configuration: {
      type: "table",
      properties: definition.properties,
      wrap_cells: definition.wrapCells ?? true,
      show_vertical_lines: true,
      ...(definition.groupBy ? { group_by: definition.groupBy } : {}),
    },
  };
  if (current) {
    return request(`/views/${current.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: body.name,
        ...(body.filter ? { filter: body.filter } : {}),
        ...(body.sorts ? { sorts: body.sorts } : {}),
        configuration: body.configuration,
      }),
    });
  }
  return request("/views", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function main() {
  if (!env.NOTION_TOKEN) throw new Error("NOTION_TOKEN이 없습니다.");
  const daily = await getDataSource(env.NOTION_DAILY_COMMITMENT_DATABASE_ID);
  const recovery = await getDataSource(env.NOTION_RECOVERY_DATABASE_ID);
  const dailyViews = await getViews(env.NOTION_DAILY_COMMITMENT_DATABASE_ID);
  const recoveryViews = await getViews(env.NOTION_RECOVERY_DATABASE_ID);

  const dailyVisible = new Set([
    "Student", "Date", "Planned Check Out Time", "Checkout Status",
    "Checked Out At", "Total Tasks", "Completed Tasks", "Partial Tasks",
    "Incomplete Tasks", "Needs Coaching", "Coach Review Status",
    "Open Recovery Count", "Result Summary", "Coach Note",
  ]);
  const dailyWidths = {
    Student: 180, Date: 110, "Result Summary": 380, "Coach Note": 260,
  };
  const dailyProperties = propertyConfig(
    daily.dataSource.properties,
    dailyVisible,
    dailyWidths,
  );
  const date = seoulDate();
  const dailyDefinitions = [
    {
      name: "오늘의 학습 현황",
      filter: { property: "Date", date: { equals: date } },
      sorts: [{ property: "Student", direction: "ascending" }],
      properties: dailyProperties,
    },
    {
      name: "코칭 필요",
      filter: {
        or: [
          { property: "Needs Coaching", select: { equals: "확인 필요" } },
          { property: "Open Recovery Count", number: { greater_than: 0 } },
          { property: "Coach Review Status", select: { equals: "확인 전" } },
        ],
      },
      sorts: [{ property: "Date", direction: "descending" }],
      properties: dailyProperties,
    },
    {
      name: "학생별 학습 기록",
      sorts: [{ property: "Date", direction: "descending" }],
      groupBy: {
        type: "relation",
        property_id: daily.dataSource.properties.Student.id,
        sort: { type: "ascending" },
        hide_empty_groups: true,
      },
      properties: dailyProperties,
    },
    {
      name: "시스템 관리",
      sorts: [{ property: "Date", direction: "descending" }],
      wrapCells: false,
      properties: propertyConfig(daily.dataSource.properties, new Set(Object.keys(daily.dataSource.properties))),
    },
  ];

  const recoveryVisible = new Set([
    "Student", "Original Date", "Subject", "Content",
    "Original Completion Status", "Incomplete Reason", "Recovery Status",
    "Carried Date", "Carried Task ID",
  ]);
  const recoveryProperties = propertyConfig(recovery.dataSource.properties, recoveryVisible, {
    Student: 180, Content: 300, "Incomplete Reason": 240,
  });
  const recoveryView = await ensureView(
    env.NOTION_RECOVERY_DATABASE_ID,
    recovery.dataSource.id,
    {
      name: "미완료 Recovery",
      filter: { property: "Recovery Status", select: { equals: "pending" } },
      sorts: [{ property: "Original Date", direction: "ascending" }],
      properties: recoveryProperties,
    },
    recoveryViews,
  );

  const createdDaily = [];
  for (const definition of dailyDefinitions) {
    createdDaily.push(await ensureView(
      env.NOTION_DAILY_COMMITMENT_DATABASE_ID,
      daily.dataSource.id,
      definition,
      dailyViews,
    ));
  }

  console.log(JSON.stringify({
    notionVersion: NOTION_VERSION,
    dateFilter: date,
    views: [...createdDaily, recoveryView].map((view) => ({
      name: view.name,
      id: view.id,
      url: view.url,
      type: view.type,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "View 생성 실패");
  process.exitCode = 1;
});
