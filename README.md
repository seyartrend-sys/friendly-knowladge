# نُسُج — AI Second Brain

نُسُج هو MVP قابل للتشغيل لنظام معرفة شخصية حيّ: تلتقط فيه الأفكار والملاحظات والمصادر، تربطها بمواضيع، ثم تحوّلها إلى مشاريع وتتحدث معها من خلال مساعد AI واعٍ بسياقك.

## ما الذي يعمل الآن؟

- واجهة عربية RTL متجاوبة لسطح المكتب والهاتف.
- لوحة يومية، التقاط سريع، وتحليل أولي للمحتوى.
- مواضيع بمراحل نضج من «بذرة» إلى «تطبيق».
- ملاحظات، أفكار، أسئلة، وأبحاث مع وسوم.
- مكتبة مصادر وروابط ومؤلفين وحالة قراءة.
- مشاريع مرتبطة بالمواضيع مع تقدّم ومهام.
- بحث موحّد عبر كل المعرفة.
- خريطة معرفة مرئية وعلاقات مع درجة ثقة وسبب.
- محادثة تسترجع السياق المناسب قبل سؤال النموذج.
- طبقة AI تدعم أي API متوافق مع OpenAI Chat Completions.
- PostgreSQL للإنتاج، ووضع تجريبي يعمل فوراً بلا إعداد.
- بوابة دخول شخصية، جلسة آمنة، وrate limiting بسيط.
- ترحيلات قاعدة، بيانات بداية، CI، وRender Blueprint.

## القرار المعماري

المشروع **Modular Monolith** مبني بـNext.js: الواجهة وواجهات API في خدمة واحدة، PostgreSQL للحفظ والبحث، ومستودع بيانات يعزل تفاصيل التخزين، وطبقة مستقلة لمزود AI. هذه أفضل نقطة بداية عملية: نشر واحد وتعقيد منخفض، مع حدود واضحة لفصل البحث أو العمال الخلفيين لاحقاً.

التفاصيل والرسوم: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)  
المراحل القادمة: [docs/ROADMAP.md](docs/ROADMAP.md)  
الأمان: [SECURITY.md](SECURITY.md)

## التقنية

- Next.js 16 + React 19 + TypeScript
- PostgreSQL 17 وFull-text indexes
- `postgres.js` باتصالات محدودة مناسبة لخدمة واحدة
- CSS أصلي وLucide icons
- Node.js 22 + pnpm
- Render Web Service + Render Postgres

## تشغيل سريع بلا قاعدة أو AI

المطلوب: Node.js 22.13+ وpnpm.

```bash
corepack enable
pnpm install
pnpm dev
```

افتح `http://localhost:3000`. إذا لم يوجد ملف `.env` يعمل التطبيق تلقائياً ببيانات تجريبية قابلة للإضافة طوال عمر عملية الخادم، ولا يطلب كلمة مرور في بيئة التطوير فقط.

## تشغيل محلي كامل

1. انسخ الإعدادات:

```bash
cp .env.example .env.local
```

2. عدّل `DATABASE_URL` و`APP_PASSWORD` و`AUTH_SECRET`.

3. أنشئ الجداول وبيانات البداية:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

لإنشاء سر قوي:

```bash
openssl rand -base64 32
```

## ربط مزود AI

أضف القيم التالية إلى `.env.local` أو إعدادات Render:

