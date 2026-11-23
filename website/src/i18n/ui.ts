export type Locale = "en" | "zh" | "ar" | "fr" | "ru" | "es";

export const LOCALES: readonly Locale[] = ["en", "zh", "ar", "fr", "ru", "es"] as const;

export interface LocaleMeta {
  code: Locale;
  htmlLang: string;
  hreflang: string;
  ogLocale: string;
  dir: "ltr" | "rtl";
  nativeLabel: string;
  shortLabel: string;
  homePath: string;
  docsStartPath: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: {
    code: "en",
    htmlLang: "en",
    hreflang: "en",
    ogLocale: "en_US",
    dir: "ltr",
    nativeLabel: "English",
    shortLabel: "EN",
    homePath: "/",
    docsStartPath: "/docs/getting-started/",
  },
  zh: {
    code: "zh",
    htmlLang: "zh-CN",
    hreflang: "zh-CN",
    ogLocale: "zh_CN",
    dir: "ltr",
    nativeLabel: "简体中文",
    shortLabel: "中文",
    homePath: "/zh/",
    docsStartPath: "/zh/docs/getting-started/",
  },
  ar: {
    code: "ar",
    htmlLang: "ar",
    hreflang: "ar",
    ogLocale: "ar_SA",
    dir: "rtl",
    nativeLabel: "العربية",
    shortLabel: "AR",
    homePath: "/ar/",
    docsStartPath: "/ar/docs/getting-started/",
  },
  fr: {
    code: "fr",
    htmlLang: "fr",
    hreflang: "fr",
    ogLocale: "fr_FR",
    dir: "ltr",
    nativeLabel: "Français",
    shortLabel: "FR",
    homePath: "/fr/",
    docsStartPath: "/fr/docs/getting-started/",
  },
  ru: {
    code: "ru",
    htmlLang: "ru",
    hreflang: "ru",
    ogLocale: "ru_RU",
    dir: "ltr",
    nativeLabel: "Русский",
    shortLabel: "RU",
    homePath: "/ru/",
    docsStartPath: "/ru/docs/getting-started/",
  },
  es: {
    code: "es",
    htmlLang: "es",
    hreflang: "es",
    ogLocale: "es_ES",
    dir: "ltr",
    nativeLabel: "Español",
    shortLabel: "ES",
    homePath: "/es/",
    docsStartPath: "/es/docs/getting-started/",
  },
};

export interface LandingCopy {
  metaTitle: string;
  metaDescription: string;
  navAria: string;
  navDocs: string;
  langMenuAria: string;
  heroTitle: string;
  heroSub: string;
  builtWithCredit: string;
  osTabsAria: string;
  copyInstall: string;
  copied: string;
  quickStart: string;
  surfacesAria: string;
  sec2Title: string;
  sec2Sub: string;
  sec3Title: string;
  sec3Sub: string;
  examplePrompt: string;
  copyPrompt: string;
  sec4Title: string;
  sec4Sub: string;
  sec5Title: string;
  sec5Sub: string;
  sec6Title: string;
  sec6Sub: string;
  closeTitle: string;
  closeTrust: string;
  openQuickStart: string;
  footerLicense: string;
  footerDocs: string;
}

