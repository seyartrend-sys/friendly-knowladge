import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("all private knowledge APIs enforce the session guard", async () => {
  const routes = [
    "app/api/bootstrap/route.ts",
    "app/api/entities/route.ts",
    "app/api/search/route.ts",
    "app/api/chat/route.ts",
    "app/api/analyze/route.ts",
  ];
  for (const route of routes) {
    const contents = await source(route);
    assert.match(contents, /isAuthorized\(request\)/, route);
    assert.match(contents, /unauthorizedResponse\(\)/, route);
  }
});

test("database migration includes every MVP knowledge entity", async () => {
  const migration = await source("database/migrations/001_initial.sql");
  for (const table of [
    "topics",
    "notes",
    "sources",
    "projects",
    "project_tasks",
    "knowledge_links",
    "chat_messages",
  ]) {
    assert.match(
      migration,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`),
      table,
    );
  }
  assert.match(migration, /USING gin \(search_vector\)/);
});

test("Render blueprint wires the app, database, security, and health check", async () => {
  const blueprint = await source("render.yaml");
  assert.match(blueprint, /runtime: node/);
  assert.match(blueprint, /healthCheckPath: \/api\/health/);
  assert.match(blueprint, /property: connectionString/);
  assert.match(blueprint, /key: APP_PASSWORD[\s\S]*sync: false/);
  assert.match(blueprint, /key: AUTH_SECRET[\s\S]*generateValue: true/);
});

test("secrets and local build artifacts are excluded from Git", async () => {
  const ignore = await source(".gitignore");
  assert.match(ignore, /^\.env\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(ignore, /^\/node_modules$/m);
  assert.match(ignore, /^\/\.next\/$/m);
});
