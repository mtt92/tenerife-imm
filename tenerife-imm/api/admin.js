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

  const { password, action } = req.body;

  try {
    switch (action) {
      case 'login':
        return await handleLogin(password, res);
      case 'verify':
        return await handleVerify(req.body.token, res);
      default:
        return await handleLogin(password, res);
    }
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({ 
      error: 'Error de autenticación',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleLogin(password, res) {
  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }

  // Verificar contraseña (en desarrollo usamos texto plano, en producción bcrypt)
  let isValid = false;
  
  if (process.env.ADMIN_PASSWORD_HASH) {
    // Usar hash en producción
    isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  } else {
    // Comparación simple para desarrollo
    isValid = password === ADMIN_PASSWORD;
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  // Generar token JWT
  const token = jwt.sign(
    { 
      admin: true,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(200).json({
    success: true,
    token,
    expiresIn: 24 * 60 * 60 * 1000, // 24 horas en ms
    message: 'Autenticación exitosa'
  });
}

async function handleVerify(token, res) {
  if (!token) {
    return res.status(400).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.admin) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      admin: true
    });
  } catch (error) {
    return res.status(401).json({ 
      error: 'Token expirado o inválido',
      valid: false
    });
  }
}