export const LANDING_COPY: Record<Locale, LandingCopy> = {
  en: {
    metaTitle: "UltraCode — Reliable End-to-End Delivery for OpenCode",
    metaDescription:
      "UltraCode v1.0.0 brings upfront clarification, specialist subagents, real-browser visual checks, and durable handoffs to official OpenCode V2 across macOS, Linux, and Windows — Terminal, Desktop, Web, and Mobile.",
    navAria: "Main navigation",
    navDocs: "Docs",
    langMenuAria: "Select language",
    heroTitle: "State the Goal. Ship Verified Work.",
    heroSub:
      "Built on official OpenCode across macOS, Linux, and Windows — unified across Terminal, Desktop, Web, and Mobile.",
    builtWithCredit: "v1.0.0 · Built and shipped with UltraCode v0.3.0",
    osTabsAria: "Select operating system",
    copyInstall: "Copy install",
    copied: "Copied",
    quickStart: "Quick start",
    surfacesAria: "Entry commands",
    sec2Title: "Why Multi-Step Work Stays on Track",
    sec2Sub:
      "Standard AI chat guesses early and loses context halfway through; UltraCode turns long tasks into a verified loop.",
    sec3Title: "Try It Right Away: 1-Minute Demo",
    sec3Sub:
      "Run ultracode (or open ultracode desktop) in any empty folder and send this single sentence.",
    examplePrompt:
      "Build a clean dark portfolio page that works well on desktop and mobile, then open a real browser to inspect and fix any layout issues.",
    copyPrompt: "Copy prompt",
    sec4Title: "Two Primary Roles. Five Background Specialists.",
    sec4Sub:
      "Use UltraBuild by default for end-to-end delivery, or press Shift+Tab to switch to read-only UltraPlan.",
    sec5Title: "Built for Long Tasks & Seamless Resumption",
    sec5Sub:
      "Advances milestones automatically, yields immediately when you steer, and picks right back up after a restart.",
    sec6Title: "Live Control Across Terminal, Desktop & Mobile",
    sec6Sub:
      "Switch Command approvals and Direction questions from the Desktop pill & Settings, the TUI Command Palette, or /approvals & /direction on Web and Mobile.",
    closeTitle: "Install in One Line. Keep Your Own Models.",
    closeTrust:
      "Sets up official OpenCode V2 automatically · Never modifies binaries · Never touches API keys · Clean uninstall anytime",
    openQuickStart: "Open 1-Minute Quick Start",
    footerLicense: "UltraCode v1.0.0 · Built with UltraCode v0.3.0 · MIT License",
    footerDocs: "Documentation",
  },
  zh: {
    metaTitle: "UltraCode — 让 OpenCode 稳妥完成复杂工程交付",
    metaDescription:
      "UltraCode v1.0.0 基于官方 OpenCode V2 构建，提供前置需求确认、后台角色协作、真实浏览器界面巡检与长程断点续跑，原生支持 macOS、Linux 与 Windows 及终端、桌面端、网页与手机端。",
    navAria: "主导航",
    navDocs: "文档",
    langMenuAria: "选择语言",
    heroTitle: "说清目标，稳妥交付",
    heroSub:
      "基于官方 OpenCode 构建，原生支持 macOS、Linux 与 Windows，打通终端、桌面端、网页与手机端。",
    builtWithCredit: "v1.0.0 · 使用 UltraCode v0.3.0 辅助开发与构建",
    osTabsAria: "选择操作系统",
    copyInstall: "复制命令",
    copied: "已复制",
    quickStart: "快速开始",
    surfacesAria: "启动方式",
    sec2Title: "为什么复杂任务不再写到一半跑偏",
    sec2Sub:
      "普通对话容易没问清就动工、聊久了遗忘上下文；UltraCode 用先确认、再实现、后复核的闭环替代反复试错。",
    sec3Title: "装完即试：1 分钟上手体验",
    sec3Sub: "在任意空目录运行 ultracode（或打开 ultracode desktop），直接发送下面这句话。",
    examplePrompt:
      "帮我做一个简洁深色风格的个人作品集单页，桌面端和手机端都要排版舒服，做完自己打开浏览器检查并修好所有错位问题。",
    copyPrompt: "复制示例",
    sec4Title: "两个前台主角色，五位后台协作专家",
    sec4Sub:
      "日常开发直接与默认的 UltraBuild 对话；想先推演方案、不改任何代码时，按 Shift+Tab 切到 UltraPlan。",
    sec5Title: "长任务稳步推进，重启也能无缝接着做",
    sec5Sub:
      "完成一个阶段后自动衔接下一步，你发消息随时插话转向；隔天回来只需说一句“读取交接并继续”即可恢复进度。",
    sec6Title: "终端、桌面与手机实时同步掌控",
    sec6Sub:
      "桌面端点击输入框上方的 UltraCode 胶囊或进入设置页，终端打开命令面板，网页与手机端输入 /approvals 或 /direction，状态实时同步。",
    closeTitle: "一条命令装好，继续用你自己的模型",
    closeTrust:
      "自动安装或更新官方 OpenCode V2 · 不改官方程序 · 不碰 API 密钥 · 随时可干净卸载",
    openQuickStart: "查看 1 分钟快速开始",
    footerLicense: "UltraCode v1.0.0 · 使用 UltraCode v0.3.0 辅助开发与构建 · MIT License",
    footerDocs: "使用文档",
  },
  ar: {
    metaTitle: "UltraCode — إنجاز هندسي متكامل وموثوق لمنصة OpenCode",
    metaDescription:
      "يضيف UltraCode v1.0.0 توضيح المتطلبات المسبق، والوكلاء المتخصصين في الخلفية، والفحص البصري في متصفح حقيقي، واستئناف المهام الطويلة إلى OpenCode V2 الرسمي على macOS وLinux وWindows.",
    navAria: "التنقل الرئيسي",
    navDocs: "الوثائق",
    langMenuAria: "اختر اللغة",
    heroTitle: "حدّد الهدف. واستلم عملاً مُتحقَّقاً منه.",
    heroSub:
      "مبني على OpenCode الرسمي لأنظمة macOS وLinux وWindows — بتجربة موحّدة عبر الطرفية وسطح المكتب والويب والهاتف.",
    builtWithCredit: "v1.0.0 · طُوِّر وبُنِيَ بمساعدة UltraCode v0.3.0",
    osTabsAria: "اختر نظام التشغيل",
    copyInstall: "نسخ التثبيت",
    copied: "تم النسخ",
    quickStart: "البدء السريع",
    surfacesAria: "أوامر التشغيل",
    sec2Title: "لماذا تبقى المهام المتعددة الخطوات على المسار الصحيح",
    sec2Sub:
      "الدردشة التقليدية تخمّن مبكراً وتفقد السياق في منتصف الطريق؛ بينما يحوّل UltraCode العمل إلى حلقة هندسية مُتحقَّق منها.",
    sec3Title: "جرّبه فوراً: تجربة عملية في دقيقة واحدة",
    sec3Sub: "شغّل ultracode (أو افتح ultracode desktop) في أي مجلد فارغ وأرسل هذه الجملة الواحدة.",
    examplePrompt:
      "صمّم صفحة أعمال شخصية داكنة وبسيطة تبدو متقنة على الحاسوب والهاتف، ثم افتح متصفحاً حقيقياً لفحص التخطيط وإصلاح أي خلل.",
    copyPrompt: "نسخ المثال",
    sec4Title: "دوران رئيسيان في الواجهة وخمسة خبراء في الخلفية",
    sec4Sub:
      "تحدّث مع UltraBuild افتراضياً للتنفيذ الكامل، أو اضغط Shift+Tab للتبديل إلى UltraPlan للتخطيط دون تعديل الكود.",
    sec5Title: "مصمم للمهام الطويلة والاستئناف السلس",
    sec5Sub:
      "ينتقل بين المراحل تلقائياً، ويستجيب فوراً لتوجيهاتك، ويستأنف العمل بدقة بعد إعادة التشغيل.",
    sec6Title: "تحكّم فوري متزامن عبر الطرفية وسطح المكتب والهاتف",
    sec6Sub:
      "بدّل موافقات الأوامر وأسئلة الاتجاه من كبسولة UltraCode في سطح المكتب، أو لوحة أوامر الطرفية، أو عبر /approvals و/direction على الويب والهاتف.",
    closeTitle: "ثبّت بأمر واحد، واستمر بنماذجك الخاصة",
    closeTrust:
      "يهيّئ OpenCode V2 الرسمي تلقائياً · لا يعدّل الملفات التنفيذية · لا يمس مفاتيح API · إزالة نظيفة في أي وقت",
    openQuickStart: "افتح دليل البدء في دقيقة",
    footerLicense: "UltraCode v1.0.0 · طُوِّر بمساعدة UltraCode v0.3.0 · رخصة MIT",
    footerDocs: "الوثائق",
  },
  fr: {
    metaTitle: "UltraCode — Livraison de bout en bout fiable pour OpenCode",
    metaDescription:
      "UltraCode v1.0.0 enrichit OpenCode V2 officiel avec clarification initiale, sous-agents spécialisés, vérification visuelle sur navigateur réel et reprise durable sur macOS, Linux et Windows.",
    navAria: "Navigation principale",
    navDocs: "Docs",
    langMenuAria: "Choisir la langue",
    heroTitle: "Exprimez l’objectif. Livrez du concret vérifié.",
    heroSub:
      "Construit sur OpenCode officiel pour macOS, Linux et Windows — unifié sur Terminal, Desktop, Web et Mobile.",
    builtWithCredit: "v1.0.0 · Conçu et construit avec UltraCode v0.3.0",
    osTabsAria: "Choisir le système d’exploitation",
    copyInstall: "Copier",
    copied: "Copié",
    quickStart: "Démarrage rapide",
    surfacesAria: "Commandes de lancement",
    sec2Title: "Pourquoi les projets complexes restent sur les rails",
    sec2Sub:
      "Le chat IA classique devine trop tôt et perd le fil ; UltraCode remplace les essais aveugles par une boucle vérifiée.",
    sec3Title: "Essayez tout de suite : démo en 1 minute",
    sec3Sub:
      "Lancez ultracode (ou ultracode desktop) dans un dossier vide et envoyez cette simple phrase.",
    examplePrompt:
      "Crée une page portfolio sombre et épurée, impeccable sur ordinateur comme sur mobile, puis ouvre un vrai navigateur pour inspecter et corriger la mise en page.",
    copyPrompt: "Copier l’exemple",
    sec4Title: "Deux rôles principaux. Cinq spécialistes en arrière-plan.",
    sec4Sub:
      "Utilisez UltraBuild par défaut pour livrer de bout en bout, ou appuyez sur Shift+Tab pour planifier sans modifier le code avec UltraPlan.",
    sec5Title: "Conçu pour les tâches longues et la reprise nette",
    sec5Sub:
      "Enchaîne les jalons automatiquement, vous redonne la main dès que vous intervenez et reprend proprement après redémarrage.",
    sec6Title: "Contrôle synchronisé sur Terminal, Desktop et Mobile",
    sec6Sub:
      "Basculez Command approvals et Direction questions depuis la capsule Desktop, la palette TUI ou /approvals et /direction sur Web et Mobile.",
    closeTitle: "Une commande pour installer. Gardez vos propres modèles.",
    closeTrust:
      "Installe OpenCode V2 officiel automatiquement · Binaire officiel intact · Clés API jamais lues · Désinstallation propre",
    openQuickStart: "Ouvrir le guide en 1 minute",
    footerLicense: "UltraCode v1.0.0 · Construit avec UltraCode v0.3.0 · Licence MIT",
    footerDocs: "Documentation",
  },
  ru: {
    metaTitle: "UltraCode — Надёжная сквозная разработка на базе OpenCode",
    metaDescription:
      "UltraCode v1.0.0 дополняет официальный OpenCode V2 уточнением требований, профильными субагентами, визуальной проверкой в реальном браузере и сохранением прогресса на macOS, Linux и Windows.",
    navAria: "Основная навигация",
    navDocs: "Документация",
    langMenuAria: "Выбрать язык",
    heroTitle: "Опишите цель. Получите проверенный результат.",
    heroSub:
      "Построен поверх официального OpenCode для macOS, Linux и Windows — терминал, десктоп, веб и телефон.",
    builtWithCredit: "v1.0.0 · Разработано и собрано с помощью UltraCode v0.3.0",
    osTabsAria: "Выберите операционную систему",
    copyInstall: "Копировать",
    copied: "Скопировано",
    quickStart: "Быстрый старт",
    surfacesAria: "Команды запуска",
    sec2Title: "Почему многошаговые задачи не сбиваются с курса",
    sec2Sub:
      "Обычный ИИ-чат начинает наугад и теряет контекст; UltraCode превращает работу в проверяемый инженерный цикл.",
    sec3Title: "Проверьте сразу: демо за 1 минуту",
    sec3Sub:
      "Запустите ultracode (или откройте ultracode desktop) в пустой папке и отправьте одну фразу.",
    examplePrompt:
      "Сделай лаконичное тёмное портфолио для десктопа и телефона, а затем открой реальный браузер, проверь вёрстку и исправь все недочёты.",
    copyPrompt: "Скопировать пример",
    sec4Title: "Две основные роли и пять профильных экспертов",
    sec4Sub:
      "По умолчанию работайте с UltraBuild для полной реализации или нажмите Shift+Tab для безопасного планирования в UltraPlan.",
    sec5Title: "Для долгих задач и бесшовного продолжения",
    sec5Sub:
      "Автоматически проходит этапы, мгновенно реагирует на ваши правки и продолжает работу после перезапуска.",
    sec6Title: "Синхронное управление в терминале, на десктопе и с телефона",
    sec6Sub:
      "Переключайте Command approvals и Direction questions через капсулу в Desktop, палитру команд TUI или /approvals и /direction в браузере и на телефоне.",
    closeTitle: "Установка одной командой. Ваши модели остаются с вами.",
    closeTrust:
      "Автоустановка OpenCode V2 · Без патчей бинарников · Без доступа к API-ключам · Чистое удаление",
    openQuickStart: "Открыть быстрый старт",
    footerLicense: "UltraCode v1.0.0 · Собрано с помощью UltraCode v0.3.0 · MIT License",
    footerDocs: "Документация",
  },
  es: {
    metaTitle: "UltraCode — Entrega confiable de principio a fin para OpenCode",
    metaDescription:
      "UltraCode v1.0.0 aporta aclaración previa, subagentes especializados, verificación visual en navegador real y continuidad de sesiones a OpenCode V2 oficial en macOS, Linux y Windows.",
    navAria: "Navegación principal",
    navDocs: "Docs",
    langMenuAria: "Seleccionar idioma",
    heroTitle: "Define el objetivo. Entrega trabajo verificado.",
    heroSub:
      "Construido sobre OpenCode oficial en macOS, Linux y Windows — unificado en Terminal, Escritorio, Web y Móvil.",
    builtWithCredit: "v1.0.0 · Desarrollado y construido con UltraCode v0.3.0",
    osTabsAria: "Seleccionar sistema operativo",
    copyInstall: "Copiar",
    copied: "Copiado",
    quickStart: "Inicio rápido",
    surfacesAria: "Comandos de inicio",
    sec2Title: "Por qué el trabajo complejo mantiene el rumbo",
    sec2Sub:
      "El chat convencional adivina pronto y pierde contexto; UltraCode convierte tareas largas en un ciclo verificado.",
    sec3Title: "Pruébalo al instante: demo de 1 minuto",
    sec3Sub:
      "Ejecuta ultracode (o abre ultracode desktop) en cualquier carpeta vacía y envía esta única frase.",
    examplePrompt:
      "Crea un portafolio personal oscuro y limpio que se vea bien en escritorio y móvil, y abre un navegador real para revisar y corregir cualquier fallo de diseño.",
    copyPrompt: "Copiar ejemplo",
    sec4Title: "Dos roles principales. Cinco especialistas en segundo plano.",
    sec4Sub:
      "Usa UltraBuild por defecto para entregar de extremo a extremo, o pulsa Shift+Tab para planificar sin tocar código en UltraPlan.",
    sec5Title: "Diseñado para tareas largas y reanudación limpia",
    sec5Sub:
      "Avanza por hitos automáticamente, cede el control al instante cuando intervienes y retoma el progreso tras reiniciar.",
    sec6Title: "Control sincronizado en Terminal, Escritorio y Móvil",
    sec6Sub:
      "Alterna Command approvals y Direction questions desde la cápsula de Escritorio, la paleta TUI o /approvals y /direction en Web y Móvil.",
    closeTitle: "Instala en una línea. Conserva tus propios modelos.",
    closeTrust:
      "Prepara OpenCode V2 oficial automáticamente · Sin tocar binarios ni claves API · Desinstalación limpia",
    openQuickStart: "Abrir inicio rápido en 1 minuto",
    footerLicense: "UltraCode v1.0.0 · Construido con UltraCode v0.3.0 · Licencia MIT",
    footerDocs: "Documentación",
  },
};

