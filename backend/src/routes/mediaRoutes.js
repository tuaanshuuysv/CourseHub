import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { AVATARS_DIR } from '../middleware/upload.js';

const router = express.Router();
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

// Phuc vu anh dai dien da tai len voi kiem tra chong tan cong path traversal
router.get('/avatars/:filename', (req, res) => {
  const rawName = String(req.params.filename || '');
  const safeName = path.basename(rawName);
  if (!safeName || safeName !== rawName || !SAFE_FILENAME_REGEX.test(safeName)) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(AVATARS_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Avatar file not found' });
  }

  res.setHeader('Cache-Control', 'public, max-age=604800');
  return res.sendFile(filePath);
});

export default router;
