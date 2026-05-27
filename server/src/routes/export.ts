import { Router } from 'express';
import multer from 'multer';
import { normalizeImage } from '../services/imageService.ts';

export const exportRouter = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

/**
 * POST /api/export/normalize-image
 * Normalize a crop image (resize, trim whitespace, standardize).
 */
exportRouter.post('/normalize-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    const options = {
      maxWidth: parseInt(req.body.maxWidth) || 800,
      trimWhitespace: req.body.trimWhitespace === 'true',
      padding: parseInt(req.body.padding) || 10,
    };

    const result = await normalizeImage(req.file.buffer, options);

    res.set('Content-Type', 'image/png');
    res.send(result);
  } catch (err) {
    console.error('Image normalization error:', err);
    res.status(500).json({ error: 'Image normalization failed' });
  }
});

/**
 * GET /api/export/status
 * Check export service status.
 */
exportRouter.get('/status', (_req, res) => {
  res.json({ available: true });
});
