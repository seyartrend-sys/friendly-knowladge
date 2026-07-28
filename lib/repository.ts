import { randomUUID } from "node:crypto";
import postgres, { type Sql } from "postgres";
import {
  demoLinks,
  demoMessages,
  demoNotes,
  demoProjects,
  demoSources,
  demoTopics,
} from "./demo-data";
import type {
  ChatMessage,
  CreateEntityPayload,
  DashboardData,
  KnowledgeLink,
  Note,
  Project,
  SearchResult,
  Source,
  Topic,
} from "./types";

type DemoStore = {
  topics: Topic[];
  notes: Note[];
  sources: Source[];
  projects: Project[];
  links: KnowledgeLink[];
  messages: ChatMessage[];
};

const globalState = globalThis as unknown as {
  nusuqSql?: Sql;
  nusuqDemoStore?: DemoStore;
};

function demoStore(): DemoStore {
  if (!globalState.nusuqDemoStore) {
    globalState.nusuqDemoStore = {
      topics: structuredClone(demoTopics),
      notes: structuredClone(demoNotes),
      sources: structuredClone(demoSources),
      projects: structuredClone(demoProjects),
      links: structuredClone(demoLinks),
      messages: structuredClone(demoMessages),
    };
  }
  return globalState.nusuqDemoStore;
}

