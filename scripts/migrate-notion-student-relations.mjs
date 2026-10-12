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
const token = env.NOTION_TOKEN;
const studentDatabaseId = env.NOTION_STUDENT_DATABASE_ID;
const databases = [
  ["daily", env.NOTION_DAILY_COMMITMENT_DATABASE_ID, "Student ID"],
  ["revisions", env.NOTION_DAILY_COMMITMENT_REVISION_DATABASE_ID, "Student ID"],
  ["recovery", env.NOTION_RECOVERY_DATABASE_ID, "Student ID"],
];

if (!token || !studentDatabaseId || databases.some(([, id]) => !id)) {
  throw new Error("Notion 관련 환경변수가 부족합니다.");
}

async function request(endpoint, init = {}, notionVersion = NOTION_VERSION) {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionVersion,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${response.status}: ${body?.message ?? "Notion API 오류"}`);
  }
  return body;
}

async function queryAll(databaseId) {
  const pages = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const result = await request(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    }, "2022-06-28");
    pages.push(...(result.results ?? []));
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);
  return pages;
}

function getStudentId(page, propertyName) {
  const property = page.properties?.[propertyName];
  return property?.rich_text?.map((part) => part.plain_text ?? "").join("").trim() ?? "";
}

async function verifyStudentPage(studentId) {
  const page = await request(`/pages/${studentId}`);
  return page.object === "page" && page.archived !== true;
}

async function main() {
  const summary = [];
  const verified = new Map();
  for (const [name, databaseId, studentIdProperty] of databases) {
    const pages = await queryAll(databaseId);
    let linked = 0;
    let skipped = 0;
    for (const page of pages) {
      const studentId = getStudentId(page, studentIdProperty);
      if (!studentId) {
        skipped += 1;
        continue;
      }
      if (!verified.has(studentId)) {
        verified.set(studentId, await verifyStudentPage(studentId));
      }
      if (!verified.get(studentId)) {
        skipped += 1;
        continue;
      }
      await request(`/pages/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          properties: {
            Student: { relation: [{ id: studentId }] },
          },
        }),
      });
      linked += 1;
    }
    summary.push({ database: name, inspected: pages.length, linked, skipped });
  }
  console.log(JSON.stringify({ relation: "Student", summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "마이그레이션 실패");
  process.exitCode = 1;
});
