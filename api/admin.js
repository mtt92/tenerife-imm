// api/admin.js - Sistema di autenticazione admin
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cristina2024';
const JWT_SECRET = process.env.JWT_SECRET || 'cristina-jwt-secret-key';

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo método POST permitido' });
  }

  const { password } = req.body;

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  // Generar token JWT
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });

  return res.status(200).json({
    success: true,
    token,
    expiresIn: 24 * 60 * 60 * 1000
  });
}
