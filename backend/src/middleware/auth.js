import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import User from '../models/User.js';

const AUTH_COOKIE_NAME = 'coursehub_token';

// Lay khoa bi mat JWT tu bien moi truong tai thoi diem chay
function getJwtSecret() {
  return process.env.JWT_SECRET || 'coursehub_mern_jwt_secret_2026';
}

// Cau hinh thuoc tinh chung cho cookie xac thuc HttpOnly
function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

// Ky JWT chua id va vai tro nguoi dung
export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Gan JWT vao HttpOnly cookie tren response
export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Xoa HttpOnly cookie khi nguoi dung dang xuat
export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, getCookieOptions());
}

// Trich xuat token tu HttpOnly cookie hoac header Authorization Bearer
export function extractToken(req) {
  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    return bearerToken || null;
  }
  return null;
}

// Tra cuu tai khoan hop le tu payload JWT va kiem tra hieu luc phien dang nhap
async function resolveAccount(decoded) {
  if (!decoded?.id || !decoded?.role) return null;

  if (decoded.role === 'admin') {
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isApproved) return null;
    return { id: admin._id.toString(), role: 'admin', account: admin };
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActivated) return null;

  // Vo hieu hoa token cu neu nguoi dung da doi mat khau sau thoi diem cap token
  if (user.passwordChangedAt && decoded.iat) {
    const tokenIssuedAtMs = decoded.iat * 1000;
    const passwordChangedAtMs = user.passwordChangedAt.getTime() - 1000;
    if (tokenIssuedAtMs < passwordChangedAtMs) {
      return null;
    }
  }

  return { id: user._id.toString(), role: user.role, account: user };
}

// Middleware bat buoc xac thuc JWT cho cac API can dang nhap
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Please sign in' });
    }
    const decoded = jwt.verify(token, getJwtSecret());
    const resolved = await resolveAccount(decoded);
    if (!resolved) {
      return res.status(401).json({ message: 'Session invalid or account deactivated' });
    }
    req.auth = resolved;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Middleware xac thuc tuy chon cho cac API cong khai (cho phep khach vang lai)
export async function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      const resolved = await resolveAccount(decoded);
      if (resolved) {
        req.auth = resolved;
      }
    }
  } catch {
    // Bo qua token khong hop le doi voi yeu cau cong khai
  }
  return next();
}

// Middleware phan quyen truy cap theo danh sach vai tro (RBAC)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: 'Unauthorized: Please sign in' });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    return next();
  };
}

// Cac bi danh middleware phan quyen tien dung cho 3 vai tro he thong
export const requireAuth = authenticate;
export const requireStudent = requireRole('student', 'instructor');
export const requireInstructor = requireRole('instructor');
export const requireAdmin = requireRole('admin');