function database(): Sql | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  globalState.nusuqSql ??= postgres(url, {
    max: 6,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return globalState.nusuqSql;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}

function rowToTopic(row: Record<string, unknown>): Topic {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    color: String(row.color ?? "#7968e8"),
    icon: String(row.icon ?? "✦"),
    stage: (row.stage ?? "بذرة") as Topic["stage"],
    noteCount: Number(row.note_count ?? 0),
    sourceCount: Number(row.source_count ?? 0),
    progress: Number(row.progress ?? 10),
    updatedAt: iso(row.updated_at),
  };
}

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content ?? ""),
    summary: String(row.summary ?? ""),
    kind: (row.kind ?? "note") as Note["kind"],
    stage: (row.stage ?? "بذرة") as Note["stage"],
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    topicId: row.topic_id ? String(row.topic_id) : null,
    topicTitle: row.topic_title ? String(row.topic_title) : undefined,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function rowToSource(row: Record<string, unknown>): Source {
  return {
    id: String(row.id),
    title: String(row.title),
    url: String(row.url ?? ""),
    author: String(row.author ?? ""),
    sourceType: (row.source_type ?? "article") as Source["sourceType"],
    status: (row.status ?? "unread") as Source["status"],
    topicId: row.topic_id ? String(row.topic_id) : null,
    topicTitle: row.topic_title ? String(row.topic_title) : undefined,
    createdAt: iso(row.created_at),
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    status: (row.status ?? "idea") as Project["status"],
    progress: Number(row.progress ?? 0),
    dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
    topicIds: Array.isArray(row.topic_ids) ? row.topic_ids.map(String) : [],
    taskCount: Number(row.task_count ?? 0),
    completedTaskCount: Number(row.completed_task_count ?? 0),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function getDashboardData(): Promise<DashboardData> {
  const sql = database();
  if (!sql) {
    const store = demoStore();
    return {
      mode: "demo",
      aiConnected: Boolean(process.env.AI_API_KEY?.trim()),
      topics: store.topics,
      notes: store.notes,
      sources: store.sources,
      projects: store.projects,
      links: store.links,
      messages: store.messages.slice(-30),
      stats: {
        topics: store.topics.length,
        notes: store.notes.length,
        sources: store.sources.length,
        projects: store.projects.length,
        connections: store.links.length,
      },
    };
  }

  const [topicRows, noteRows, sourceRows, projectRows, linkRows, messageRows] =
    await Promise.all([
      sql`
        SELECT t.*,
          COUNT(DISTINCT n.id)::int AS note_count,
          COUNT(DISTINCT s.id)::int AS source_count
        FROM topics t
        LEFT JOIN notes n ON n.topic_id = t.id
        LEFT JOIN sources s ON s.topic_id = t.id
        GROUP BY t.id
        ORDER BY t.updated_at DESC
        LIMIT 60
      `,
      sql`
        SELECT n.*, t.title AS topic_title
        FROM notes n
        LEFT JOIN topics t ON t.id = n.topic_id
        ORDER BY n.updated_at DESC
        LIMIT 100
      `,
      sql`
        SELECT s.*, t.title AS topic_title
        FROM sources s
        LEFT JOIN topics t ON t.id = s.topic_id
        ORDER BY s.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT p.*,
          COALESCE(array_agg(DISTINCT pt.topic_id)
            FILTER (WHERE pt.topic_id IS NOT NULL), '{}') AS topic_ids,
          COUNT(DISTINCT task.id)::int AS task_count,
          COUNT(DISTINCT task.id) FILTER (WHERE task.completed)::int
            AS completed_task_count
        FROM projects p
        LEFT JOIN project_topics pt ON pt.project_id = p.id
        LEFT JOIN project_tasks task ON task.project_id = p.id
        GROUP BY p.id
        ORDER BY p.updated_at DESC
        LIMIT 60
      `,
      sql`
        SELECT id, source_type, source_id, target_type, target_id,
          relation, confidence, reason
        FROM knowledge_links
        ORDER BY created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT id, role, content, provider, created_at
        FROM chat_messages
        ORDER BY created_at ASC
        LIMIT 60
      `,
    ]);

  const links = linkRows.map((row) => ({
    id: String(row.id),
    sourceType: row.source_type as KnowledgeLink["sourceType"],
    sourceId: String(row.source_id),
    targetType: row.target_type as KnowledgeLink["targetType"],
    targetId: String(row.target_id),
    relation: String(row.relation),
    confidence: Number(row.confidence),
    reason: String(row.reason ?? ""),
  }));

  return {
    mode: "database",
    aiConnected: Boolean(process.env.AI_API_KEY?.trim()),
    topics: topicRows.map(rowToTopic),
    notes: noteRows.map(rowToNote),
    sources: sourceRows.map(rowToSource),
    projects: projectRows.map(rowToProject),
    links,
    messages: messageRows.map((row) => ({
      id: String(row.id),
      role: row.role as ChatMessage["role"],
      content: String(row.content),
      provider: (row.provider ?? "demo") as ChatMessage["provider"],
      createdAt: iso(row.created_at),
    })),
    stats: {
      topics: topicRows.length,
      notes: noteRows.length,
      sources: sourceRows.length,
      projects: projectRows.length,
      connections: links.length,
    },
  };
}

const topicColors = ["#7968e8", "#e79f66", "#55a69b", "#d36c72", "#4d87c7"];
const topicIcons = ["✦", "◉", "♫", "◇", "⌁"];

export async function createEntity(
  payload: CreateEntityPayload,
): Promise<Topic | Note | Source | Project> {
  const title = payload.title.trim();
  if (!title) throw new Error("العنوان مطلوب");
  const sql = database();
  const now = new Date().toISOString();
  const id = randomUUID();

  if (!sql) {
    const store = demoStore();
    if (payload.type === "topic") {
      const topic: Topic = {
        id,
        title,
        description: payload.description?.trim() ?? "",
        color: topicColors[store.topics.length % topicColors.length],
        icon: topicIcons[store.topics.length % topicIcons.length],
        stage: "بذرة",
        noteCount: 0,
        sourceCount: 0,
        progress: 12,
        updatedAt: now,
      };
      store.topics.unshift(topic);
      return topic;
    }
    if (payload.type === "note") {
      const topic = store.topics.find((item) => item.id === payload.topicId);
      const content = payload.content?.trim() ?? "";
      const note: Note = {
        id,
        title,
        content,
        summary:
          content.length > 150 ? `${content.slice(0, 147)}…` : content,
        kind: payload.kind ?? "note",
        stage: "بذرة",
        tags: payload.tags ?? [],
        topicId: payload.topicId ?? null,
        topicTitle: topic?.title,
        createdAt: now,
        updatedAt: now,
      };
      store.notes.unshift(note);
      if (topic) topic.noteCount += 1;
      return note;
    }
    if (payload.type === "source") {
      const topic = store.topics.find((item) => item.id === payload.topicId);
      const source: Source = {
        id,
        title,
        url: payload.url?.trim() ?? "",
        author: payload.author?.trim() ?? "",
        sourceType: payload.sourceType ?? "article",
        status: "unread",
        topicId: payload.topicId ?? null,
        topicTitle: topic?.title,
        createdAt: now,
      };
      store.sources.unshift(source);
      if (topic) topic.sourceCount += 1;
      return source;
    }
    const project: Project = {
      id,
      title,
      description: payload.description?.trim() ?? "",
      status: "idea",
      progress: 8,
      dueDate: payload.dueDate ?? null,
      topicIds: payload.topicId ? [payload.topicId] : [],
      taskCount: 0,
      completedTaskCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    store.projects.unshift(project);
    return project;
  }

  if (payload.type === "topic") {
    const index = Math.floor(Math.random() * topicColors.length);
    const [row] = await sql`
      INSERT INTO topics (id, title, description, color, icon, stage, progress)
      VALUES (
        ${id}, ${title}, ${payload.description?.trim() ?? ""},
        ${topicColors[index]}, ${topicIcons[index]}, 'بذرة', 12
      )
      RETURNING *, 0::int AS note_count, 0::int AS source_count
    `;
    return rowToTopic(row);
  }
  if (payload.type === "note") {
    const content = payload.content?.trim() ?? "";
    const summary =
      content.length > 150 ? `${content.slice(0, 147)}…` : content;
    const [row] = await sql`
      INSERT INTO notes (
        id, title, content, summary, kind, stage, tags, topic_id
      )
      VALUES (
        ${id}, ${title}, ${content}, ${summary}, ${payload.kind ?? "note"},
        'بذرة', ${payload.tags ?? []}, ${payload.topicId ?? null}
      )
      RETURNING *, (
        SELECT title FROM topics WHERE id = ${payload.topicId ?? null}
      ) AS topic_title
    `;
    return rowToNote(row);
  }
  if (payload.type === "source") {
    const [row] = await sql`
      INSERT INTO sources (
        id, title, url, author, source_type, status, topic_id
      )
      VALUES (
        ${id}, ${title}, ${payload.url?.trim() ?? ""},
        ${payload.author?.trim() ?? ""}, ${payload.sourceType ?? "article"},
        'unread', ${payload.topicId ?? null}
      )
      RETURNING *, (
        SELECT title FROM topics WHERE id = ${payload.topicId ?? null}
      ) AS topic_title
    `;
    return rowToSource(row);
  }

  const [row] = await sql`
    INSERT INTO projects (
      id, title, description, status, progress, due_date
    )
    VALUES (
      ${id}, ${title}, ${payload.description?.trim() ?? ""}, 'idea', 8,
      ${payload.dueDate ?? null}
    )
    RETURNING *, '{}'::uuid[] AS topic_ids, 0::int AS task_count,
      0::int AS completed_task_count
  `;
  if (payload.topicId) {
    await sql`
      INSERT INTO project_topics (project_id, topic_id)
      VALUES (${id}, ${payload.topicId})
      ON CONFLICT DO NOTHING
    `;
    row.topic_ids = [payload.topicId];
  }
  return rowToProject(row);
}

export async function searchKnowledge(query: string): Promise<SearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const sql = database();
  if (!sql) {
    const store = demoStore();
    const needle = normalized.toLocaleLowerCase("ar");
    const contains = (...parts: (string | undefined)[]) =>
      parts.join(" ").toLocaleLowerCase("ar").includes(needle);
    return [
      ...store.topics
        .filter((item) => contains(item.title, item.description))
        .map((item) => ({
          id: item.id,
          type: "topic" as const,
          title: item.title,
          excerpt: item.description,
          meta: `${item.noteCount} ملاحظات`,
        })),
      ...store.notes
        .filter((item) =>
          contains(item.title, item.content, item.summary, ...item.tags),
        )
        .map((item) => ({
          id: item.id,
          type: "note" as const,
          title: item.title,
          excerpt: item.summary || item.content.slice(0, 160),
          meta: item.topicTitle ?? "ملاحظة",
        })),
      ...store.sources
        .filter((item) => contains(item.title, item.author))
        .map((item) => ({
          id: item.id,
          type: "source" as const,
          title: item.title,
          excerpt: item.author,
          meta: item.topicTitle ?? "مصدر",
        })),
      ...store.projects
        .filter((item) => contains(item.title, item.description))
        .map((item) => ({
          id: item.id,
          type: "project" as const,
          title: item.title,
          excerpt: item.description,
          meta: `${item.progress}% مكتمل`,
        })),
    ].slice(0, 20);
  }

  const pattern = `%${normalized}%`;
  const rows = await sql`
    SELECT * FROM (
      SELECT id, 'topic' AS type, title, description AS excerpt,
        stage AS meta, 1 AS rank
      FROM topics
      WHERE title ILIKE ${pattern} OR description ILIKE ${pattern}
      UNION ALL
      SELECT n.id, 'note' AS type, n.title,
        COALESCE(NULLIF(n.summary, ''), LEFT(n.content, 180)) AS excerpt,
        COALESCE(t.title, n.kind) AS meta, 2 AS rank
      FROM notes n
      LEFT JOIN topics t ON t.id = n.topic_id
      WHERE n.title ILIKE ${pattern} OR n.content ILIKE ${pattern}
        OR n.summary ILIKE ${pattern}
      UNION ALL
      SELECT s.id, 'source' AS type, s.title, s.author AS excerpt,
        COALESCE(t.title, s.source_type) AS meta, 3 AS rank
      FROM sources s
      LEFT JOIN topics t ON t.id = s.topic_id
      WHERE s.title ILIKE ${pattern} OR s.author ILIKE ${pattern}
      UNION ALL
      SELECT id, 'project' AS type, title, description AS excerpt,
        CONCAT(progress, '% مكتمل') AS meta, 4 AS rank
      FROM projects
      WHERE title ILIKE ${pattern} OR description ILIKE ${pattern}
    ) results
    ORDER BY rank, title
    LIMIT 24
  `;
  return rows.map((row) => ({
    id: String(row.id),
    type: row.type as SearchResult["type"],
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    meta: String(row.meta ?? ""),
  }));
}

export async function recentContext(query: string): Promise<SearchResult[]> {
  const results = await searchKnowledge(query);
  if (results.length) return results.slice(0, 6);
  const data = await getDashboardData();
  return data.notes.slice(0, 4).map((note) => ({
    id: note.id,
    type: "note",
    title: note.title,
    excerpt: note.summary || note.content.slice(0, 180),
    meta: note.topicTitle ?? "ملاحظة",
  }));
}

export async function saveChatExchange(
  userContent: string,
  assistantContent: string,
  provider: "demo" | "connected",
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  const now = new Date();
  const user: ChatMessage = {
    id: randomUUID(),
    role: "user",
    content: userContent,
    createdAt: now.toISOString(),
  };
  const assistant: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    content: assistantContent,
    provider,
    createdAt: new Date(now.getTime() + 1).toISOString(),
  };
  const sql = database();
  if (!sql) {
    demoStore().messages.push(user, assistant);
    return { user, assistant };
  }
  await sql`
    INSERT INTO chat_messages (id, thread_id, role, content, provider, created_at)
    VALUES
      (${user.id}, 'default', 'user', ${user.content}, null, ${now}),
      (${assistant.id}, 'default', 'assistant', ${assistant.content},
        ${provider}, ${new Date(now.getTime() + 1)})
  `;
  return { user, assistant };
}

export async function healthCheck(): Promise<{
  status: "ok";
  database: "connected" | "demo";
  ai: "connected" | "demo";
}> {
  const sql = database();
  if (sql) await sql`SELECT 1`;
  return {
    status: "ok",
    database: sql ? "connected" : "demo",
    ai: process.env.AI_API_KEY?.trim() ? "connected" : "demo",
  };
}
