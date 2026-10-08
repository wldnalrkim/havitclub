import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NOTION_VERSION = "2022-06-28";
const DATABASE_NAME = "해빗클럽 | 주간 등하원 계획";
const ENV_KEY = "NOTION_WEEKLY_SCHEDULE_DATABASE_ID";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");
const parentPageId = normalizeId(process.argv[2] ?? "");

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function normalizeId(value) {
  return value.replaceAll("-", "").trim();
}

function isPageId(value) {
  return /^[0-9a-f]{32}$/i.test(value);
}

function readEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function propertyDefinitions() {
  const properties = {
    Name: { title: {} },
    "Student ID": { rich_text: {} },
    "Week Start Date": { date: {} },
    "Submitted At": { date: {} },
    "Updated At": { date: {} },
  };

  for (const dayName of dayNames) {
    properties[`${dayName} Planned`] = { checkbox: {} };
    properties[`${dayName} Arrival`] = { rich_text: {} };
    properties[`${dayName} Departure`] = { rich_text: {} };
  }
  return properties;
}

function getTitle(item) {
  return item.title?.map((part) => part.plain_text ?? "").join("") ?? "";
}

function hasExpectedProperties(database) {
  const expected = propertyDefinitions();
  const actual = database?.properties ?? {};
  const actualNames = Object.keys(actual);
  const expectedNames = Object.keys(expected);
  if (
    actualNames.length !== expectedNames.length ||
    actualNames.some((name) => !expected[name])
  ) {
    return false;
  }
  return expectedNames.every((name) => actual[name]?.type === Object.keys(expected[name])[0]);
}

function updateEnvFile(databaseId) {
  const current = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";
  const line = `${ENV_KEY}=${databaseId}`;
  const expression = new RegExp(`^${ENV_KEY}=.*$`, "m");
  const next = expression.test(current)
    ? current.replace(expression, line)
    : `${current}${current.endsWith("\n") || current.length === 0 ? "" : "\n"}${line}\n`;
  fs.writeFileSync(envPath, next);
}

async function request(token, endpoint, init = {}) {
  return fetch(`https://api.notion.com/v1${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
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

async function main() {
  if (!isPageId(parentPageId)) {
    throw new Error("상위 페이지 ID가 올바르지 않습니다.");
  }

  const env = readEnvFile();
  const token = env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN이 없습니다.");

  const parentResponse = await request(token, `/pages/${parentPageId}`);
  const parent = await readJson(parentResponse);
  if (
    !parentResponse.ok ||
    parent?.object !== "page" ||
    parent.archived === true
  ) {
    throw new Error(`상위 페이지 접근 실패(${parentResponse.status}).`);
  }

  const searchResponse = await request(token, "/search", {
    method: "POST",
    body: JSON.stringify({
      query: DATABASE_NAME,
      filter: { property: "object", value: "database" },
      page_size: 100,
    }),
  });
  const search = await readJson(searchResponse);
  if (!searchResponse.ok) {
    throw new Error(`중복 확인 실패(${searchResponse.status}).`);
  }

  const matches = (search.results ?? []).filter((item) => {
    const itemParentId = normalizeId(
      item.parent?.page_id ?? item.parent?.block_id ?? "",
    );
    return getTitle(item) === DATABASE_NAME && itemParentId === parentPageId;
  });

  if (matches.length > 1) {
    throw new Error("동일한 이름의 주간계획 DB가 여러 개 존재합니다.");
  }

  let database;
  if (matches.length === 1) {
    database = matches[0];
    if (!hasExpectedProperties(database)) {
      throw new Error("기존 주간계획 DB의 속성이 설정과 일치하지 않습니다.");
    }
  } else {
    const createResponse = await request(token, "/databases", {
      method: "POST",
      body: JSON.stringify({
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ type: "text", text: { content: DATABASE_NAME } }],
        properties: propertyDefinitions(),
      }),
    });
    database = await readJson(createResponse);
    if (!createResponse.ok || !database?.id) {
      throw new Error(`데이터베이스 생성 실패(${createResponse.status}).`);
    }
  }

  if (!database?.id || !hasExpectedProperties(database)) {
    throw new Error("생성된 데이터베이스 속성 검증에 실패했습니다.");
  }

  updateEnvFile(database.id);
  console.log(JSON.stringify({
    notionVersion: NOTION_VERSION,
    created: matches.length === 0,
    propertyCount: Object.keys(database.properties).length,
    environmentConfigured: true,
    dataSourceCount: Array.isArray(database.data_sources)
      ? database.data_sources.length
      : null,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "설정 실패");
  process.exitCode = 1;
});
