export type KnowledgeStage =
  | "بذرة"
  | "بحث"
  | "موثّق"
  | "معرفة"
  | "تطبيق"
  | "أرشيف";

export type Topic = {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  stage: KnowledgeStage;
  noteCount: number;
  sourceCount: number;
  progress: number;
  updatedAt: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  summary: string;
  kind: "note" | "idea" | "question" | "research";
  stage: KnowledgeStage;
  tags: string[];
  topicId: string | null;
  topicTitle?: string;
  createdAt: string;
  updatedAt: string;
};

export type Source = {
  id: string;
  title: string;
  url: string;
  author: string;
  sourceType: "article" | "book" | "video" | "paper" | "podcast";
  status: "unread" | "reading" | "complete";
  topicId: string | null;
  topicTitle?: string;
  createdAt: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  status: "idea" | "active" | "paused" | "complete";
  progress: number;
  dueDate: string | null;
  topicIds: string[];
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeLink = {
  id: string;
  sourceType: "topic" | "note" | "source" | "project";
  sourceId: string;
  targetType: "topic" | "note" | "source" | "project";
  targetId: string;
  relation: string;
  confidence: number;
  reason: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: "demo" | "connected";
  createdAt: string;
};

export type SearchResult = {
  id: string;
  type: "topic" | "note" | "source" | "project";
  title: string;
  excerpt: string;
  meta: string;
};

export type DashboardData = {
  mode: "demo" | "database";
  aiConnected: boolean;
  topics: Topic[];
  notes: Note[];
  sources: Source[];
  projects: Project[];
  links: KnowledgeLink[];
  messages: ChatMessage[];
  stats: {
    topics: number;
    notes: number;
    sources: number;
    projects: number;
    connections: number;
  };
};

export type EntityKind = "topic" | "note" | "source" | "project";

export type CreateEntityPayload = {
  type: EntityKind;
  title: string;
  description?: string;
  content?: string;
  topicId?: string | null;
  url?: string;
  author?: string;
  kind?: Note["kind"];
  sourceType?: Source["sourceType"];
  tags?: string[];
  dueDate?: string | null;
};
