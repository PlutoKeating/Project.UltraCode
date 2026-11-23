<div align="center">

<a href="https://ultracode.plutokeating.beer/ar/">
  <img src="./docs/assets/hero-banner.svg" alt="UltraCode v1.0.0 — حدّد الهدف واستلم عملاً مُتحقَّقاً منه" width="100%" />
</a>

<br />

[![Release](https://img.shields.io/badge/Release-v1.0.0-ffffff?style=flat-square&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/releases/latest)
[![Website](https://img.shields.io/badge/Website-ultracode.plutokeating.beer-bae6fd?style=flat-square&labelColor=0a0a0a)](https://ultracode.plutokeating.beer/ar/)
[![Platforms](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-d4d4d4?style=flat-square&labelColor=0a0a0a)](https://ultracode.plutokeating.beer/ar/docs/getting-started/)
[![Provenance](https://img.shields.io/badge/Built%20with-UltraCode%20v0.3.0-e5a03d?style=flat-square&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/releases/tag/v0.3.0)
[![CI](https://img.shields.io/github/actions/workflow/status/PlutoKeating/Project.UltraCode/ci.yml?branch=main&style=flat-square&label=CI&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/actions/workflows/ci.yml)

[English](README.md) · [简体中文](README_ZH.md) · **العربية** · [Français](README_FR.md) · [Русский](README_RU.md) · [Español](README_ES.md)

[الموقع الرسمي](https://ultracode.plutokeating.beer/ar/) • [دليل البدء في دقيقة](https://ultracode.plutokeating.beer/ar/docs/getting-started/) • [البنية المعمارية](docs/ARCHITECTURE.md) • [مرجع الأوامر](docs/API.md)

</div>

<div dir="rtl">

**UltraCode (`v1.0.0`)** هو طبقة تعزيز غير تدخلية ومحايدة تجاه النماذج والمزوّدين مبنية فوق **OpenCode V2** الرسمي، تركز على **هندسة الأهداف (Goal Engineering)** عبر أنظمة **macOS وLinux وWindows**، وتغطي **الطرفية (TUI) وتطبيق سطح المكتب والويب والهاتف المحمول**.

بدلاً من التخمين المبكر أو فقدان السياق في منتصف المهام المعقدة، يوضّح UltraCode المتطلبات مسبقاً عبر بطاقات اختيار منظّمة، وينسّق العمل بين خبراء متخصصين في الخلفية، ويفحص الواجهات فعلياً داخل متصفح Chromium حقيقي، ويحفظ ملفات التسليم داخل المستودع لاستئناف العمل بسلاسة.

</div>

> [!NOTE]
> **توثيق البناء الذاتي:** تم تطوير وبناء الإصدار الرسمي `UltraCode v1.0.0` (بما يشمل الحزم الأساسية والموقع السداسي اللغات وخطوط النشر) بمساعدة **UltraCode `v0.3.0`**.

<div align="center">
  <img src="./docs/assets/workflow-comparison.svg" alt="مقارنة بين الدردشة التقليدية وسير عمل UltraCode" width="100%" />
</div>

<div dir="rtl">

## القدرات الرئيسية

- **أمر واحد دون متطلبات مسبقة**: يعمل الأمر الوحيد `ultracode` بتوافق كامل مع جميع معاملات وأوامر `opencode` الفرعية؛ كما يتكفّل المثبّت والأمر `ultracode upgrade` بتثبيت أو تحديث OpenCode V2 الرسمي (`v2.3.2+`) تلقائياً.
- **مزامنة فورية عبر جميع الواجهات**: حزمة الإضافة `ultracode-conversation` توحّد الحالة لحظياً عبر الطرفية وتطبيق OpenCode Desktop (`ComposerPill` وصفحة `Settings → UltraCode`) والويب والهاتف (`/approvals` و`/direction`).
- **دوران رئيسيان وخمسة خبراء في الخلفية**: بدّل في أي وقت عبر `Shift+Tab` بين `UltraBuild` (للتنفيذ المتكامل) و`UltraPlan` (للتخطيط للقراءة فقط)، بدعم تلقائي من `librarian` و`architect` و`implementer` و`reviewer` و`visual-evaluator`.
- **استمرارية المهام الطويلة والاستئناف السلس**: ينتقل بين المراحل تلقائياً، ويستجيب فوراً لأي رسالة جديدة، ويستأنف التقدّم بعد إعادة التشغيل مع مشغّل `ultracode ralph run` الأصيل.
- **إضافي بالكامل وقابل للإزالة النظيفة**: لا يعدّل الملفات التنفيذية الرسمية لـ OpenCode، ولا يقرأ مفاتيح API الخاصة بك، ويحافظ على إعداداتك ومهاراتك الحالية.

</div>

<div align="center">
  <img src="./docs/assets/roles-topology.svg" alt="الدوران الرئيسيان UltraBuild وUltraPlan وخمسة خبراء" width="100%" />
</div>

<div dir="rtl">

## البدء السريع

### 1. التثبيت بأمر واحد

</div>

**macOS / Linux**:

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

**Windows (PowerShell)**:

```powershell
irm https://ultracode.plutokeating.beer/install.ps1 | iex
```

> [!TIP]
> لا حاجة إلى تثبيت Node.js أو Bun أو OpenCode مسبقاً؛ في حال عدم وجود OpenCode V2 الرسمي سيقوم السكربت بتثبيته تلقائياً من القناة الرسمية.

<div dir="rtl">

### 2. التشغيل عبر أي واجهة

</div>

```bash
ultracode           # تشغيل واجهة الطرفية في المجلد الحالي
ultracode desktop   # فتح تطبيق سطح المكتب الرسمي أو تنزيل المثبّت تلقائياً
ultracode pair      # إنشاء رابط ورمز QR لربط المتصفح أو الهاتف المحمول
```

<div dir="rtl">

## مرجع الأوامر

| الأمر | الوصف |
| --- | --- |
| `ultracode [args...]` | تشغيل OpenCode مع تمرير جميع الخيارات والمسارات والأوامر الفرعية |
| `ultracode desktop` | فتح تطبيق OpenCode Desktop الرسمي أو تنزيله |
| `ultracode pair [--remote]` | ربط متصفح الويب أو الهاتف عبر رابط ورمز QR |
| `ultracode upgrade` | تحديث OpenCode V2 الرسمي وUltraCode معاً ومزامنة الإعدادات |
| `ultracode sync` | مزامنة الإعدادات والإضافة والأدوار وبيئة التشغيل بأمان |
| `ultracode doctor` | فحص سريع للإصدار والإضافات والأدوار دون أي استدعاء للنماذج |
| `ultracode ralph run <goal>` | تشغيل دورات Ralph المعزولة داخل linked Git worktree |
| `ultracode uninstall --yes` | إزالة UltraCode بنظافة مع الحفاظ على إعداداتك ونسخك الاحتياطية |

## هيكلية المستودع

</div>

```text
Project.UltraCode/
├── packages/
│   ├── installer/      # Unified ultracode CLI, JSONC union merger & 6-target standalone builder
│   ├── plugin-gui/     # OpenCode Desktop GUI plugin (ComposerPill & SettingsPage)
│   └── config/         # Embedded OpenCode roles, Server/TUI/RPC conversation plugin & Ralph templates
├── scripts/            # Zero-prerequisite install scripts (install.sh & install.ps1)
├── website/            # Astro + Starlight 6-language website & docs (ultracode.plutokeating.beer)
└── docs/               # Architecture, CLI API, Quick Start, Cloudflare deployment & SVG assets
```

<div dir="rtl">

## التحقق المحلي

</div>

```bash
bun install --cwd packages/plugin-gui
bun run --cwd packages/plugin-gui check
bun run --cwd packages/plugin-gui build

bun install --cwd packages/installer
bun test --cwd packages/installer
bun run --cwd packages/installer check
bun run --cwd packages/installer build

bun install --cwd website
bun run --cwd website check
bun run --cwd website build
```

<div dir="rtl">

## الوثائق والروابط

- **الموقع الرسمي والأدلة بست لغات**: [English](https://ultracode.plutokeating.beer) · [简体中文](https://ultracode.plutokeating.beer/zh/) · [العربية](https://ultracode.plutokeating.beer/ar/) · [Français](https://ultracode.plutokeating.beer/fr/) · [Русский](https://ultracode.plutokeating.beer/ru/) · [Español](https://ultracode.plutokeating.beer/es/)
- فهرس مخصص لوكلاء الذكاء الاصطناعي: [`llms.txt`](https://ultracode.plutokeating.beer/llms.txt) · [`llms-full.txt`](https://ultracode.plutokeating.beer/llms-full.txt)

</div>
