import type { ChatMessage, SearchResult } from "./types";

type ProviderResponse = {
  content: string;
  provider: "demo" | "connected";
};

const SYSTEM_PROMPT = `أنت رفيق معرفي شخصي داخل تطبيق "نُسُج".
تتصرف كباحث وأمين مكتبة وشريك تفكير ومدير مشروع.
أجب بالعربية الواضحة والموجزة، واستند إلى سياق معرفة المستخدم المرفق.
ميّز بين ما جاء من معرفة المستخدم وما هو اقتراح منك.
ابحث عن الروابط العملية، والأسئلة الناقصة، والخطوة التالية.
لا تدّع امتلاك مصادر أو حقائق غير موجودة في السياق.
استخدم عناوين قصيرة عند الحاجة، وتجنب الإطالة.`;

function formatContext(context: SearchResult[]): string {
  if (!context.length) return "لا يوجد سياق معرفي مطابق.";
  return context
    .map(
      (item, index) =>
        `[${index + 1}] ${item.type}: ${item.title}\n${item.excerpt}\nالسياق: ${item.meta}`,
    )
    .join("\n\n");
}

function demoAnswer(question: string, context: SearchResult[]): string {
  const top = context.slice(0, 3);
  const contextNames = top.map((item) => `«${item.title}»`).join("، ");
  const connection =
    top.length > 1
      ? `أرى رابطاً واعداً بين ${contextNames}: يمكن جمعها حول سؤال واحد هو «كيف تتحول المعرفة المتفرقة إلى تجربة أو نتيجة قابلة للقياس؟»`
      : top.length === 1
        ? `أقرب مادة في معرفتك إلى سؤالك هي ${contextNames}.`
        : "لا أرى مادة مطابقة مباشرة في قاعدة المعرفة بعد.";

  return `${connection}

**قراءة أولية**
سؤالك عن «${question.slice(0, 120)}${question.length > 120 ? "…" : ""}» يستحق أن يُفكك إلى: ما الذي نعرفه؟ ما الافتراض الذي نريد اختباره؟ وما المخرج العملي؟

**خطوة مقترحة**
أنشئ ملاحظة بحثية قصيرة تتضمن فرضية واحدة، دليلاً مؤيداً، ودليلاً قد ينقضها. بعدها يمكنني تحويلها إلى خطة مشروع أو ربطها بموضوع قائم.

_هذه إجابة الوضع التجريبي. عند إضافة مفتاح مزود AI سيُستخدم النموذج المتصل مع السياق نفسه._`;
}

export async function answerWithKnowledge(
  question: string,
  context: SearchResult[],
  history: ChatMessage[] = [],
): Promise<ProviderResponse> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    return { content: demoAnswer(question, context), provider: "demo" };
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.AI_MODEL || "gpt-4.1-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `سياق قاعدة معرفة المستخدم:\n\n${formatContext(context)}`,
          },
          ...history.slice(-10).map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: "user", content: question },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI provider returned status ${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("AI provider returned an empty answer");
    return { content, provider: "connected" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeKnowledge(text: string): Promise<{
  summary: string;
  suggestedTags: string[];
  stage: "بذرة" | "بحث";
  nextQuestion: string;
}> {
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const frequencies = new Map<string, number>();
  for (const word of words) {
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }
  const suggestedTags = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);
  const summary =
    text.length > 180 ? `${text.trim().slice(0, 177)}…` : text.trim();
  return {
    summary,
    suggestedTags,
    stage: text.length > 280 ? "بحث" : "بذرة",
    nextQuestion: "ما الدليل أو التطبيق العملي الذي سيجعل هذه الفكرة أكثر نضجاً؟",
  };
}