```env
AI_API_KEY=your-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

يمكن تغيير `AI_BASE_URL` و`AI_MODEL` إلى أي مزود يدعم endpoint متوافقاً مع:

```text
POST /chat/completions
```

من دون `AI_API_KEY` تبقى المحادثة عاملة في وضع تجريبي، وتصرّح الواجهة بذلك بوضوح.

## قاعدة البيانات

الترحيل الأول في:

```text
database/migrations/001_initial.sql
```

والكيانات الأساسية:

- `topics`
- `notes`
- `sources`
- `projects`
- `project_topics`
- `project_tasks`
- `knowledge_links`
- `chat_threads`
- `chat_messages`

تشغيل `pnpm db:migrate` آمن للتكرار؛ يسجل كل ترحيل في `schema_migrations`. وتشغيل `pnpm db:seed` idempotent ولا يكرر بيانات البداية.

## التحقق

```bash
pnpm lint
pnpm test
pnpm build
```

أو دفعة واحدة:

```bash
pnpm check
```

GitHub Actions يشغّل الفحوص نفسها عند كل push وPull Request.

## الرفع إلى GitHub

من مجلد المشروع:

```bash
git init
git add .
git commit -m "feat: build Nusuq AI second brain MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nusuq-second-brain.git
git push -u origin main
```

أنشئ المستودع الفارغ في GitHub قبل إضافة `origin`، ولا تضف README أو `.gitignore` من واجهة GitHub لأنهما موجودان بالفعل.

## النشر على Render

المشروع يحتوي `render.yaml` ينشئ:

- خدمة Next.js في Frankfurt.
- قاعدة Render Postgres خاصة.
- ربط `DATABASE_URL` تلقائياً.
- توليد `AUTH_SECRET` آلياً.
- فحص صحة على `/api/health`.
- تشغيل الترحيلات وseed قبل بدء التطبيق.

الخطوات:

1. ارفع المشروع إلى GitHub.
2. افتح Render واختر **New → Blueprint**.
3. اربط مستودع GitHub.
4. سيقرأ Render ملف `render.yaml`.
5. عند مطالبتك بـ`APP_PASSWORD` أدخل كلمة قوية تحفظها.
6. أنشئ الـBlueprint وانتظر اكتمال قاعدة البيانات والخدمة.
7. افتح رابط `onrender.com` وسجّل الدخول بكلمة المرور.

للمحادثة الحقيقية، افتح **Service → Environment** وأضف `AI_API_KEY`. غيّر `AI_BASE_URL` و`AI_MODEL` إذا استخدمت مزوداً آخر، ثم أعد النشر.

ملاحظة: الخطة المجانية مناسبة للتجربة وقد تتوقف عند الخمول، وسيكون لها قيود عمر/سعة. استخدم خطة قاعدة مدفوعة قبل الاعتماد طويل الأمد. راجع [دليل Next.js الرسمي على Render](https://render.com/docs/deploy-nextjs-app) و[مرجع Blueprint](https://render.com/docs/blueprint-spec).

## متغيرات البيئة

| المتغير | مطلوب | الغرض |
|---|---:|---|
| `DATABASE_URL` | في الإنتاج | اتصال PostgreSQL |
| `APP_PASSWORD` | في الإنتاج | كلمة مرور المساحة الشخصية |
| `AUTH_SECRET` | في الإنتاج | توقيع جلسة الدخول |
| `AI_API_KEY` | لا | تفعيل النموذج المتصل |
| `AI_BASE_URL` | لا | عنوان API المتوافق |
| `AI_MODEL` | لا | اسم النموذج |

## واجهات API

| المسار | الوظيفة |
|---|---|
| `GET /api/auth` | حالة الجلسة |
| `POST /api/auth` | تسجيل الدخول |
| `DELETE /api/auth` | تسجيل الخروج |
| `GET /api/bootstrap` | بيانات مساحة العمل |
| `POST /api/entities` | إنشاء موضوع/ملاحظة/مصدر/مشروع |
| `GET /api/search?q=` | البحث الموحد |
| `POST /api/chat` | محادثة RAG مبسطة |
| `POST /api/analyze` | تحليل الالتقاط السريع |
| `GET /api/health` | فحص الخدمة |

جميع مسارات المعرفة محمية؛ `/api/health` وحده عام ولا يكشف تفاصيل الاتصال.

## نطاق الـMVP

تم تأجيل تعدد المستخدمين، رفع PDF، التكاملات الخارجية، embeddings، وعمليات AI الاستباقية الثقيلة عمداً. أول شيء يجب اختباره مع مستخدم حقيقي هو: **هل ساعده النظام على العودة إلى فكرة قديمة وتحويلها إلى خطوة؟**
