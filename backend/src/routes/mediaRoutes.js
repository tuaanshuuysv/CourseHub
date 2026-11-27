import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { AVATARS_DIR, CERTIFICATES_DIR } from '../middleware/upload.js';

const router = express.Router();
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

// Ham dung chung phuc vu tep tinh trong thu muc duoc phep va chan path traversal
function sendSafeMediaFile(dirPath, rawName, notFoundMessage, res) {
  const safeName = path.basename(String(rawName || ''));
  if (!safeName || safeName !== rawName || !SAFE_FILENAME_REGEX.test(safeName)) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(dirPath, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: notFoundMessage });
  }

  res.setHeader('Cache-Control', 'public, max-age=604800');
  return res.sendFile(filePath);
}

// Phuc vu anh dai dien da tai len voi kiem tra chong tan cong path traversal
router.get('/avatars/:filename', (req, res) => {
  return sendSafeMediaFile(AVATARS_DIR, req.params.filename, 'Avatar file not found', res);
});

// Phuc vu anh chup chung chi ung vien giang vien da tai len
router.get('/certificates/:filename', (req, res) => {
  return sendSafeMediaFile(CERTIFICATES_DIR, req.params.filename, 'Certificate image not found', res);
});

export default router;
