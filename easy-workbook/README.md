# Easy Workbook

> Convert workbook PDFs into structured digital practice notebooks for competitive exam preparation (GATE, JEE, UPSC, etc.)

A **tablet-first** web application that lets students open workbook PDFs, interactively select question regions, organize them, and generate customizable practice notebooks — either as PDFs or interactive HTML practice sheets.

## ✨ Features

### Core Workflow
- **PDF Viewer** — High-performance virtualized PDF rendering with PDF.js (supports 500+ page documents)
- **Interactive Selection** — Drag-to-select question regions with Konva.js overlays
- **Question Manager** — Sidebar with drag-to-reorder (dnd-kit), thumbnails, include/exclude toggle
- **PDF Export** — Generate practice notebooks with pdf-lib (questions + solving space)
- **HTML Export** — Self-contained offline practice sheets with timer, solved/revise tracking

### Customization
- **5 Themes** — Minimal, Blueprint, Dark Academia, Pastel, Exam Style
- **4 Note Styles** — Blank, Lined, Dotted, Grid (with adjustable opacity & spacing)
- **3 Layout Options** — 1, 2, or 3 questions per page
- **3 Export Types** — Practice Notebook, Answer Key, Combined

### Tablet-First UX
- Pinch-to-zoom & two-finger pan
- Large touch targets (44px minimum)
- Stylus-friendly selection
- Dark mode by default
- Glassmorphism UI with smooth Framer Motion animations

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS v4 |
| PDF Rendering | PDF.js |
| Canvas Interactions | Konva.js + react-konva |
| PDF Generation | pdf-lib |
| State Management | Zustand |
| Drag & Drop | @dnd-kit |
| Animations | Framer Motion |
| Backend | Node.js, Express.js 5 |
| Image Processing | Sharp |

## 📂 Project Structure

```
workbook_maker/
├── easy-workbook/          # Frontend (Vite + React)
│   ├── public/
│   │   └── pdf.worker.min.mjs
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas/     # Konva selection overlays
│   │   │   ├── export/     # Export dialog
│   │   │   ├── layout/     # App shell, toolbar, welcome
│   │   │   ├── pdf/        # PDF viewer components
│   │   │   ├── sidebar/    # Question manager
│   │   │   └── ui/         # Reusable UI primitives
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/
│   │   │   ├── canvas/     # Coordinate utilities
│   │   │   ├── export/     # PDF/HTML generation
│   │   │   └── pdf/        # PDF.js manager
│   │   ├── store/          # Zustand stores
│   │   └── types/          # TypeScript definitions
│   └── ...
└── server/                 # Backend (Express.js)
    └── src/
        ├── routes/
        └── services/
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Frontend

```bash
cd easy-workbook
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend (optional, for image normalization)

```bash
cd server
npm install
npm run dev
```

The API will be available at `http://localhost:3001`

## 📱 Usage

1. **Open PDF** — Drop a workbook PDF onto the welcome screen or click to browse
2. **Select Questions** — Switch to Select mode (✂️ icon), drag to crop question regions
3. **Organize** — Reorder questions in the sidebar, toggle include/exclude
4. **Export** — Click the export button, configure theme/layout/note style, generate PDF or HTML

## ⌨️ Keyboard Shortcuts (HTML Practice Mode)

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate questions |
| S | Toggle solved |
| R | Toggle revise |
| A | Toggle answer |
| T | Toggle timer |

## 🎨 Themes

| Theme | Description |
|-------|-------------|
| Minimal | Clean white with subtle accents |
| Blueprint | Engineering blue tones |
| Dark Academia | Warm vintage parchment |
| Pastel | Soft pink and purple |
| Exam Style | High-contrast black & white |

## License

MIT
