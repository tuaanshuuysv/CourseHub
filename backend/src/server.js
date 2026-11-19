import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';

// Khoi tao ung dung Express
const app = express();

// Cau hinh CORS cho phep Frontend gui kem cookie xac thuc
app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5176', 'http://localhost:5175', 'http://localhost:5173'],
    credentials: true,
  })
);

// Cau hinh parse JSON body va cookie
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Endpoint kiem tra trang thai hoat dong cua may chu
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'CourseHub MERN API',
    timestamp: new Date().toISOString(),
  });
});

// Middleware xu ly loi tap trung
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'An internal server error occurred' });
});

const PORT = process.env.PORT || 5000;

// Ket noi MongoDB va khoi chay HTTP server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CourseHub Express API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start CourseHub backend:', err);
    process.exit(1);
  });
