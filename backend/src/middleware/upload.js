import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
export const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');
export const CERTIFICATES_DIR = path.join(UPLOADS_ROOT, 'certificates');
export const THUMBNAILS_DIR = path.join(UPLOADS_ROOT, 'thumbnails');
export const VIDEOS_DIR = path.join(UPLOADS_ROOT, 'videos');

const ALLOWED_IMAGE_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_VIDEO_MIME = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

// Dam bao thu muc luu tru tep tai len ton tai truoc khi ghi
export function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Khoi tao bo luu tru dia cung sinh ten tep ngau nhien an toan chong trung lap
function createDiskStorage(targetDir, mimeExtMap) {
  ensureDirExists(targetDir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureDirExists(targetDir);
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const ext = mimeExtMap[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

// Bo loc chi cho phep dinh dang anh hop le (JPEG, PNG, WebP, GIF)
function imageFileFilter(_req, file, cb) {
  if (ALLOWED_IMAGE_MIME[file.mimetype]) {
    return cb(null, true);
  }
  const err = new Error('Only JPEG, PNG, WebP, and GIF image files are allowed');
  err.statusCode = 400;
  return cb(err);
}

// Bo loc chi cho phep dinh dang video bai giang hop le (MP4, WebM, MOV)
function videoFileFilter(_req, file, cb) {
  if (ALLOWED_VIDEO_MIME[file.mimetype]) {
    return cb(null, true);
  }
  const err = new Error('Only MP4, WebM, and MOV video files are allowed');
  err.statusCode = 400;
  return cb(err);
}

// Middleware upload anh dai dien nguoi dung (gioi han 5 MB)
export const uploadAvatar = multer({
  storage: createDiskStorage(AVATARS_DIR, ALLOWED_IMAGE_MIME),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Middleware upload anh chup chung chi dang ky giang vien (gioi han 5 MB)
export const uploadCertificate = multer({
  storage: createDiskStorage(CERTIFICATES_DIR, ALLOWED_IMAGE_MIME),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Middleware upload anh bia khoa hoc cho giang vien (gioi han 5 MB)
export const uploadThumbnail = multer({
  storage: createDiskStorage(THUMBNAILS_DIR, ALLOWED_IMAGE_MIME),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Middleware upload video bai giang cho giang vien (gioi han 200 MB)
export const uploadVideo = multer({
  storage: createDiskStorage(VIDEOS_DIR, ALLOWED_VIDEO_MIME),
  fileFilter: videoFileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});
