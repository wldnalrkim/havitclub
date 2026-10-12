import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NOTION_VERSION = "2025-09-03";
const PARENT_PAGE_ID = process.argv[2]?.replaceAll("-", "").trim();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const studentRelationProperty = () => ({
  relation: {
    data_source_id:
      readEnv().NOTION_STUDENT_DATA_SOURCE_ID ||
      readEnv().NOTION_STUDENT_DATABASE_ID,
    single_property: {},
  },
});

const DATABASES = [
  {
    name: "해빗클럽 | Recovery",
    envKey: "NOTION_RECOVERY_DATABASE_ID",
    properties: {
      Name: { title: {} },
      "Recovery ID": { rich_text: {} },
      "Student ID": { rich_text: {} },
      Student: studentRelationProperty(),
      "Original Plan ID": { rich_text: {} },
      "Original Task ID": { rich_text: {} },
      "Original Date": { date: {} },
      Subject: { rich_text: {} },
      Content: { rich_text: {} },
      "Original Completion Status": {
        select: { options: [{ name: "partial" }, { name: "incomplete" }] },
      },
      "Incomplete Reason": { rich_text: {} },
      "Recovery Status": {
        select: { options: [{ name: "pending" }, { name: "completed" }] },
      },
      "Created At": { date: {} },
      "Updated At": { date: {} },
      "Completed At": { date: {} },
      "Carried Date": { date: {} },
      "Carried Task ID": { rich_text: {} },
    },
  },
  {
    name: "해빗클럽 | 당일 학습 계획",
    envKey: "NOTION_DAILY_COMMITMENT_DATABASE_ID",
    properties: {
      Name: { title: {} },
      "Student ID": { rich_text: {} },
      Student: studentRelationProperty(),
      Date: { date: {} },
      "Current Tasks": { rich_text: {} },
      "Initial Tasks": { rich_text: {} },
      "Initial Submitted At": { date: {} },
      "Updated At": { date: {} },
      Version: { number: {} },
      "Last Request ID": { rich_text: {} },
      "Checkout Result": { rich_text: {} },
      "Checked Out At": { date: {} },
      "Checkout Status": {
        select: { options: [{ name: "미체크아웃" }, { name: "체크아웃 완료" }] },
      },
      "Total Tasks": { number: {} },
      "Completed Tasks": { number: {} },
      "Partial Tasks": { number: {} },
      "Incomplete Tasks": { number: {} },
      "Needs Coaching": {
        select: {
          options: [{ name: "미체크아웃" }, { name: "확인 필요" }, { name: "검토 불필요" }],
        },
      },
      "Coach Review Status": {
        select: { options: [{ name: "확인 전" }, { name: "확인 완료" }] },
      },
      "Result Summary": { rich_text: {} },
      "Planned Check Out Time": { rich_text: {} },
      "Coach Note": { rich_text: {} },
      "Open Recovery Count": { number: {} },
    },
  },
  {
    name: "해빗클럽 | 당일 학습 계획 변경 이력",
    envKey: "NOTION_DAILY_COMMITMENT_REVISION_DATABASE_ID",
    properties: {
      Name: { title: {} },
      "Commitment ID": { rich_text: {} },
      "Student ID": { rich_text: {} },
      Student: studentRelationProperty(),
      Date: { date: {} },
      "Task ID": { rich_text: {} },
      Action: {
        select: { options: [{ name: "CREATE" }, { name: "UPDATE" }, { name: "DELETE" }] },
      },
      Before: { rich_text: {} },
      After: { rich_text: {} },
      "Changed At": { date: {} },
      "Changed By": { rich_text: {} },
      Version: { number: {} },
      "Request ID": { rich_text: {} },
    },
  },
];

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
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

function getTitle(item) {
  return item.title?.map((part) => part.plain_text ?? "").join("") ?? "";
}

function normalize(value) {
  return value?.replaceAll("-", "").trim() ?? "";
}

function getMissingProperties(database, definition) {
  const actual = database?.properties ?? {};
  const expected = definition.properties;
  const unexpected = Object.keys(actual).filter((name) => !expected[name]);
  const mismatched = Object.keys(actual).filter(
    (name) => expected[name] && actual[name]?.type !== Object.keys(expected[name])[0],
  );
  if (unexpected.length > 0 || mismatched.length > 0) return null;
  return Object.fromEntries(
    Object.entries(expected).filter(([name]) => !actual[name]),
  );
}

