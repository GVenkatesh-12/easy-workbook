import type { Question } from '@/types';
import { extractMergedCropsAsDataUrl } from './cropExtractor';

/**
 * Generate a self-contained HTML practice sheet.
 * The HTML works completely offline with embedded images.
 */
export async function generateHtmlPractice(
  questions: Question[],
  onProgress?: (progress: number) => void
): Promise<string> {
  const included = questions.filter((q) => q.includedInExport);
  const questionData: Array<{
    label: string;
    page: number;
    imageUrl: string;
    answerUrl?: string;
  }> = [];

  for (let i = 0; i < included.length; i++) {
    const q = included[i];
    onProgress?.(((i + 1) / included.length) * 100);

    const imageUrl = await extractMergedCropsAsDataUrl(q.questionCrops, 2);
    let answerUrl: string | undefined;
    if (q.answerCrop) {
      answerUrl = await extractMergedCropsAsDataUrl([q.answerCrop], 2);
    }

    questionData.push({
      label: q.label,
      page: q.pageNumber + 1,
      imageUrl,
      answerUrl,
    });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Easy Workbook Practice Sheet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #0f0f14;
      color: #e4e4e7;
      line-height: 1.6;
      padding: 20px;
    }

    .top-bar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 15, 20, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 16px 20px;
      margin: -20px -20px 24px -20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .header {
      text-align: left;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #a78bfa, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }

    .header p { color: #71717a; font-size: 14px; }

    .timer-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #18181b;
      border-radius: 12px;
      border: 1px solid #27272a;
    }

    .timer-display {
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: 700;
      color: #a78bfa;
      min-width: 100px;
      text-align: center;
    }

    .timer-btn {
      padding: 8px 20px;
      border-radius: 10px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .timer-btn.start { background: #22c55e; color: white; }
    .timer-btn.stop { background: #ef4444; color: white; }
    .timer-btn.reset { background: #27272a; color: #a1a1aa; border: 1px solid #3f3f46; }

    .stats {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .stat {
      flex: 1;
      min-width: 120px;
      padding: 14px;
      background: #18181b;
      border-radius: 12px;
      border: 1px solid #27272a;
      text-align: center;
    }

    .stat-value { font-size: 24px; font-weight: 700; color: #a78bfa; }
    .stat-label { font-size: 12px; color: #71717a; margin-top: 4px; }

    .question-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      margin-bottom: 16px;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .question-card:hover { border-color: #3f3f46; }
    .question-card.solved { border-color: #22c55e40; }
    .question-card.revise { border-color: #f59e0b40; }

    .question-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #27272a;
    }

    .question-label {
      font-weight: 700;
      color: #818cf8;
      font-size: 15px;
    }

    .question-page { color: #52525b; font-size: 12px; }

    .question-actions {
      display: flex;
      gap: 6px;
    }

    .action-btn {
      padding: 5px 12px;
      border-radius: 8px;
      border: 1px solid #3f3f46;
      background: #27272a;
      color: #a1a1aa;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover { background: #3f3f46; color: #e4e4e7; }
    .action-btn.solved-btn.active { background: #22c55e20; color: #22c55e; border-color: #22c55e40; }
    .action-btn.revise-btn.active { background: #f59e0b20; color: #f59e0b; border-color: #f59e0b40; }

    .question-image-wrapper {
      background-color: var(--question-bg);
      border: 0.5pt solid var(--border);
      padding: 4pt;
      margin-bottom: 8pt;
      text-align: left;
    }

    .question-image {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0;
    }

    .answer-section {
      border-top: 1px solid #27272a;
    }

    .answer-toggle {
      width: 100%;
      padding: 12px 18px;
      background: none;
      border: none;
      color: #6366f1;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s;
    }

    .answer-toggle:hover { background: #27272a30; }

    .answer-content {
      display: none;
      padding: 16px;
      background: #f0fdf4;
      text-align: center;
    }

    .answer-content.visible { display: block; }

    .answer-content img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }

    .keyboard-hint {
      text-align: center;
      padding: 16px;
      color: #52525b;
      font-size: 12px;
    }

    kbd {
      padding: 2px 6px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
    }

    @media (max-width: 768px) {
      body { padding: 12px; }
      .header h1 { font-size: 20px; }
      .stats { grid-template-columns: 1fr 1fr 1fr; }
      .stat-value { font-size: 18px; }
      .stat { min-width: auto; padding: 10px; }
      .calc-drawer { width: 100%; right: -100%; border-left: none; }
    }

    /* Calculator Drawer */
    .calc-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background: #8b5cf6;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      z-index: 100;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .calc-fab:hover {
      transform: scale(1.05) translateY(-2px);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
    }
    .calc-drawer {
      position: fixed;
      top: 0;
      right: -420px;
      width: 420px;
      height: 100dvh;
      background: #18181b;
      border-left: 1px solid #27272a;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
      z-index: 101;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }
    .calc-drawer.open {
      right: 0;
    }
    .calc-header {
      padding: 16px 20px;
      border-bottom: 1px solid #27272a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f0f14;
    }
    .calc-header h2 {
      font-size: 16px;
      color: #e4e4e7;
    }
    .calc-close {
      background: none;
      border: none;
      color: #a1a1aa;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      padding: 4px;
    }
    .calc-iframe {
      flex: 1;
      width: 100%;
      border: none;
      background: #ffffff; /* The TCS iON calc has a white UI */
    }
    .calc-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .calc-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="header">
      <h1>📝 Practice Sheet</h1>
      <p>${included.length} questions • Generated by Easy Workbook</p>
    </div>
    <div class="timer-bar">
      <button class="timer-btn start" id="timerToggle" onclick="toggleTimer()">Start</button>
      <span class="timer-display" id="timerDisplay">00:00</span>
      <button class="timer-btn reset" onclick="resetTimer()">Reset</button>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value" id="totalCount">${included.length}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="solvedCount">0</div>
      <div class="stat-label">Solved</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="reviseCount">0</div>
      <div class="stat-label">Revise</div>
    </div>
  </div>

  <div id="questionList">
    ${questionData.map((q, i) => `
    <div class="question-card" id="q${i}" data-status="">
      <div class="question-header">
        <div>
          <span class="question-label">${q.label}</span>
          <span class="question-page"> — Page ${q.page}</span>
        </div>
        <div class="question-actions">
          <button class="action-btn solved-btn" onclick="toggleStatus(${i}, 'solved')">✓ Solved</button>
          <button class="action-btn revise-btn" onclick="toggleStatus(${i}, 'revise')">⚠ Revise</button>
        </div>
      </div>
      <div class="question-image">
        <img src="${q.imageUrl}" alt="${q.label}" loading="lazy">
      </div>
      ${q.answerUrl ? `
      <div class="answer-section">
        <button class="answer-toggle" onclick="toggleAnswer(${i})">▶ Show Answer</button>
        <div class="answer-content" id="answer${i}">
          <img src="${q.answerUrl}" alt="${q.label} Answer" loading="lazy">
        </div>
      </div>` : ''}
    </div>`).join('')}
  </div>

  <div class="keyboard-hint">
    <kbd>↑</kbd><kbd>↓</kbd> Navigate &nbsp;
    <kbd>S</kbd> Toggle Solved &nbsp;
    <kbd>R</kbd> Toggle Revise &nbsp;
    <kbd>A</kbd> Toggle Answer &nbsp;
    <kbd>T</kbd> Toggle Timer &nbsp;
    <kbd>C</kbd> Toggle Calculator
  </div>

  <!-- Calculator Elements -->
  <div class="calc-overlay" id="calcOverlay" onclick="toggleCalculator()"></div>
  <button class="calc-fab" onclick="toggleCalculator()" title="Scientific Calculator">🖩</button>
  <div class="calc-drawer" id="calcDrawer">
    <div class="calc-header">
      <h2>Scientific Calculator</h2>
      <button class="calc-close" onclick="toggleCalculator()">&times;</button>
    </div>
    <iframe src="https://www.tcsion.com/OnlineAssessment/ScientificCalculator/Calculator.html" class="calc-iframe" title="Scientific Calculator"></iframe>
  </div>

  <script>
    let timerInterval = null;
    let seconds = 0;
    let currentIndex = 0;

    function toggleTimer() {
      const btn = document.getElementById('timerToggle');
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.textContent = 'Start';
        btn.className = 'timer-btn start';
      } else {
        timerInterval = setInterval(() => {
          seconds++;
          const m = String(Math.floor(seconds / 60)).padStart(2, '0');
          const s = String(seconds % 60).padStart(2, '0');
          document.getElementById('timerDisplay').textContent = m + ':' + s;
        }, 1000);
        btn.textContent = 'Stop';
        btn.className = 'timer-btn stop';
      }
    }

    function resetTimer() {
      clearInterval(timerInterval);
      timerInterval = null;
      seconds = 0;
      document.getElementById('timerDisplay').textContent = '00:00';
      document.getElementById('timerToggle').textContent = 'Start';
      document.getElementById('timerToggle').className = 'timer-btn start';
    }

    function toggleStatus(index, status) {
      const card = document.getElementById('q' + index);
      const current = card.dataset.status;
      card.dataset.status = current === status ? '' : status;
      card.className = 'question-card ' + card.dataset.status;
      
      const btns = card.querySelectorAll('.action-btn');
      btns.forEach(b => b.classList.remove('active'));
      if (card.dataset.status) {
        card.querySelector('.' + status + '-btn').classList.add('active');
      }
      updateStats();
    }

    function toggleAnswer(index) {
      const content = document.getElementById('answer' + index);
      const btn = content.previousElementSibling;
      if (content.classList.contains('visible')) {
        content.classList.remove('visible');
        btn.textContent = '▶ Show Answer';
      } else {
        content.classList.add('visible');
        btn.textContent = '▼ Hide Answer';
      }
    }

    function updateStats() {
      const cards = document.querySelectorAll('.question-card');
      let solved = 0, revise = 0;
      cards.forEach(c => {
        if (c.dataset.status === 'solved') solved++;
        if (c.dataset.status === 'revise') revise++;
      });
      document.getElementById('solvedCount').textContent = solved;
      document.getElementById('reviseCount').textContent = revise;
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const cards = document.querySelectorAll('.question-card');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentIndex = Math.min(currentIndex + 1, cards.length - 1);
        cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.key === 's' || e.key === 'S') {
        toggleStatus(currentIndex, 'solved');
      } else if (e.key === 'r' || e.key === 'R') {
        toggleStatus(currentIndex, 'revise');
      } else if (e.key === 'a' || e.key === 'A') {
        toggleAnswer(currentIndex);
      } else if (e.key === 't' || e.key === 'T') {
        toggleTimer();
      } else if (e.key === 'c' || e.key === 'C') {
        toggleCalculator();
      }
    });

    function toggleCalculator() {
      const drawer = document.getElementById('calcDrawer');
      const overlay = document.getElementById('calcOverlay');
      drawer.classList.toggle('open');
      overlay.classList.toggle('open');
      
      // Auto focus the iframe if possible (though cross-origin might prevent actual focus, it's good practice)
      if (drawer.classList.contains('open')) {
        drawer.querySelector('iframe').focus();
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Download an HTML string as a file.
 */
export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
