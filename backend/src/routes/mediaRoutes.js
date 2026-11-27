import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { AVATARS_DIR, CERTIFICATES_DIR, THUMBNAILS_DIR, VIDEOS_DIR } from '../middleware/upload.js';

const router = express.Router();
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const RANGE_HEADER_REGEX = /^bytes=(\d*)-(\d*)$/;
const DEFAULT_STREAM_CHUNK_BYTES = 2 * 1024 * 1024;
const VIDEO_CONTENT_TYPE_BY_EXT = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

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

// Phuc vu anh bia khoa hoc da tai len cua giang vien
router.get('/thumbnails/:filename', (req, res) => {
  return sendSafeMediaFile(THUMBNAILS_DIR, req.params.filename, 'Thumbnail image not found', res);
});

// Phuc vu video bai giang ho tro HTTP 206 Partial Content Range Streaming de tua muot
router.get('/videos/:filename', (req, res, next) => {
  const rawName = String(req.params.filename || '');
  const safeName = path.basename(rawName);
  if (!safeName || safeName !== rawName || !SAFE_FILENAME_REGEX.test(safeName)) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(VIDEOS_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Video file not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(safeName).toLowerCase();
  const contentType = VIDEO_CONTENT_TYPE_BY_EXT[ext] || 'application/octet-stream';
  const rangeHeader = req.headers.range;

  if (!rangeHeader) {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', next);
    return stream.pipe(res);
  }

  const match = RANGE_HEADER_REGEX.exec(rangeHeader.trim());
  if (!match || fileSize === 0) {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    return res.status(416).json({ message: 'Requested range not satisfiable' });
  }

  const [, startStr, endStr] = match;
  let start = 0;
  let end = fileSize - 1;

  if (startStr === '' && endStr !== '') {
    // Dinh dang suffix range: bytes=-<N>
    const suffixLen = Number(endStr);
    if (!Number.isFinite(suffixLen) || suffixLen <= 0) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).json({ message: 'Requested range not satisfiable' });
    }
    start = Math.max(0, fileSize - suffixLen);
    end = fileSize - 1;
  } else if (startStr !== '') {
    start = Number(startStr);
    end =
      endStr !== ''
        ? Math.min(Number(endStr), fileSize - 1)
        : Math.min(start + DEFAULT_STREAM_CHUNK_BYTES - 1, fileSize - 1);
  } else {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    return res.status(416).json({ message: 'Requested range not satisfiable' });
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= fileSize || end < start) {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    return res.status(416).json({ message: 'Requested range not satisfiable' });
  }

  const chunkSize = end - start + 1;
  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400',
  });

  const stream = fs.createReadStream(filePath, { start, end });
  stream.on('error', next);
  return stream.pipe(res);
});

export default router;