function matchesSchema(database, definition) {
  const actual = database?.properties ?? {};
  const expected = definition.properties;
  const names = Object.keys(expected);
  if (Object.keys(actual).length !== names.length) return false;
  return names.every((name) => actual[name]?.type === Object.keys(expected[name])[0]);
}

async function request(token, endpoint, init = {}, notionVersion = NOTION_VERSION) {
  return fetch(`https://api.notion.com/v1${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionVersion,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getDataSource(token, databaseId) {
  const databaseResponse = await request(token, `/databases/${databaseId}`);
  const database = await readJson(databaseResponse);
  const dataSourceId = database?.data_sources?.[0]?.id;
  if (!databaseResponse.ok || !dataSourceId) {
    throw new Error(`데이터 소스 조회 실패(${databaseResponse.status}).`);
  }
  const dataSourceResponse = await request(token, `/data_sources/${dataSourceId}`);
  const dataSource = await readJson(dataSourceResponse);
  if (!dataSourceResponse.ok || !dataSource?.id) {
    throw new Error(`데이터 소스 속성 조회 실패(${dataSourceResponse.status}).`);
  }
  return dataSource;
}

function updateEnv(values) {
  const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  let next = current;
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const expression = new RegExp(`^${key}=.*$`, "m");
    next = expression.test(next)
      ? next.replace(expression, line)
      : `${next}${next.endsWith("\n") || next.length === 0 ? "" : "\n"}${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, next);
}

async function main() {
  if (!/^[0-9a-f]{32}$/i.test(PARENT_PAGE_ID ?? "")) {
    throw new Error("상위 페이지 ID가 필요합니다.");
  }
  const token = readEnv().NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN이 없습니다.");

  const parentResponse = await request(token, `/pages/${PARENT_PAGE_ID}`);
  const parent = await readJson(parentResponse);
  if (!parentResponse.ok || parent?.object !== "page" || parent.archived === true) {
    throw new Error(`상위 페이지 접근 실패(${parentResponse.status}).`);
  }

  const configured = {};
  for (const definition of DATABASES) {
    const searchResponse = await request(token, "/search", {
      method: "POST",
      body: JSON.stringify({
        query: definition.name,
        filter: { property: "object", value: "database" },
        page_size: 100,
      }),
    }, "2022-06-28");
    const search = await readJson(searchResponse);
    if (!searchResponse.ok) throw new Error(`중복 확인 실패(${searchResponse.status}).`);

    const matches = (search.results ?? []).filter((item) =>
      getTitle(item) === definition.name &&
      normalize(item.parent?.page_id ?? item.parent?.block_id) === PARENT_PAGE_ID,
    );
    if (matches.length > 1) throw new Error(`동일한 DB가 여러 개 존재합니다: ${definition.name}`);

    let database = matches[0];
    let schemaTarget = database;
    if (database) {
      schemaTarget = await getDataSource(token, database.id);
      const missing = getMissingProperties(schemaTarget, definition);
      if (!missing) {
        throw new Error(`기존 DB 속성이 설정과 다릅니다: ${definition.name}`);
      }
      if (Object.keys(missing).length > 0) {
        const updateResponse = await request(token, `/data_sources/${schemaTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({ properties: missing }),
        });
        schemaTarget = await readJson(updateResponse);
        if (!updateResponse.ok || !schemaTarget?.id) {
          throw new Error(`DB 속성 추가 실패(${updateResponse.status}): ${definition.name}`);
        }
      }
    } else {
      const createResponse = await request(token, "/databases", {
        method: "POST",
        body: JSON.stringify({
          parent: { type: "page_id", page_id: PARENT_PAGE_ID },
          title: [{ type: "text", text: { content: definition.name } }],
          properties: definition.properties,
        }),
      });
      database = await readJson(createResponse);
      if (!createResponse.ok || !database?.id) {
        throw new Error(`DB 생성 실패(${createResponse.status}): ${definition.name}`);
      }
      schemaTarget = await getDataSource(token, database.id);
    }
    if (!matchesSchema(schemaTarget, definition)) {
      throw new Error(`생성된 DB 속성 검증 실패: ${definition.name}`);
    }
    configured[definition.envKey] = database.id;
  }

  updateEnv(configured);
  console.log(JSON.stringify({
    notionVersion: NOTION_VERSION,
    databaseCount: DATABASES.length,
    propertyCounts: DATABASES.map((definition) => Object.keys(definition.properties).length),
    environmentConfigured: true,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "설정 실패");
  process.exitCode = 1;
});
