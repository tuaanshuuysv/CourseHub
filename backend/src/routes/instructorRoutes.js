import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import DraftVideo from '../models/DraftVideo.js';
import { authenticate, requireInstructor } from '../middleware/auth.js';
import { VIDEOS_DIR, uploadThumbnail, uploadVideo } from '../middleware/upload.js';

const router = express.Router();
const DRAFT_VIDEO_TTL_MS = 24 * 60 * 60 * 1000;

// Tat ca tuyen API giang vien deu yeu cau dang nhap dung vai tro instructor
router.use(authenticate, requireInstructor);

// Tai len anh bia khoa hoc cho giang vien (gioi han 5 MB)
router.post('/thumbnails/upload', uploadThumbnail.single('thumbnail'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Thumbnail image file is required' });
  }

  return res.status(201).json({
    message: 'Thumbnail uploaded successfully',
    imageUrl: `/api/media/thumbnails/${req.file.filename}`,
  });
});

// Tai len video bai giang va ghi nhan trang thai nhap DraftVideo (het han sau 24 gio neu chua gan khoa hoc)
router.post('/videos/upload', uploadVideo.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const expireAt = new Date(Date.now() + DRAFT_VIDEO_TTL_MS);
    const draft = await DraftVideo.create({
      key: req.file.filename,
      contentType: req.file.mimetype || 'video/mp4',
      expireAt,
    });

    return res.status(201).json({
      message: 'Video uploaded successfully',
      key: draft.key,
      videoUrl: `/api/media/videos/${draft.key}`,
      expireAt: draft.expireAt,
    });
  } catch (err) {
    if (req.file?.filename) {
      const filePath = path.join(VIDEOS_DIR, req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return next(err);
  }
});

export default router;
