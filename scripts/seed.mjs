import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required to seed the database.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

const ids = {
  ai: "11111111-1111-4111-8111-111111111111",
  learning: "22222222-2222-4222-8222-222222222222",
  music: "33333333-3333-4333-8333-333333333333",
  product: "44444444-4444-4444-8444-444444444444",
  noteOne: "51111111-1111-4111-8111-111111111111",
  noteTwo: "52222222-2222-4222-8222-222222222222",
  noteThree: "53333333-3333-4333-8333-333333333333",
  projectOne: "61111111-1111-4111-8111-111111111111",
  projectTwo: "62222222-2222-4222-8222-222222222222",
  sourceOne: "71111111-1111-4111-8111-111111111111",
  sourceTwo: "72222222-2222-4222-8222-222222222222",
  taskOne: "81111111-1111-4111-8111-111111111111",
  taskTwo: "82222222-2222-4222-8222-222222222222",
  linkOne: "91111111-1111-4111-8111-111111111111",
  welcome: "a1111111-1111-4111-8111-111111111111",
};

try {
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO topics (id, title, description, color, icon, stage, progress)
      VALUES
        (${ids.ai}, 'الذكاء الاصطناعي والإبداع',
          'كيف تعزز الأدوات الذكية التفكير الإنساني من دون أن تستبدله.',
          '#7968e8', '✦', 'معرفة', 76),
        (${ids.learning}, 'علوم التعلّم',
          'الذاكرة، الاسترجاع، وبناء أنظمة تعلم تبقى لسنوات.',
          '#e79f66', '◉', 'بحث', 58),
        (${ids.music}, 'الموسيقى وعلم النفس',
          'أثر الإيقاع والتوقع الموسيقي في المشاعر والسلوك.',
          '#55a69b', '♫', 'موثّق', 64),
        (${ids.product}, 'تصميم المنتجات',
          'تحويل المشكلات المعقدة إلى تجارب بسيطة وقابلة للاختبار.',
          '#d36c72', '◇', 'تطبيق', 83)
      ON CONFLICT (id) DO NOTHING
    `;
    await tx`
      INSERT INTO notes (
        id, topic_id, title, content, summary, kind, stage, tags
      )
      VALUES
        (${ids.noteOne}, ${ids.ai}, 'الإبداع عملية وصل لا لحظة إلهام',
          'الفكرة الجديدة غالباً تركيب غير متوقع بين نمطين معروفين. قيمة النظام المعرفي تأتي من تحسين احتمال اللقاء بين المعلومتين المناسبتين.',
          'الإبداع ينمو حين يسهل النظام اكتشاف الروابط البعيدة بين المعارف.',
          'idea', 'معرفة', ARRAY['إبداع', 'روابط', 'تفكير']),
        (${ids.noteTwo}, ${ids.learning}, 'لماذا ينجح الاسترجاع النشط؟',
          'محاولة تذكر المعلومة تقوي مسارات الوصول إليها أكثر من إعادة قراءتها. الاختبار ليس أداة قياس فقط، بل أداة تعلم.',
          'الاسترجاع النشط يبني الذاكرة عبر جهد التذكر نفسه.',
          'research', 'موثّق', ARRAY['ذاكرة', 'تعلم', 'استرجاع']),
        (${ids.noteThree}, ${ids.music}, 'التوقع الموسيقي وتكوين المشاعر',
          'يبني المستمع توقعاً مستمراً لما سيأتي. التوتر بين التوقع والمفاجأة يصنع جزءاً مهماً من الاستجابة العاطفية.',
          'المشاعر الموسيقية تتشكل من لعبة التوقع والمفاجأة.',
          'note', 'بحث', ARRAY['موسيقى', 'مشاعر', 'توقع'])
      ON CONFLICT (id) DO NOTHING
    `;
    await tx`
      INSERT INTO sources (
        id, topic_id, title, url, author, source_type, status
      )
      VALUES
        (${ids.sourceOne}, ${ids.ai}, 'The Extended Mind',
          'https://en.wikipedia.org/wiki/The_Extended_Mind',
          'Andy Clark & David Chalmers', 'paper', 'complete'),
        (${ids.sourceTwo}, ${ids.learning}, 'Make It Stick',
          'https://www.hup.harvard.edu/books/9780674729018',
          'Brown, Roediger & McDaniel', 'book', 'reading')
      ON CONFLICT (id) DO NOTHING
    `;
    await tx`
      INSERT INTO projects (
        id, title, description, status, progress, due_date
      )
      VALUES
        (${ids.projectOne}, 'مختبر التعلّم الشخصي',
          'تجربة أسبوعية تقارن بين الاسترجاع النشط وإعادة القراءة في تعلم اللغة.',
          'active', 64, '2026-08-18'),
        (${ids.projectTwo}, 'خريطة الموسيقى والمشاعر',
          'مجموعة بصرية تربط الخصائص الموسيقية بأنماط الاستجابة العاطفية.',
          'idea', 22, null)
      ON CONFLICT (id) DO NOTHING
    `;
    await tx`
      INSERT INTO project_topics (project_id, topic_id)
      VALUES
        (${ids.projectOne}, ${ids.learning}),
        (${ids.projectOne}, ${ids.product}),
        (${ids.projectTwo}, ${ids.music})
      ON CONFLICT DO NOTHING
    `;
    await tx`
      INSERT INTO project_tasks (id, project_id, title, completed, position)
      VALUES
        (${ids.taskOne}, ${ids.projectOne}, 'تحديد معيار القياس', true, 1),
        (${ids.taskTwo}, ${ids.projectOne}, 'تنفيذ الأسبوع الأول', false, 2)
      ON CONFLICT (id) DO NOTHING
    `;
    await tx`
      INSERT INTO knowledge_links (
        id, source_type, source_id, target_type, target_id,
        relation, confidence, reason
      )
      VALUES (
        ${ids.linkOne}, 'note', ${ids.noteOne}, 'topic', ${ids.music},
        'يتقاطع مع', 0.91,
        'كلاهما يدرس أثر جمع الأنماط والتوقعات في إنتاج تجربة جديدة.'
      )
      ON CONFLICT DO NOTHING
    `;
    await tx`
      INSERT INTO chat_messages (
        id, thread_id, role, content, provider
      )
      VALUES (
        ${ids.welcome}, 'default', 'assistant',
        'مرحباً، أنا رفيقك المعرفي. اسألني عن ملاحظاتك أو اطلب مني تحويل فكرة إلى مشروع.',
        'demo'
      )
      ON CONFLICT (id) DO NOTHING
    `;
  });
  console.log("Starter knowledge is ready.");
} finally {
  await sql.end();
}
