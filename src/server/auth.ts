import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.ts';
import { User } from '../types/index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'si-sumatif-sd-secret-token-key-2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      nipNik: user.nipNik,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi tidak valid atau belum masuk.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; nipNik: string; role: string };
    const user = db.findUserById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Akun tidak ditemukan atau telah dinonaktifkan.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token sesi kedaluwarsa atau tidak sah. Silakan masuk kembali.' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Tindakan ini memerlukan hak akses Administrator.' });
  }
  next();
}

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function comparePassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}
