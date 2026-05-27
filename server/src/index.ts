import express from 'express';
import cors from 'cors';
import { exportRouter } from './routes/export.ts';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/export', exportRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Easy Workbook server running on http://localhost:${PORT}`);
});