export interface DiagramsCopy {
  hero: {
    stageAria: string;
    prompt: string;
    c1Title: string;
    c1Sub: string;
    c2Title: string;
    c2Sub: string;
    c3Title: string;
    c3Sub: string;
    m1: string;
    m2: string;
    m3: string;
    browserHead: string;
    browserAria: string;
  };
  comparison: {
    aria: string;
    topTitle: string;
    topMeta: string;
    t1: string;
    t2: string;
    t3: string;
    t4: string;
    botTitle: string;
    botMeta: string;
    b1: string;
    b2: string;
    b3: string;
    b4: string;
  };
  minimal: {
    aria: string;
    s1Title: string;
    s1Sub: string;
    s2Title: string;
    s2Sub: string;
    s3Title: string;
    s3Sub: string;
    s4Title: string;
    s4Sub: string;
  };
  roles: {
    aria: string;
    buildSub: string;
    planSub: string;
    r1Title: string;
    r1Sub: string;
    r2Title: string;
    r2Sub: string;
    r3Title: string;
    r3Sub: string;
    r4Title: string;
    r4Sub: string;
    r5Title: string;
    r5Sub: string;
  };
  longRun: {
    aria: string;
    n1Title: string;
    n1Sub: string;
    n2Title: string;
    n2Sub: string;
    n3Title: string;
    n3Sub: string;
    n4Title: string;
    n4Sub: string;
    steerBold: string;
    steerSub: string;
    resumeBold: string;
    resumeSub: string;
  };
  controls: {
    aria: string;
    approvalsLabel: string;
    approvalsSub: string;
    directionLabel: string;
    directionSub: string;
  };
  vqa: {
    aria: string;
    s1Title: string;
    s1Sub: string;
    s2Title: string;
    s2Sub: string;
    s3Title: string;
    s3Sub: string;
    s4Title: string;
    s4Sub: string;
    loopNote: string;
  };
  eras: {
    aria: string;
    p1Sub: string;
    p1Muted: string;
    p2Sub: string;
    p2Muted: string;
    p3Title: string;
    p3Sub: string;
    p3Ice: string;
  };
}

