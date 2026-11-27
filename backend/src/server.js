import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB, disconnectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';

// Khoi tao ung dung Express
const app = express();

// Doc danh sach origin duoc phep goi API tu bien moi truong
const allowedOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  'http://localhost:5176,http://localhost:5175,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Cau hinh CORS cho phep Frontend gui kem cookie xac thuc
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Cau hinh parse JSON body, form urlencoded (callback thanh toan) va cookie
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Endpoint kiem tra trang thai hoat dong cua may chu
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'CourseHub MERN API',
    timestamp: new Date().toISOString(),
  });
});

// Dang ky cac tuyen API xac thuc nguoi dung, danh muc cong khai, hoc vien, giang vien va media
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/media', mediaRoutes);

// Middleware bat loi 404 cho cac duong dan khong ton tai
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Middleware xu ly loi tap trung phan loai theo ma trang thai HTTP chuan
app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    return res.status(409).json({ message: `${field} already exists` });
  }

  const status = err.statusCode || 500;
  return res.status(status).json({ message: err.message || 'An internal server error occurred' });
});

const PORT = process.env.PORT || 5000;
let httpServer = null;

// Co che tat may chu va dong ket noi MongoDB an toan (graceful shutdown)
async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down CourseHub backend...`);
  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Ket noi MongoDB va khoi chay HTTP server
connectDB()
  .then(() => {
    httpServer = app.listen(PORT, () => {
      console.log(`CourseHub Express API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start CourseHub backend:', err);
    process.exit(1);
  });
