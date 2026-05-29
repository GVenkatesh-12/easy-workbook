# Easy Workbook 📝

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGVenkatesh-12%2Feasy-workbook)

> **Live Demo:** [https://easy-workbook.vercel.app/](https://easy-workbook.vercel.app/)

Convert unstructured workbook PDFs into structured, beautiful digital practice notebooks for competitive exam preparation (GATE, JEE, UPSC, etc.). 

Easy Workbook is a **100% client-side**, tablet-first web application that lets students open workbook PDFs, interactively crop question and answer regions, organize them, and generate highly customizable practice notebooks—either as print-ready PDFs or interactive HTML practice sheets.

---

## ✨ Features

### ✂️ Interactive Cropping & Management
- **High-Performance PDF Rendering:** Virtualized PDF rendering powered by PDF.js (handles 500+ page documents smoothly).
- **Precision Selection:** Drag-to-select question and answer regions with intuitive Konva.js overlays.
- **Question Sidebar:** Drag-to-reorder questions (via `dnd-kit`), duplicate, exclude, and preview thumbnails in a sleek sidebar.

### 🎨 Powerful Customization & Live Preview
- **Interactive Live Preview:** Instantly visualize your final PDF layout, adjust image scaling, and drag to dynamically re-allocate solving space between questions.
- **5 Premium Themes:** Minimal, Blueprint, Dark Academia, Pastel, and Exam Style.
- **4 Note Styles:** Blank, Lined, Dotted, and Grid (with adjustable opacity & spacing).
- **Flexible Layouts:** Choose between 1, 2, or 3 questions per page.

### 📤 Dual Export Modes
- **PDF Export:** Generate beautiful, print-ready practice notebooks with your chosen theme and solving space.
- **Interactive HTML Export:** Generate self-contained, offline practice sheets complete with:
  - **TCS iON Scientific Calculator:** Built-in floating calculator for exam simulation.
  - **Productivity Tools:** A built-in timer, progress stats, and solved/revise tracking.
  - **Keyboard Shortcuts:** Fast keyboard navigation (`T` for timer, `C` for calculator, etc.).

### 📱 Premium UX
- **Tablet-First Design:** Full support for pinch-to-zoom, two-finger panning, and stylus-friendly interactions.
- **Modern UI:** Glassmorphism UI, smooth Framer Motion animations, dark mode by default, and macOS-style hidden scrollbars.

---

## 🛠 Tech Stack

Since the entire application runs in the browser, no backend is required! All PDF generation and image processing happens entirely on the client-side.

- **Framework:** React 19, TypeScript, Vite 8
- **Styling:** Tailwind CSS v4
- **PDF Processing:** PDF.js (rendering) & pdf-lib (generation)
- **Canvas/Interactions:** Konva.js + react-konva
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Drag & Drop:** `@dnd-kit`
- **Hosting:** Vercel (Ready out-of-the-box!)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/GVenkatesh-12/easy-workbook.git
   cd easy-workbook
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

---

## ⌨️ HTML Practice Mode Shortcuts

When you export your workbook as an Interactive HTML file, use these shortcuts:

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate between questions |
| `S` | Mark question as Solved |
| `R` | Mark question for Revision |
| `A` | Show/Hide Answer Region |
| `T` | Start/Stop/Reset Timer |
| `C` | Open TCS iON Scientific Calculator |

---

## 📄 License

MIT