export const DIAGRAMS_COPY: Record<Locale, DiagramsCopy> = {
  en: {
    hero: {
      stageAria: "UltraCode workflow and real-browser visual check preview",
      prompt: "Build a clean dark portfolio page that works well on desktop and mobile.",
      c1Title: "Minimal Dark",
      c1Sub: "Pure black, crisp contrast",
      c2Title: "Clean Grid",
      c2Sub: "Structured hairline layout",
      c3Title: "Classic Light",
      c3Sub: "Warm paper readability",
      m1: "Requirements clarified & plan confirmed",
      m2: "Specialists built & reviewed independently",
      m3: "Desktop & mobile browser checks passed",
      browserHead: "Browser Visual Check Passed",
      browserAria: "Real browser visual inspection preview",
    },
    comparison: {
      aria: "Standard AI chat vs UltraCode workflow diagram",
      topTitle: "Standard AI Chat",
      topMeta: "Guesses · Loses context · Unverified",
      t1: "Starts guessing",
      t2: "Loses context",
      t3: "Breaks old code",
      t4: "Stops early",
      botTitle: "UltraCode Workflow",
      botMeta: "Aligned · Reviewed · Verified",
      b1: "01 Research & clarify",
      b2: "02 Confirm plan first",
      b3: "03 Specialist build",
      b4: "04 Browser QA check",
    },
    minimal: {
      aria: "4-step 1-minute onboarding workflow",
      s1Title: "State Your Goal",
      s1Sub: "Run ultracode anywhere and describe the result you want.",
      s2Title: "Confirm Key Choices",
      s2Sub: "Researches first and groups open questions into quick options.",
      s3Title: "Specialists Build",
      s3Sub: "Delegates scoped work in parallel and runs independent review.",
      s4Title: "Browser Check",
      s4Sub: "Opens real Chromium and fixes layout issues before finishing.",
    },
    roles: {
      aria: "UltraBuild and UltraPlan primary roles plus 5 background specialists",
      buildSub: "Default · coordinate, build & verify",
      planSub: "Read-only planning · never edits code",
      r1Title: "Librarian",
      r1Sub: "Docs & OSS",
      r2Title: "Architect",
      r2Sub: "Design & debug",
      r3Title: "Implementer",
      r3Sub: "Scoped build",
      r4Title: "Reviewer",
      r4Sub: "Code audit",
      r5Title: "Visual QA",
      r5Sub: "Real browser",
    },
    longRun: {
      aria: "Long-running milestone progression, steering, and resumption",
      n1Title: "Milestone 1",
      n1Sub: "Schedules next step",
      n2Title: "Auto-Continue",
      n2Sub: "No manual nudging",
      n3Title: "Progress Saved",
      n3Sub: "Stored in repo",
      n4Title: "Verified Done",
      n4Sub: "Checked before close",
      steerBold: "Steer anytime:",
      steerSub: "New message takes over",
      resumeBold: "Resume:",
      resumeSub: "\"read handoff & continue\"",
    },
    controls: {
      aria: "Live-synced UltraCode switches across Terminal, Desktop, and Web",
      approvalsLabel: "Approvals",
      approvalsSub: "Auto-approves routine steps so work flows; explicit deny rules always remain enforced.",
      directionLabel: "Direction",
      directionSub: "Asks before major product or design forks by default; switch to auto anytime for full autonomy.",
    },
    vqa: {
      aria: "Real-browser visual inspection loop",
      s1Title: "Launch Real App",
      s1Sub: "Opens real Chromium across desktop and mobile sizes.",
      s2Title: "Click & Inspect",
      s2Sub: "Exercises real controls and checks layout & contrast.",
      s3Title: "Fix Any Defect",
      s3Sub: "Catches overlap, clipping, or broken flows and fixes them.",
      s4Title: "Deliver Clean UI",
      s4Sub: "Avoids shipping green tests on top of broken screens.",
      loopNote: "Any visual or interaction issue loops back to step 02 before completion",
    },
    eras: {
      aria: "Prompt, Context, and Goal Engineering comparison",
      p1Sub: "Tweaking single-turn prompts",
      p1Muted: "Loses track on multi-step work",
      p2Sub: "Curating docs, tools & memory",
      p2Muted: "Still stops early or self-approves",
      p3Title: "Goal Engineering",
      p3Sub: "Driven end-to-end by verifiable outcomes",
      p3Ice: "Clarify → Build → Verify → Resume",
    },
  },
  zh: {
    hero: {
      stageAria: "UltraCode 工作流与真实浏览器页面检查示意",
      prompt: "做一个简洁深色风格的个人作品集主页，桌面端和手机端都要好看。",
      c1Title: "极简深色",
      c1Sub: "纯黑底色与清晰对比",
      c2Title: "清晰分栏",
      c2Sub: "细线边框与规整网格",
      c3Title: "清爽浅色",
      c3Sub: "明快纸感易读排版",
      m1: "需求细节与实现方案已确认",
      m2: "后台角色分工完成编码与独立复核",
      m3: "桌面端与手机端浏览器实测通过",
      browserHead: "真实浏览器页面检查通过",
      browserAria: "真实浏览器页面排版检查示意图",
    },
    comparison: {
      aria: "普通 AI 对话与 UltraCode 闭环工作流对比图",
      topTitle: "普通 AI 对话",
      topMeta: "急于动工 · 遗忘上下文 · 未经实测",
      t1: "没问清就写",
      t2: "长对话跑偏",
      t3: "改坏旧逻辑",
      t4: "半成品收尾",
      botTitle: "UltraCode 工作流",
      botMeta: "先对齐 · 独立复核 · 实测交付",
      b1: "01 先调研并确认细节",
      b2: "02 敲定方案再动工",
      b3: "03 后台角色分工实现",
      b4: "04 浏览器实测把关",
    },
    minimal: {
      aria: "1 分钟上手体验 4 步流程",
      s1Title: "直接说出目标",
      s1Sub: "在任意目录运行 ultracode，用自然语言描述想要的结果。",
      s2Title: "一次确认关键选项",
      s2Sub: "先调研再把关键取舍整理成选择题，附带推荐方案。",
      s3Title: "后台分工与复核",
      s3Sub: "主角色拆解任务，后台并行编码并执行独立代码审查。",
      s4Title: "浏览器实测后交付",
      s4Sub: "自动打开真实浏览器检查桌面与手机画面，修好错位再完工。",
    },
    roles: {
      aria: "UltraBuild 与 UltraPlan 双主角色及 5 位后台专家协作图",
      buildSub: "默认主角色 · 协调、实现与验证",
      planSub: "只读规划 · 推演方案不改代码",
      r1Title: "资料调研",
      r1Sub: "查文档与开源",
      r2Title: "架构分析",
      r2Sub: "边界与排障",
      r3Title: "编码实现",
      r3Sub: "按模块落地",
      r4Title: "代码复核",
      r4Sub: "独立查漏防回归",
      r5Title: "界面验收",
      r5Sub: "真实浏览器实测",
    },
    longRun: {
      aria: "长任务自动衔接、随时插话与重启恢复流程图",
      n1Title: "阶段 1 完成",
      n1Sub: "自动衔接下一步",
      n2Title: "持续推进",
      n2Sub: "无需反复催促",
      n3Title: "保存交接记录",
      n3Sub: "进度存入仓库",
      n4Title: "验证后交付",
      n4Sub: "全部达标再汇报",
      steerBold: "随时插话转向：",
      steerSub: "新消息立即接管节奏",
      resumeBold: "重启恢复：",
      resumeSub: "说“读取交接并继续”",
    },
    controls: {
      aria: "UltraCode 跨端同步双开关",
      approvalsLabel: "命令审批",
      approvalsSub: "默认自动放行常规步骤，减少频繁打断；你显式禁止的危险操作始终拦截。",
      directionLabel: "方向确认",
      directionSub: "默认遇到重大产品或架构分岔先询问你；想全程放手推进时可随时切为 auto。",
    },
    vqa: {
      aria: "真实浏览器界面检查闭环",
      s1Title: "启动本地页面",
      s1Sub: "在真实 Chromium 中打开应用，覆盖桌面与手机尺寸。",
      s2Title: "实际点击与巡检",
      s2Sub: "逐项操作按钮与表单，检查排版对齐与文字对比度。",
      s3Title: "发现问题即修复",
      s3Sub: "遇到遮挡、溢出或交互报错，自动退回修复后重测。",
      s4Title: "确认无误后交付",
      s4Sub: "避免出现“测试通过但页面错乱”的半成品。",
      loopNote: "只要界面或交互仍有瑕疵，会自动回到第 02 步重测直至达标",
    },
    eras: {
      aria: "Prompt、Context、Goal 三阶段对比",
      p1Sub: "反复推敲单句提示词",
      p1Muted: "步骤一多就遗忘或跑偏",
      p2Sub: "手动整理文档、工具与上下文",
      p2Muted: "看懂资料仍可能中途停工或草率交差",
      p3Title: "Goal Engineering 目标工程",
      p3Sub: "以可验证的最终结果驱动完整闭环",
      p3Ice: "前置澄清 → 分工实现 → 独立验证 → 断点续跑",
    },
  },
  ar: {
    hero: {
      stageAria: "معاينة سير عمل UltraCode والفحص البصري في المتصفح",
      prompt: "صمّم صفحة أعمال شخصية داكنة وبسيطة تبدو متقنة على الحاسوب والهاتف.",
      c1Title: "داكن بسيط",
      c1Sub: "أسود نقي وتباين واضح",
      c2Title: "شبكة منظّمة",
      c2Sub: "تقسيم دقيق بخطوط رفيعة",
      c3Title: "فاتح كلاسيكي",
      c3Sub: "قراءة مريحة وعالية الوضوح",
      m1: "تم توضيح المتطلبات واعتماد الخطة",
      m2: "أنجز الخبراء البناء والمراجعة المستقلة",
      m3: "اجتاز فحص المتصفح على الحاسوب والهاتف",
      browserHead: "اجتاز الفحص البصري في المتصفح",
      browserAria: "مخطط الفحص البصري في متصفح حقيقي",
    },
    comparison: {
      aria: "مقارنة بين الدردشة التقليدية وسير عمل UltraCode",
      topTitle: "دردشة تقليدية",
      topMeta: "تخمين · فقدان السياق · بلا تحقق",
      t1: "يبدأ بالتخمين",
      t2: "يفقد السياق",
      t3: "يكسر الكود",
      t4: "يتوقف مبكراً",
      botTitle: "سير عمل UltraCode",
      botMeta: "توافق · مراجعة · تحقق فعلي",
      b1: "01 بحث وتوضيح",
      b2: "02 اعتماد الخطة",
      b3: "03 تنفيذ متخصص",
      b4: "04 فحص بالمتصفح",
    },
    minimal: {
      aria: "خطوات التجربة السريعة الأربع",
      s1Title: "اذكر هدفك",
      s1Sub: "شغّل ultracode في أي مجلد وصف النتيجة المطلوبة.",
      s2Title: "أكد الخيارات",
      s2Sub: "يبحث أولاً ويجمع القرارات المهمة في بطاقات واضحة.",
      s3Title: "تنفيذ ومراجعة",
      s3Sub: "ينفّذ المهام بالتوازي ويجري مراجعة مستقلة للكود.",
      s4Title: "فحص بالمتصفح",
      s4Sub: "يفتح Chromium حقيقياً ويصلح عيوب التخطيط قبل التسليم.",
    },
    roles: {
      aria: "الدوران الرئيسيان UltraBuild وUltraPlan وخمسة خبراء",
      buildSub: "افتراضي · تنسيق وبناء وتحقق",
      planSub: "تخطيط للقراءة فقط بلا تعديل",
      r1Title: "الباحث",
      r1Sub: "الوثائق والمصادر",
      r2Title: "المعماري",
      r2Sub: "التصميم والتحليل",
      r3Title: "المنفِّذ",
      r3Sub: "بناء محدّد النطاق",
      r4Title: "المراجِع",
      r4Sub: "تدقيق مستقل",
      r5Title: "فحص الواجهة",
      r5Sub: "متصفح حقيقي",
    },
    longRun: {
      aria: "تقدّم المراحل والتوجيه والاستئناف",
      n1Title: "المرحلة 1",
      n1Sub: "يجدول الخطوة التالية",
      n2Title: "متابعة تلقائية",
      n2Sub: "دون تذكير يدوي",
      n3Title: "حفظ التقدّم",
      n3Sub: "محفوظ بالمستودع",
      n4Title: "تسليم موثَّق",
      n4Sub: "مُتحقَّق منه بالكامل",
      steerBold: "وجّه في أي لحظة:",
      steerSub: "رسالتك الجديدة تتولى القيادة",
      resumeBold: "الاستئناف:",
      resumeSub: "\"اقرأ التسليم وتابع\"",
    },
    controls: {
      aria: "مفاتيح UltraCode المتزامنة عبر الطرفية وسطح المكتب والويب",
      approvalsLabel: "موافقات الأوامر",
      approvalsSub: "يمرّر الخطوات الروتينية تلقائياً دون مقاطعة، مع بقاء قواعد المنع الصريحة فعّالة دائماً.",
      directionLabel: "أسئلة الاتجاه",
      directionSub: "يسألك افتراضياً قبل القرارات المعمارية الكبرى؛ ويمكنك التبديل إلى auto للاستقلالية الكاملة.",
    },
    vqa: {
      aria: "حلقة الفحص البصري في متصفح حقيقي",
      s1Title: "تشغيل التطبيق",
      s1Sub: "يفتح Chromium حقيقياً بأحجام الحاسوب والهاتف.",
      s2Title: "تفاعل وفحص",
      s2Sub: "ينقر الأزرار والنماذج ويتحقق من التخطيط والتباين.",
      s3Title: "إصلاح العيوب",
      s3Sub: "يكتشف التداخل أو القصّ ويعيد الإصلاح والفحص تلقائياً.",
      s4Title: "تسليم واجهة سليمة",
      s4Sub: "يمنع تسليم واجهات مكسورة رغم نجاح الاختبارات.",
      loopNote: "أي خلل بصري أو تفاعلي يعيد الفحص إلى الخطوة 02 حتى يكتمل الإصلاح",
    },
    eras: {
      aria: "تطور هندسة الأوامر والسياق والأهداف",
      p1Sub: "صياغة أوامر منفردة متكررة",
      p1Muted: "يفقد المسار في المهام الطويلة",
      p2Sub: "تجهيز الوثائق والأدوات والذاكرة",
      p2Muted: "قد يتوقف مبكراً أو يجيز عمله ذاتياً",
      p3Title: "هندسة الأهداف Goal Engineering",
      p3Sub: "إنجاز متكامل تقوده نتائج قابلة للتحقق",
      p3Ice: "توضيح ← بناء ← تحقق ← استئناف",
    },
  },
  fr: {
    hero: {
      stageAria: "Aperçu du flux UltraCode et du contrôle visuel sur navigateur réel",
      prompt: "Crée un portfolio sombre et épuré, impeccable sur ordinateur et mobile.",
      c1Title: "Sombre minimal",
      c1Sub: "Noir pur, contraste net",
      c2Title: "Grille précise",
      c2Sub: "Colonnes à filets 1px",
      c3Title: "Clair éditorial",
      c3Sub: "Lecture claire sur fond clair",
      m1: "Périmètre clarifié et plan validé",
      m2: "Implémentation et revue indépendante terminées",
      m3: "Contrôle navigateur ordinateur et mobile réussi",
      browserHead: "Contrôle visuel navigateur validé",
      browserAria: "Schéma d’inspection visuelle dans un navigateur réel",
    },
    comparison: {
      aria: "Comparaison entre chat IA standard et flux UltraCode",
      topTitle: "Chat IA classique",
      topMeta: "Devine · Perd le fil · Non vérifié",
      t1: "Devine d’emblée",
      t2: "Perd le contexte",
      t3: "Régressions",
      t4: "S’arrête trop tôt",
      botTitle: "Flux UltraCode",
      botMeta: "Aligné · Audité · Vérifié",
      b1: "01 Clarifier d’abord",
      b2: "02 Figer le plan",
      b3: "03 Sous-agents dédiés",
      b4: "04 QA navigateur réel",
    },
    minimal: {
      aria: "Parcours de découverte en 4 étapes",
      s1Title: "Décrivez l’objectif",
      s1Sub: "Lancez ultracode dans un dossier et indiquez le résultat attendu.",
      s2Title: "Validez les choix",
      s2Sub: "Regroupe d’emblée les arbitrages clés sous forme d’options claires.",
      s3Title: "Réalisation dédiée",
      s3Sub: "Coordonne l’implémentation en parallèle avec revue indépendante.",
      s4Title: "Contrôle navigateur",
      s4Sub: "Ouvre Chromium et corrige tout défaut visuel avant de livrer.",
    },
    roles: {
      aria: "Deux rôles principaux UltraBuild et UltraPlan et 5 spécialistes",
      buildSub: "Par défaut · construire et vérifier",
      planSub: "Planification seule · zéro édition",
      r1Title: "Librarian",
      r1Sub: "Docs & OSS",
      r2Title: "Architect",
      r2Sub: "Design & diagnostic",
      r3Title: "Implementer",
      r3Sub: "Code ciblé",
      r4Title: "Reviewer",
      r4Sub: "Audit critique",
      r5Title: "Visual QA",
      r5Sub: "Vrai Chromium",
    },
    longRun: {
      aria: "Progression par jalons, pilotage et reprise",
      n1Title: "Jalon 1",
      n1Sub: "Planifie la suite",
      n2Title: "Suite auto",
      n2Sub: "Sans relance manuelle",
      n3Title: "Passation sauvée",
      n3Sub: "Écrite dans le dépôt",
      n4Title: "Livraison vérifiée",
      n4Sub: "Validée avant clôture",
      steerBold: "Pilotez en direct :",
      steerSub: "Votre message prend la main",
      resumeBold: "Reprise :",
      resumeSub: "\"lis la passation et continue\"",
    },
    controls: {
      aria: "Interrupteurs UltraCode synchronisés sur Terminal, Desktop et Web",
      approvalsLabel: "Approbations",
      approvalsSub: "Autorise automatiquement les actions courantes ; vos règles de refus explicites restent toujours actives.",
      directionLabel: "Direction",
      directionSub: "Demande votre avis avant tout choix structurant ; passez en auto à tout moment pour l’autonomie complète.",
    },
    vqa: {
      aria: "Boucle de vérification visuelle sur navigateur réel",
      s1Title: "Lancer l’app",
      s1Sub: "Ouvre un vrai Chromium aux formats bureau et mobile.",
      s2Title: "Cliquer & inspecter",
      s2Sub: "Actionne les contrôles et vérifie alignements et contrastes.",
      s3Title: "Corriger les défauts",
      s3Sub: "Détecte débordements ou chevauchements et relance la correction.",
      s4Title: "Livrer proprement",
      s4Sub: "Fini les tests verts sur une interface cassée.",
      loopNote: "Tout défaut visuel renvoie automatiquement à l’étape 02 avant validation",
    },
    eras: {
      aria: "Évolution Prompt, Context et Goal Engineering",
      p1Sub: "Ajuster des prompts isolés",
      p1Muted: "Décroche sur les tâches longues",
      p2Sub: "Fournir docs, outils et mémoire",
      p2Muted: "S’arrête encore trop tôt sans audit",
      p3Title: "Goal Engineering",
      p3Sub: "Piloté de bout en bout par un résultat vérifiable",
      p3Ice: "Clarifier → Construire → Vérifier → Reprendre",
    },
  },
  ru: {
    hero: {
      stageAria: "Рабочий процесс UltraCode и проверка в реальном браузере",
      prompt: "Сделай лаконичное тёмное портфолио для компьютера и телефона.",
      c1Title: "Тёмный минимализм",
      c1Sub: "Чистый чёрный и контраст",
      c2Title: "Точная сетка",
      c2Sub: "Тонкие линии и колонки",
      c3Title: "Светлая классика",
      c3Sub: "Лёгкое чтение как с листа",
      m1: "Требования уточнены и план согласован",
      m2: "Код написан субагентами и прошёл ревью",
      m3: "Проверка в браузере на ПК и телефоне пройдена",
      browserHead: "Визуальная проверка в браузере пройдена",
      browserAria: "Схема проверки интерфейса в реальном браузере",
    },
    comparison: {
      aria: "Сравнение обычного ИИ-чата и процесса UltraCode",
      topTitle: "Обычный ИИ-чат",
      topMeta: "Догадки · Сбой контекста · Без тестов",
      t1: "Пишет наугад",
      t2: "Теряет контекст",
      t3: "Ломает старое",
      t4: "Бросает на полпути",
      botTitle: "Процесс UltraCode",
      botMeta: "Согласовано · Проверено · Надёжно",
      b1: "01 Уточнение деталей",
      b2: "02 Фиксация плана",
      b3: "03 Работа экспертов",
      b4: "04 Проверка в браузере",
    },
    minimal: {
      aria: "4 шага знакомства за 1 минуту",
      s1Title: "Опишите цель",
      s1Sub: "Запустите ultracode в любой папке и опишите нужный результат.",
      s2Title: "Выберите варианты",
      s2Sub: "Изучает задачу и сразу собирает ключевые развилки в карточки.",
      s3Title: "Работа экспертов",
      s3Sub: "Распределяет задачи параллельно и проводит независимое ревью.",
      s4Title: "Проверка в браузере",
      s4Sub: "Открывает Chromium и устраняет огрехи вёрстки до сдачи.",
    },
    roles: {
      aria: "Основные роли UltraBuild и UltraPlan и 5 фоновых экспертов",
      buildSub: "По умолчанию · сборка и проверка",
      planSub: "Только план · без правки кода",
      r1Title: "Librarian",
      r1Sub: "Документы и OSS",
      r2Title: "Architect",
      r2Sub: "Архитектура",
      r3Title: "Implementer",
      r3Sub: "Реализация",
      r4Title: "Reviewer",
      r4Sub: "Строгое ревью",
      r5Title: "Visual QA",
      r5Sub: "Браузер Chromium",
    },
    longRun: {
      aria: "Автопродвижение по этапам, управление и возобновление",
      n1Title: "Этап 1",
      n1Sub: "Планирует следующий",
      n2Title: "Автопродолжение",
      n2Sub: "Без напоминаний",
      n3Title: "Прогресс сохранён",
      n3Sub: "Записан в репозиторий",
      n4Title: "Проверено",
      n4Sub: "Сдано после тестов",
      steerBold: "Меняйте курс:",
      steerSub: "Сообщение сразу в силе",
      resumeBold: "После паузы:",
      resumeSub: "\"прочитай итоги и продолжай\"",
    },
    controls: {
      aria: "Синхронизируемые переключатели UltraCode",
      approvalsLabel: "Одобрение команд",
      approvalsSub: "Автоматически пропускает рутинные шаги без лишних пауз; явные запреты всегда соблюдаются.",
      directionLabel: "Вопросы по курсу",
      directionSub: "По умолчанию уточняет важные архитектурные развилки; переключите в auto для полной автономии.",
    },
    vqa: {
      aria: "Цикл визуальной проверки в реальном браузере",
      s1Title: "Запуск страницы",
      s1Sub: "Открывает реальный Chromium для десктопа и телефона.",
      s2Title: "Клики и осмотр",
      s2Sub: "Нажимает элементы и проверяет сетку, отступы и контраст.",
      s3Title: "Исправление",
      s3Sub: "При наложениях или сбоях возвращает задачу на доработку.",
      s4Title: "Чистая сдача",
      s4Sub: "Исключает ситуацию «тесты зелёные, а экран сломан».",
      loopNote: "Любой дефект интерфейса автоматически возвращает проверку к шагу 02",
    },
    eras: {
      aria: "Эволюция Prompt, Context и Goal Engineering",
      p1Sub: "Подбор одиночных промптов",
      p1Muted: "Сбивается на длинных задачах",
      p2Sub: "Подготовка документации и памяти",
      p2Muted: "Всё ещё спешит сдать сырой код",
      p3Title: "Goal Engineering",
      p3Sub: "Сквозная работа ради проверяемого итога",
      p3Ice: "Уточнение → Сборка → Проверка → Продолжение",
    },
  },
  es: {
    hero: {
      stageAria: "Vista previa del flujo de UltraCode y revisión visual en navegador",
      prompt: "Crea un portafolio oscuro y limpio que se vea bien en escritorio y móvil.",
      c1Title: "Oscuro mínimo",
      c1Sub: "Negro puro y alto contraste",
      c2Title: "Rejilla limpia",
      c2Sub: "Columnas de línea fina",
      c3Title: "Claro clásico",
      c3Sub: "Lectura nítida tipo papel",
      m1: "Requisitos aclarados y plan confirmado",
      m2: "Subagentes implementaron y revisaron el código",
      m3: "Revisión en navegador de escritorio y móvil superada",
      browserHead: "Revisión visual en navegador superada",
      browserAria: "Diagrama de inspección visual en navegador real",
    },
    comparison: {
      aria: "Comparación entre chat de IA estándar y flujo UltraCode",
      topTitle: "Chat IA estándar",
      topMeta: "Adivina · Pierde contexto · Sin verificar",
      t1: "Empieza adivinando",
      t2: "Pierde el hilo",
      t3: "Rompe código",
      t4: "Se detiene antes",
      botTitle: "Flujo UltraCode",
      botMeta: "Alineado · Auditado · Verificado",
      b1: "01 Investigar y aclarar",
      b2: "02 Fijar plan primero",
      b3: "03 Ejecución experta",
      b4: "04 QA en navegador",
    },
    minimal: {
      aria: "Flujo de prueba rápida en 4 pasos",
      s1Title: "Explica tu objetivo",
      s1Sub: "Ejecuta ultracode en cualquier carpeta y describe el resultado.",
      s2Title: "Confirma opciones",
      s2Sub: "Investiga antes y agrupa decisiones clave en tarjetas claras.",
      s3Title: "Construcción experta",
      s3Sub: "Delega tareas en paralelo y ejecuta revisión independiente.",
      s4Title: "Revisión en navegador",
      s4Sub: "Abre Chromium real y corrige fallos visuales antes de cerrar.",
    },
    roles: {
      aria: "Roles principales UltraBuild y UltraPlan más 5 especialistas",
      buildSub: "Por defecto · construir y verificar",
      planSub: "Solo planificación · sin editar código",
      r1Title: "Librarian",
      r1Sub: "Docs y OSS",
      r2Title: "Architect",
      r2Sub: "Diseño y depuración",
      r3Title: "Implementer",
      r3Sub: "Código acotado",
      r4Title: "Reviewer",
      r4Sub: "Auditoría crítica",
      r5Title: "Visual QA",
      r5Sub: "Chromium real",
    },
    longRun: {
      aria: "Avance por hitos, control en vivo y reanudación",
      n1Title: "Hito 1",
      n1Sub: "Agenda el siguiente",
      n2Title: "Avance continuo",
      n2Sub: "Sin empujones manuales",
      n3Title: "Traspaso guardado",
      n3Sub: "Persistido en el repo",
      n4Title: "Entrega verificada",
      n4Sub: "Validada al cerrar",
      steerBold: "Guía en vivo:",
      steerSub: "Tu mensaje toma el mando",
      resumeBold: "Reanudar:",
      resumeSub: "\"lee el traspaso y continúa\"",
    },
    controls: {
      aria: "Interruptores sincronizados de UltraCode en Terminal, Escritorio y Web",
      approvalsLabel: "Aprobaciones",
      approvalsSub: "Aprueba pasos rutinarios automáticamente sin interrupciones; las reglas de bloqueo explícitas siempre se respetan.",
      directionLabel: "Dirección",
      directionSub: "Pregunta por defecto ante decisiones importantes de diseño; cambia a auto cuando quieras autonomía total.",
    },
    vqa: {
      aria: "Ciclo de verificación visual en navegador real",
      s1Title: "Abrir app real",
      s1Sub: "Inicia Chromium real en tamaños de escritorio y móvil.",
      s2Title: "Probar e inspeccionar",
      s2Sub: "Acciona controles reales y revisa alineación y contraste.",
      s3Title: "Corregir defectos",
      s3Sub: "Detecta solapamientos o cortes y vuelve a probar tras corregir.",
      s4Title: "Entregar UI limpia",
      s4Sub: "Evita dar por válido un código cuyos tests pasan pero se ve roto.",
      loopNote: "Cualquier defecto visual o de interacción regresa al paso 02 antes de entregar",
    },
    eras: {
      aria: "Evolución de Prompt, Context y Goal Engineering",
      p1Sub: "Ajustar prompts aislados",
      p1Muted: "Pierde el rumbo en tareas largas",
      p2Sub: "Preparar docs, herramientas y memoria",
      p2Muted: "Aún se detiene pronto o se autoaprueba",
      p3Title: "Goal Engineering",
      p3Sub: "Impulsado de principio a fin por resultados verificables",
      p3Ice: "Aclarar → Construir → Verificar → Reanudar",
    },
  },
};

