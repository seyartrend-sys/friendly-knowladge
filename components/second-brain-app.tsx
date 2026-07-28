"use client";

import {
  ArrowUp,
  Bell,
  Bookmark,
  BookOpen,
  Brain,
  CheckCircle,
  ChevronLeft,
  Command,
  ExternalLink,
  FileText,
  FolderKanban,
  Layers,
  Library,
  Lightbulb,
  Link as LinkIcon,
  Loader,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  Network,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChatMessage,
  CreateEntityPayload,
  DashboardData,
  EntityKind,
  Note,
  Project,
  SearchResult,
  Source,
  Topic,
} from "@/lib/types";

type ViewId =
  | "dashboard"
  | "chat"
  | "topics"
  | "notes"
  | "sources"
  | "projects"
  | "map";

type NavItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
};

const mainNav: NavItem[] = [
  { id: "dashboard", label: "اليوم", icon: Layers },
  { id: "chat", label: "المحادثة", icon: MessageCircle },
  { id: "topics", label: "المواضيع", icon: Library },
  { id: "notes", label: "الملاحظات", icon: FileText },
  { id: "sources", label: "المصادر", icon: Bookmark },
  { id: "projects", label: "المشاريع", icon: FolderKanban },
  { id: "map", label: "خريطة المعرفة", icon: Network },
];

const viewTitles: Record<ViewId, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: {
    eyebrow: "مساحتك اليوم",
    title: "صباح المعرفة",
    subtitle: "التقط فكرة، عمّق رابطاً، أو حوّل ما تعرفه إلى خطوة.",
  },
  chat: {
    eyebrow: "رفيق التفكير",
    title: "محادثة معرفية",
    subtitle: "إجابات مرتبطة بملاحظاتك ومصادرك، لا محادثة معزولة.",
  },
  topics: {
    eyebrow: "مجالاتك",
    title: "المواضيع",
    subtitle: "مساحات حيّة تنمو كلما أضفت معرفة أو اكتشفت رابطاً.",
  },
  notes: {
    eyebrow: "ذاكرتك",
    title: "الملاحظات والأفكار",
    subtitle: "من البذرة الأولى إلى معرفة قابلة للاستخدام.",
  },
  sources: {
    eyebrow: "أصول المعرفة",
    title: "المصادر",
    subtitle: "كل ما تقرأه وتشاهدُه وتريد العودة إليه.",
  },
  projects: {
    eyebrow: "المعرفة في العمل",
    title: "المشاريع",
    subtitle: "حوّل الروابط والأفكار إلى نتائج يمكن إنجازها.",
  },
  map: {
    eyebrow: "الصورة الأوسع",
    title: "خريطة المعرفة",
    subtitle: "اكتشف كيف تتقاطع المواضيع والملاحظات والمشاريع.",
  },
};

const entityLabels: Record<EntityKind, string> = {
  topic: "موضوع",
  note: "ملاحظة",
  source: "مصدر",
  project: "مشروع",
};

const kindLabels: Record<Note["kind"], string> = {
  note: "ملاحظة",
  idea: "فكرة",
  question: "سؤال",
  research: "بحث",
};

const sourceTypeLabels: Record<Source["sourceType"], string> = {
  article: "مقال",
  book: "كتاب",
  video: "فيديو",
  paper: "ورقة بحثية",
  podcast: "بودكاست",
};

function timeAgo(date: string): string {
  const value = new Date(date).getTime();
  const diffHours = Math.round((value - Date.now()) / 3_600_000);
  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat("ar", { numeric: "auto" }).format(
      diffHours,
      "hour",
    );
  }
  const diffDays = Math.round(diffHours / 24);
  return new Intl.RelativeTimeFormat("ar", { numeric: "auto" }).format(
    diffDays,
    "day",
  );
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "حدث خطأ غير متوقع.");
  return body;
}

function AppMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`app-mark ${compact ? "app-mark--compact" : ""}`}>
      <span className="app-mark__symbol">
        <span />
        <span />
        <span />
      </span>
      {!compact && (
        <span className="app-mark__word">
          نُسُج <small>عقلك الثاني</small>
        </span>
      )}
    </div>
  );
}

function LoginScreen({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await jsonRequest("/api/auth", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      await onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذّر تسجيل الدخول.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-orbit login-orbit--one" />
      <div className="login-orbit login-orbit--two" />
      <section className="login-panel">
        <AppMark />
        <div className="login-icon">
          <Lock size={22} />
        </div>
        <p className="eyebrow">مساحة شخصية محمية</p>
        <h1>مرحباً بعودتك</h1>
        <p className="login-copy">
          أفكارك ومصادرك ومحادثاتك في مكان واحد خاص بك.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="app-password">كلمة مرور المساحة</label>
          <input
            id="app-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••"
            required
            autoFocus
          />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button login-button" disabled={busy}>
            {busy ? <Loader className="spin" size={18} /> : <ShieldCheck size={18} />}
            دخول آمن
          </button>
        </form>
        <p className="privacy-note">
          <ShieldCheck size={14} />
          الجلسة محفوظة في متصفحك فقط عبر ملف ارتباط آمن.
        </p>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-label="جاري تحميل مساحة المعرفة">
      <AppMark />
      <div className="loading-pulse">
        <Brain size={24} />
      </div>
      <p>نرتّب خيوط معرفتك…</p>
    </main>
  );
}

function Sidebar({
  activeView,
  onNavigate,
  mobileOpen,
  onClose,
  onCreate,
  data,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  mobileOpen: boolean;
  onClose: () => void;
  onCreate: (type: EntityKind) => void;
  data: DashboardData;
}) {
  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-top">
          <AppMark />
          <button
            className="icon-button sidebar-close"
            onClick={onClose}
            aria-label="إغلاق القائمة"
          >
            <X size={19} />
          </button>
        </div>
        <button className="capture-button" onClick={() => onCreate("note")}>
          <Plus size={18} />
          التقط معرفة
          <span>N</span>
        </button>
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <p>مساحة العمل</p>
          {mainNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? "active" : ""}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.id === "chat" && (
                  <i className="nav-dot" aria-label="متصل" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-collections">
          <div className="section-label">
            <span>مواضيع نشطة</span>
            <button onClick={() => onCreate("topic")} aria-label="إضافة موضوع">
              <Plus size={15} />
            </button>
          </div>
          {data.topics.slice(0, 4).map((topic) => (
            <button
              className="collection-item"
              key={topic.id}
              onClick={() => {
                onNavigate("topics");
                onClose();
              }}
            >
              <i style={{ background: topic.color }} />
              <span>{topic.title}</span>
              <small>{topic.noteCount}</small>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="avatar">س</div>
          <div>
            <strong>مساحتي الشخصية</strong>
            <span>{data.mode === "database" ? "محفوظة في السحابة" : "وضع تجريبي"}</span>
          </div>
          <button className="icon-button" aria-label="الإعدادات">
            <Command size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  activeView,
  onMenu,
  onSearch,
  onLogout,
}: {
  activeView: ViewId;
  onMenu: () => void;
  onSearch: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={onMenu} aria-label="فتح القائمة">
        <Menu size={20} />
      </button>
      <div className="breadcrumb">
        <span>مساحتي</span>
        <ChevronLeft size={14} />
        <strong>{viewTitles[activeView].title}</strong>
      </div>
      <div className="topbar-actions">
        <button className="search-trigger" onClick={onSearch}>
          <Search size={17} />
          <span>ابحث في كل معرفتك…</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="icon-button notification-button" aria-label="الإشعارات">
          <Bell size={18} />
          <i />
        </button>
        <button className="icon-button" onClick={onLogout} aria-label="تسجيل الخروج">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function PageHeading({
  view,
  onCreate,
}: {
  view: ViewId;
  onCreate: (type: EntityKind) => void;
}) {
  const copy = viewTitles[view];
  const createType: EntityKind =
    view === "topics"
      ? "topic"
      : view === "projects"
        ? "project"
        : view === "sources"
          ? "source"
          : "note";
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </div>
      {!["dashboard", "chat", "map"].includes(view) && (
        <button className="primary-button" onClick={() => onCreate(createType)}>
          <Plus size={17} />
          {`أضف ${entityLabels[createType]}`}
        </button>
      )}
    </div>
  );
}

function QuickCapture({
  topics,
  onSaved,
}: {
  topics: Topic[];
  onSaved: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function capture() {
    if (!text.trim()) return;
    setBusy(true);
    setSaved(false);
    try {
      const analysis = await jsonRequest<{
        summary: string;
        suggestedTags: string[];
      }>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      await jsonRequest("/api/entities", {
        method: "POST",
        body: JSON.stringify({
          type: "note",
          title: analysis.summary.slice(0, 70) || "فكرة جديدة",
          content: text,
          kind: "idea",
          tags: analysis.suggestedTags,
          topicId: topicId || null,
        }),
      });
      setText("");
      setSaved(true);
      await onSaved();
      setTimeout(() => setSaved(false), 2400);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="quick-capture">
      <div className="capture-glow" />
      <div className="quick-capture__icon">
        <Sparkles size={20} />
      </div>
      <div className="quick-capture__body">
        <label htmlFor="quick-capture">ماذا يدور في ذهنك؟</label>
        <textarea
          id="quick-capture"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="فكرة، اقتباس، سؤال، أو شيء تعلّمته للتو…"
          rows={2}
        />
        <div className="quick-capture__footer">
          <select
            value={topicId}
            onChange={(event) => setTopicId(event.target.value)}
            aria-label="اختر موضوعاً"
          >
            <option value="">بلا موضوع</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
          <span className={saved ? "save-status save-status--visible" : "save-status"}>
            <CheckCircle size={14} /> حُفظت وحُلّلت
          </span>
          <button
            onClick={capture}
            disabled={!text.trim() || busy}
            aria-label="حفظ الفكرة"
          >
            {busy ? <Loader className="spin" size={17} /> : <ArrowUp size={17} />}
          </button>
        </div>
      </div>
    </section>
  );
}

function DashboardView({
  data,
  onNavigate,
  onCreate,
  onReload,
}: {
  data: DashboardData;
  onNavigate: (view: ViewId) => void;
  onCreate: (type: EntityKind) => void;
  onReload: () => Promise<void>;
}) {
  const statCards = [
    { label: "موضوع حيّ", value: data.stats.topics, icon: Library, tone: "violet" },
    { label: "ملاحظة وفكرة", value: data.stats.notes, icon: FileText, tone: "amber" },
    { label: "رابط معرفي", value: data.stats.connections, icon: LinkIcon, tone: "teal" },
    {
      label: "مشروع نشط",
      value: data.projects.filter((item) => item.status === "active").length,
      icon: FolderKanban,
      tone: "rose",
    },
  ];
  return (
    <>
      <PageHeading view="dashboard" onCreate={onCreate} />
      <QuickCapture topics={data.topics} onSaved={onReload} />
      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="stat-card" key={stat.label}>
              <span className={`stat-icon stat-icon--${stat.tone}`}>
                <Icon size={18} />
              </span>
              <div>
                <strong>{stat.value}</strong>
                <small>{stat.label}</small>
              </div>
              <span className="stat-trend">+ هذا الأسبوع</span>
            </article>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">أحدث ما تطوّر</p>
              <h2>معرفتك الأخيرة</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("notes")}>
              عرض الكل <ChevronLeft size={15} />
            </button>
          </div>
          <div className="recent-list">
            {data.notes.slice(0, 4).map((note) => (
              <article className="recent-item" key={note.id}>
                <span className={`note-kind note-kind--${note.kind}`}>
                  {note.kind === "idea" ? (
                    <Lightbulb size={16} />
                  ) : note.kind === "research" ? (
                    <BookOpen size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                </span>
                <div>
                  <div className="item-meta">
                    <span>{note.topicTitle ?? "بلا موضوع"}</span>
                    <i />
                    <span>{timeAgo(note.updatedAt)}</span>
                  </div>
                  <h3>{note.title}</h3>
                  <p>{note.summary || note.content}</p>
                </div>
                <ChevronLeft size={17} className="item-chevron" />
              </article>
            ))}
          </div>
        </section>
        <section className="panel projects-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">من المعرفة إلى الفعل</p>
              <h2>مشاريع قيد الحركة</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => onCreate("project")}
              aria-label="إضافة مشروع"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="project-mini-list">
            {data.projects.slice(0, 3).map((project) => (
              <article key={project.id}>
                <div className="project-mini-top">
                  <span className={`project-status project-status--${project.status}`} />
                  <div>
                    <h3>{project.title}</h3>
                    <p>
                      {project.completedTaskCount} من {project.taskCount} مهام
                    </p>
                  </div>
                  <strong>{project.progress}%</strong>
                </div>
                <div className="progress">
                  <span style={{ width: `${project.progress}%` }} />
                </div>
              </article>
            ))}
          </div>
          <button className="wide-quiet-button" onClick={() => onNavigate("projects")}>
            افتح لوحة المشاريع <ChevronLeft size={15} />
          </button>
        </section>
      </div>
    </>
  );
}

function TopicsView({ topics }: { topics: Topic[] }) {
  return (
    <div className="topic-grid">
      {topics.map((topic) => (
        <article
          className="topic-card"
          key={topic.id}
          style={{ "--topic-color": topic.color } as CSSProperties}
        >
          <div className="topic-card__top">
            <span className="topic-symbol">{topic.icon}</span>
            <span className="stage-pill">{topic.stage}</span>
          </div>
          <h2>{topic.title}</h2>
          <p>{topic.description}</p>
          <div className="topic-counts">
            <span>
              <FileText size={14} /> {topic.noteCount} ملاحظات
            </span>
            <span>
              <Bookmark size={14} /> {topic.sourceCount} مصادر
            </span>
          </div>
          <div className="topic-footer">
            <div className="progress">
              <span style={{ width: `${topic.progress}%` }} />
            </div>
            <small>{topic.progress}% نضج</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function NotesView({ notes }: { notes: Note[] }) {
  const [filter, setFilter] = useState<"all" | Note["kind"]>("all");
  const visible = filter === "all" ? notes : notes.filter((note) => note.kind === filter);
  return (
    <>
      <div className="filter-row">
        {[
          ["all", "الكل"],
          ["note", "ملاحظات"],
          ["idea", "أفكار"],
          ["question", "أسئلة"],
          ["research", "أبحاث"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value as typeof filter)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="notes-grid">
        {visible.map((note) => (
          <article className="note-card" key={note.id}>
            <div className="note-card__top">
              <span className={`kind-label kind-label--${note.kind}`}>
                {kindLabels[note.kind]}
              </span>
              <span>{timeAgo(note.updatedAt)}</span>
            </div>
            <h2>{note.title}</h2>
            <p>{note.summary || note.content}</p>
            <div className="tag-list">
              {note.tags.slice(0, 4).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
            <div className="note-card__footer">
              <span>
                <i />
                {note.topicTitle ?? "بلا موضوع"}
              </span>
              <span className="stage-pill">{note.stage}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function SourcesView({ sources }: { sources: Source[] }) {
  return (
    <section className="panel table-panel">
      <div className="source-list">
        {sources.map((source) => {
          const safeUrl = /^https?:\/\//i.test(source.url) ? source.url : "#";
          return (
            <article className="source-row" key={source.id}>
              <span className="source-icon">
                <BookOpen size={19} />
              </span>
              <div className="source-main">
                <span>{sourceTypeLabels[source.sourceType]}</span>
                <h3>{source.title}</h3>
                <p>{source.author || "مؤلف غير محدد"}</p>
              </div>
              <span className="source-topic">{source.topicTitle ?? "عام"}</span>
              <span className={`reading-status reading-status--${source.status}`}>
                {source.status === "complete"
                  ? "مكتمل"
                  : source.status === "reading"
                    ? "أقرأه"
                    : "لاحقاً"}
              </span>
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`فتح ${source.title}`}
              >
                <ExternalLink size={17} />
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProjectsView({ projects, topics }: { projects: Project[]; topics: Topic[] }) {
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));
  return (
    <div className="project-grid">
      {projects.map((project) => (
        <article className="project-card" key={project.id}>
          <div className="project-card__top">
            <span className={`project-label project-label--${project.status}`}>
              {project.status === "active"
                ? "نشط"
                : project.status === "idea"
                  ? "فكرة"
                  : project.status === "complete"
                    ? "مكتمل"
                    : "متوقف"}
            </span>
            <FolderKanban size={20} />
          </div>
          <h2>{project.title}</h2>
          <p>{project.description}</p>
          <div className="project-topics">
            {project.topicIds.slice(0, 3).map((id) => (
              <span key={id}>
                <i style={{ background: topicMap.get(id)?.color }} />
                {topicMap.get(id)?.title}
              </span>
            ))}
          </div>
          <div className="project-progress-copy">
            <span>
              {project.completedTaskCount}/{project.taskCount} مهام
            </span>
            <strong>{project.progress}%</strong>
          </div>
          <div className="progress progress--large">
            <span style={{ width: `${project.progress}%` }} />
          </div>
          <div className="project-card__footer">
            <span>
              {project.dueDate
                ? `الموعد ${new Intl.DateTimeFormat("ar", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(project.dueDate))}`
                : "بلا موعد نهائي"}
            </span>
            <button className="icon-button" aria-label="فتح المشروع">
              <ChevronLeft size={17} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function KnowledgeMapView({ data }: { data: DashboardData }) {
  return (
    <section className="map-shell">
      <div className="map-canvas" aria-label="تصور مبسط لخريطة المعرفة">
        <div className="map-lines">
          <span className="map-line map-line--one" />
          <span className="map-line map-line--two" />
          <span className="map-line map-line--three" />
          <span className="map-line map-line--four" />
          <span className="map-line map-line--five" />
        </div>
        <div className="map-center">
          <Brain size={24} />
          <strong>معرفتي</strong>
          <small>{data.stats.connections} روابط مكتشفة</small>
        </div>
        {data.topics.slice(0, 4).map((topic, index) => (
          <div
            key={topic.id}
            className={`map-node map-node--${index + 1}`}
            style={{ "--topic-color": topic.color } as CSSProperties}
          >
            <span>{topic.icon}</span>
            <strong>{topic.title}</strong>
            <small>{topic.noteCount} ملاحظات</small>
          </div>
        ))}
        <div className="map-project">
          <FolderKanban size={16} />
          <span>{data.projects[0]?.title ?? "مشروع جديد"}</span>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-topic" /> موضوع
        </span>
        <span>
          <i className="legend-project" /> مشروع
        </span>
        <span>
          <i className="legend-link" /> رابط مقترح
        </span>
      </div>
    </section>
  );
}

function ChatView({
  messages,
  onMessage,
  busy,
  aiConnected,
}: {
  messages: ChatMessage[];
  onMessage: (message: string) => Promise<void>;
  busy: boolean;
  aiConnected: boolean;
}) {
  const [message, setMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function submit() {
    const value = message.trim();
    if (!value || busy) return;
    setMessage("");
    await onMessage(value);
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  const prompts = [
    "اربط آخر أفكاري بموضوعاتي",
    "ما الذي ينقص بحثي الحالي؟",
    "حوّل فكرة إلى مشروع صغير",
  ];

  return (
    <section className="chat-shell">
      <div className="chat-status">
        <span className="assistant-avatar">
          <Sparkles size={18} />
        </span>
        <div>
          <strong>رفيق نُسُج</strong>
          <span>
            <i /> {aiConnected ? "النموذج متصل" : "الوضع التجريبي"}
          </span>
        </div>
        <span className="context-pill">
          <Brain size={14} /> يقرأ سياق معرفتك
        </span>
      </div>
      <div className="messages">
        <div className="conversation-date">اليوم</div>
        {messages.map((item) => (
          <div
            className={`message message--${item.role}`}
            key={item.id}
          >
            {item.role === "assistant" && (
              <span className="assistant-avatar">
                <Sparkles size={16} />
              </span>
            )}
            <div>
              <p>{item.content}</p>
              <small>
                {new Intl.DateTimeFormat("ar", {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(item.createdAt))}
              </small>
            </div>
          </div>
        ))}
        {busy && (
          <div className="message message--assistant">
            <span className="assistant-avatar">
              <Sparkles size={16} />
            </span>
            <div className="typing" aria-label="المساعد يكتب">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-suggestions">
        {prompts.map((prompt) => (
          <button key={prompt} onClick={() => onMessage(prompt)} disabled={busy}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="chat-composer">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={keyDown}
          placeholder="اسأل معرفتك، أو فكّر بصوت عالٍ…"
          rows={2}
        />
        <div>
          <span>Enter للإرسال · Shift + Enter لسطر جديد</span>
          <button onClick={submit} disabled={!message.trim() || busy}>
            <Send size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

function InsightRail({
  data,
  onNavigate,
}: {
  data: DashboardData;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <aside className="insight-rail">
      <section className="insight-card">
        <div className="insight-card__top">
          <span>
            <Sparkles size={15} />
            بصيرة اليوم
          </span>
          <small>اكتشاف تلقائي</small>
        </div>
        <h3>هناك خيط يجمع التعلّم والإبداع</h3>
        <p>
          ملاحظاتك عن الاسترجاع النشط تتقاطع مع فكرة «الإبداع كعملية وصل».
          ربما يصبح التذكّر نفسه أداةً لتوليد أفكار جديدة.
        </p>
        <div className="connection-chips">
          <span>
            <i style={{ background: data.topics[0]?.color }} />
            {data.topics[0]?.title}
          </span>
          <LinkIcon size={14} />
          <span>
            <i style={{ background: data.topics[1]?.color }} />
            {data.topics[1]?.title}
          </span>
        </div>
        <button onClick={() => onNavigate("chat")}>
          استكشف هذا الرابط <ChevronLeft size={14} />
        </button>
      </section>
      <section className="rail-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">نبض المعرفة</p>
            <h3>ما ينمو الآن</h3>
          </div>
        </div>
        <div className="pulse-list">
          {data.topics.slice(0, 3).map((topic) => (
            <div key={topic.id}>
              <span className="topic-symbol" style={{ color: topic.color }}>
                {topic.icon}
              </span>
              <div>
                <strong>{topic.title}</strong>
                <div className="progress">
                  <span
                    style={{
                      width: `${topic.progress}%`,
                      background: topic.color,
                    }}
                  />
                </div>
              </div>
              <small>{topic.progress}%</small>
            </div>
          ))}
        </div>
      </section>
      <section className="rail-section next-step">
        <p className="eyebrow">خطوة صغيرة</p>
        <h3>راجع سؤالاً مفتوحاً</h3>
        <p>{data.notes.find((note) => note.kind === "question")?.title ?? "أضف سؤالاً إلى معرفتك"}</p>
        <button onClick={() => onNavigate("notes")}>
          افتح الملاحظة <ChevronLeft size={14} />
        </button>
      </section>
      <div className="storage-status">
        <span>
          <ShieldCheck size={15} />
          {data.mode === "database" ? "البيانات محفوظة" : "نسخة تجريبية مؤقتة"}
        </span>
        <i className={data.mode === "database" ? "online" : ""} />
      </div>
    </aside>
  );
}

function CreateModal({
  type,
  topics,
  onClose,
  onSaved,
}: {
  type: EntityKind;
  topics: Topic[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [topicId, setTopicId] = useState("");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [kind, setKind] = useState<Note["kind"]>("note");
  const [sourceType, setSourceType] = useState<Source["sourceType"]>("article");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload: CreateEntityPayload = {
      type,
      title,
      topicId: topicId || null,
      ...(type === "note" ? { content: details, kind } : {}),
      ...(type === "topic" || type === "project" ? { description: details } : {}),
      ...(type === "source" ? { url, author, sourceType } : {}),
    };
    try {
      await jsonRequest("/api/entities", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">إضافة إلى نُسُج</p>
            <h2 id="create-title">إنشاء {entityLabels[type]} جديد</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            العنوان
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                type === "project"
                  ? "ما النتيجة التي تريد بناءها؟"
                  : `عنوان ${entityLabels[type]} واضح`
              }
              required
              autoFocus
            />
          </label>
          {type === "note" && (
            <label>
              النوع
              <select value={kind} onChange={(event) => setKind(event.target.value as Note["kind"])}>
                {Object.entries(kindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === "source" && (
            <>
              <label>
                نوع المصدر
                <select
                  value={sourceType}
                  onChange={(event) =>
                    setSourceType(event.target.value as Source["sourceType"])
                  }
                >
                  {Object.entries(sourceTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                الرابط
                <input
                  type="url"
                  dir="ltr"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label>
                المؤلف أو الجهة
                <input
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="اسم المؤلف"
                />
              </label>
            </>
          )}
          {type !== "topic" && (
            <label>
              الموضوع المرتبط
              <select value={topicId} onChange={(event) => setTopicId(event.target.value)}>
                <option value="">بلا موضوع</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type !== "source" && (
            <label>
              {type === "note" ? "المحتوى" : "الوصف"}
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={5}
                placeholder={
                  type === "note"
                    ? "اكتب الفكرة كما هي؛ سيأتي التنظيم لاحقاً…"
                    : "لماذا يهم هذا؟"
                }
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              إلغاء
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? <Loader className="spin" size={17} /> : <Plus size={17} />}
              إنشاء {entityLabels[type]}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SearchPalette({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const data = await jsonRequest<{ results: SearchResult[] }>(
          `/api/search?q=${encodeURIComponent(query)}`,
        );
        setResults(data.results);
      } finally {
        setBusy(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const iconFor = (type: SearchResult["type"]) =>
    type === "topic"
      ? Library
      : type === "note"
        ? FileText
        : type === "source"
          ? Bookmark
          : FolderKanban;

  function openResult(result: SearchResult) {
    onNavigate(
      result.type === "topic"
        ? "topics"
        : result.type === "note"
          ? "notes"
          : result.type === "source"
            ? "sources"
            : "projects",
    );
    onClose();
  }

  return (
    <div className="search-backdrop" onMouseDown={onClose}>
      <section
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="البحث في المعرفة"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="search-input-wrap">
          <Search size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن فكرة، مصدر، أو مشروع…"
          />
          {busy ? <Loader className="spin" size={17} /> : <kbd>ESC</kbd>}
        </div>
        <div className="search-results">
          {!query && (
            <div className="search-empty">
              <Command size={24} />
              <p>اكتب كلمة أو فكرة للبحث في كل معرفتك.</p>
              <span>يشمل البحث المواضيع والملاحظات والمصادر والمشاريع.</span>
            </div>
          )}
          {query && !busy && results.length === 0 && (
            <div className="search-empty">
              <Search size={24} />
              <p>لا توجد نتيجة مباشرة</p>
              <span>جرّب كلمة أقصر أو التقطها كملاحظة جديدة.</span>
            </div>
          )}
          {results.map((result) => {
            const Icon = iconFor(result.type);
            return (
              <button key={`${result.type}-${result.id}`} onClick={() => openResult(result)}>
                <span className={`result-icon result-icon--${result.type}`}>
                  <Icon size={17} />
                </span>
                <div>
                  <strong>{result.title}</strong>
                  <p>{result.excerpt}</p>
                  <small>{result.meta}</small>
                </div>
                <ChevronLeft size={17} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function SecondBrainApp() {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "guest">(
    "loading",
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createType, setCreateType] = useState<EntityKind | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const auth = await jsonRequest<{ authenticated: boolean }>("/api/auth");
      if (!auth.authenticated) {
        setAuthState("guest");
        setData(null);
        return;
      }
      const dashboard = await jsonRequest<DashboardData>("/api/bootstrap");
      setData(dashboard);
      setAuthState("authenticated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذّر تحميل التطبيق.");
      setAuthState("guest");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    function keyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (authState === "authenticated") setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCreateType(null);
      }
      if (
        event.key.toLowerCase() === "n" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement)?.tagName,
        )
      ) {
        setCreateType("note");
      }
    }
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [authState]);

  const messages = useMemo(() => data?.messages ?? [], [data?.messages]);

  async function sendMessage(content: string) {
    if (!data || chatBusy) return;
    setChatBusy(true);
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setData({ ...data, messages: [...data.messages, optimistic] });
    try {
      const response = await jsonRequest<{ assistant: ChatMessage }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: content, history: data.messages.slice(-10) }),
      });
      setData((current) =>
        current
          ? { ...current, messages: [...current.messages, response.assistant] }
          : current,
      );
    } catch (cause) {
      const failedMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          cause instanceof Error
            ? cause.message
            : "تعذّر الوصول إلى المساعد الآن.",
        provider: "demo",
        createdAt: new Date().toISOString(),
      };
      setData((current) =>
        current
          ? { ...current, messages: [...current.messages, failedMessage] }
          : current,
      );
    } finally {
      setChatBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthState("guest");
    setData(null);
  }

  if (authState === "loading") return <LoadingScreen />;
  if (authState === "guest" || !data) {
    return (
      <>
        <LoginScreen onSuccess={load} />
        {error && <div className="global-error">{error}</div>}
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCreate={setCreateType}
        data={data}
      />
      <div className="workspace">
        <Topbar
          activeView={activeView}
          onMenu={() => setSidebarOpen(true)}
          onSearch={() => setSearchOpen(true)}
          onLogout={logout}
        />
        <div className="workspace-grid">
          <main className={`content ${activeView === "chat" ? "content--chat" : ""}`}>
            {activeView !== "dashboard" && activeView !== "chat" && (
              <PageHeading view={activeView} onCreate={setCreateType} />
            )}
            {activeView === "dashboard" && (
              <DashboardView
                data={data}
                onNavigate={setActiveView}
                onCreate={setCreateType}
                onReload={load}
              />
            )}
            {activeView === "chat" && (
              <>
                <PageHeading view="chat" onCreate={setCreateType} />
                <ChatView
                  messages={messages}
                  onMessage={sendMessage}
                  busy={chatBusy}
                  aiConnected={data.aiConnected}
                />
              </>
            )}
            {activeView === "topics" && <TopicsView topics={data.topics} />}
            {activeView === "notes" && <NotesView notes={data.notes} />}
            {activeView === "sources" && <SourcesView sources={data.sources} />}
            {activeView === "projects" && (
              <ProjectsView projects={data.projects} topics={data.topics} />
            )}
            {activeView === "map" && <KnowledgeMapView data={data} />}
          </main>
          {activeView !== "chat" && (
            <InsightRail data={data} onNavigate={setActiveView} />
          )}
        </div>
      </div>
      {createType && (
        <CreateModal
          type={createType}
          topics={data.topics}
          onClose={() => setCreateType(null)}
          onSaved={load}
        />
      )}
      {searchOpen && (
        <SearchPalette
          onClose={() => setSearchOpen(false)}
          onNavigate={setActiveView}
        />
      )}
    </div>
  );
}