export const FAQ_SCHEMA_ITEMS: Record<Locale, Array<{ q: string; a: string }>> = {
  en: [
    {
      q: "Does UltraCode modify official OpenCode or read my API keys?",
      a: "No. UltraCode is strictly additive and provider/model-neutral. It never patches the official OpenCode CLI or Desktop binary, and never reads, stores, or transmits your API keys.",
    },
    {
      q: "Do I need to install OpenCode before installing UltraCode?",
      a: "No. On macOS, Linux, and Windows, both the install script and ultracode upgrade automatically detect official OpenCode V2, installing it from the official channel if missing or keeping it updated.",
    },
    {
      q: "Which AI models does UltraCode support?",
      a: "Whatever model and provider you already configure in OpenCode. UltraCode never locks you into a single model vendor.",
    },
    {
      q: "Will UltraCode overwrite my existing OpenCode configuration or skills?",
      a: "No. Install and sync merge additively while preserving your existing settings, comments, and skills. Running ultracode uninstall --yes removes only unmodified files added by UltraCode.",
    },
    {
      q: "How do I update UltraCode or verify setup health?",
      a: "Run ultracode upgrade to update official OpenCode and UltraCode together, or run ultracode doctor anytime for a fast check that makes zero AI model calls.",
    },
  ],
  zh: [
    {
      q: "UltraCode 会修改官方 OpenCode 程序或读取我的 API Key 吗？",
      a: "不会。UltraCode 采用纯增量扩展接入官方 OpenCode，不修改官方终端或桌面客户端二进制，也不读取、存储或上传你的 API Key 与账号凭据。",
    },
    {
      q: "安装前需要先手动安装 OpenCode 吗？",
      a: "不需要。在 macOS、Linux 与 Windows 上，安装脚本与 ultracode upgrade 都会自动检测官方 OpenCode V2，缺失时自动从官方渠道安装。",
    },
    {
      q: "UltraCode 支持哪些 AI 模型？",
      a: "你原本在 OpenCode 中使用什么模型和服务商，安装后就继续使用什么模型，完全保持模型与服务商中立。",
    },
    {
      q: "安装会覆盖我原有的 OpenCode 配置和自定义技能吗？",
      a: "不会。安装与同步保留你原有的个性化配置、注释与自定义技能；执行 ultracode uninstall --yes 仅移除 UltraCode 新增的受管文件。",
    },
    {
      q: "日常如何升级或检查环境状态？",
      a: "运行 ultracode upgrade 一键更新官方 OpenCode 与 UltraCode；运行 ultracode doctor 可执行零模型调用的快速健康检查。",
    },
  ],
  ar: [
    {
      q: "هل يعدّل UltraCode برنامج OpenCode الرسمي أو يقرأ مفاتيح API الخاصة بي؟",
      a: "لا. يعمل UltraCode كطبقة إضافية محايدة تجاه النماذج والمزوّدين، ولا يعدّل الملفات التنفيذية الرسمية لـ OpenCode ولا يقرأ أو يخزّن مفاتيح API.",
    },
    {
      q: "هل أحتاج إلى تثبيت OpenCode يدوياً قبل تثبيت UltraCode؟",
      a: "لا. على أنظمة macOS وLinux وWindows يقوم سكربت التثبيت والأمر ultracode upgrade باكتشاف OpenCode V2 الرسمي وتثبيته أو تحديثه تلقائياً.",
    },
    {
      q: "ما نماذج الذكاء الاصطناعي التي يدعمها UltraCode؟",
      a: "يدعم أي نموذج ومزوّد تستخدمه بالفعل داخل OpenCode دون أي قيود أو احتكار.",
    },
    {
      q: "هل يستبدل التثبيت إعداداتي أو مهاراتي الحالية في OpenCode؟",
      a: "لا. يدمج التثبيت الإعدادات بشكل آمن مع الحفاظ على تخصيصاتك، ويزيل الأمر ultracode uninstall --yes ملفات UltraCode فقط.",
    },
    {
      q: "كيف أحدّث الأداة أو أتحقق من سلامة الإعداد؟",
      a: "شغّل ultracode upgrade لتحديث OpenCode وUltraCode معاً، أو شغّل ultracode doctor لإجراء فحص سريع دون أي استدعاء لنماذج الذكاء الاصطناعي.",
    },
  ],
  fr: [
    {
      q: "UltraCode modifie-t-il OpenCode officiel ou lit-il mes clés API ?",
      a: "Non. UltraCode est strictement additif et neutre vis-à-vis des modèles. Il ne modifie jamais les binaires officiels d’OpenCode et ne lit ni ne transmet vos clés API.",
    },
    {
      q: "Dois-je installer OpenCode avant d’installer UltraCode ?",
      a: "Non. Sur macOS, Linux et Windows, l’installateur et ultracode upgrade détectent automatiquement OpenCode V2 officiel et l’installent si nécessaire.",
    },
    {
      q: "Quels modèles d’IA sont pris en charge ?",
      a: "Tous les modèles et fournisseurs déjà configurés dans votre environnement OpenCode.",
    },
    {
      q: "L’installation écrase-t-elle ma configuration ou mes skills existants ?",
      a: "Non. La synchronisation fusionne sans perte vos réglages et skills existants, et ultracode uninstall --yes retire uniquement ce qu’UltraCode a ajouté.",
    },
    {
      q: "Comment mettre à jour ou vérifier l’installation ?",
      a: "Exécutez ultracode upgrade pour mettre à jour OpenCode et UltraCode en une étape, ou ultracode doctor pour un diagnostic instantané sans appel modèle.",
    },
  ],
  ru: [
    {
      q: "Изменяет ли UltraCode официальный OpenCode и читает ли мои API-ключи?",
      a: "Нет. UltraCode работает как неинвазивное расширение, не патчит официальные бинарные файлы OpenCode и никогда не читает и не передаёт ваши API-ключи.",
    },
    {
      q: "Нужно ли вручную устанавливать OpenCode перед установкой UltraCode?",
      a: "Нет. На macOS, Linux и Windows скрипт установки и команда ultracode upgrade автоматически находят и при необходимости устанавливают официальный OpenCode V2.",
    },
    {
      q: "Какие ИИ-модели поддерживает UltraCode?",
      a: "Любые модели и провайдеры, которые вы уже используете в OpenCode, без привязки к конкретному вендору.",
    },
    {
      q: "Перезапишет ли установка мои текущие настройки или навыки OpenCode?",
      a: "Нет. Настройки объединяются бережно с сохранением ваших комментариев и навыков, а ultracode uninstall --yes удаляет только файлы UltraCode.",
    },
    {
      q: "Как обновлять UltraCode и проверять состояние окружения?",
      a: "Используйте ultracode upgrade для обновления OpenCode и UltraCode одной командой или ultracode doctor для быстрой проверки без вызовов моделей.",
    },
  ],
  es: [
    {
      q: "¿UltraCode modifica OpenCode oficial o lee mis claves API?",
      a: "No. UltraCode es estrictamente aditivo y neutral respecto a proveedores y modelos. Nunca modifica los binarios oficiales ni lee o envía tus claves API.",
    },
    {
      q: "¿Necesito instalar OpenCode antes de instalar UltraCode?",
      a: "No. En macOS, Linux y Windows, tanto el instalador como ultracode upgrade detectan e instalan o actualizan automáticamente OpenCode V2 oficial.",
    },
    {
      q: "¿Qué modelos de IA soporta UltraCode?",
      a: "Cualquier modelo y proveedor que ya utilices en OpenCode, sin bloqueos de proveedor.",
    },
    {
      q: "¿Sobrescribirá mi configuración o skills actuales de OpenCode?",
      a: "No. La instalación combina la configuración respetando tus ajustes y skills existentes, y ultracode uninstall --yes elimina únicamente lo añadido por UltraCode.",
    },
    {
      q: "¿Cómo actualizo o compruebo el estado de la instalación?",
      a: "Ejecuta ultracode upgrade para actualizar OpenCode y UltraCode juntos, o ultracode doctor para una verificación rápida sin llamadas a modelos.",
    },
  ],
};
