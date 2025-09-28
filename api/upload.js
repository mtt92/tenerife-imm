import { put } from '@vercel/blob';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cristina-jwt-secret-key';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo método POST permitido' });
  }

  // Verificar token admin
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken) {
    return res.status(401).json({ error: 'Token de administrador requerido' });
  }

  try {
    // Verificar JWT
    jwt.verify(adminToken, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const { filename, file } = req.body;
    
    if (!filename || !file) {
      return res.status(400).json({ error: 'Filename y file requeridos' });
    }

    // Convertir base64 a buffer
    const buffer = Buffer.from(file, 'base64');
    
    // Generar nombre único
    const timestamp = Date.now();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `properties/${timestamp}_${cleanFilename}`;

    // Upload a Vercel Blob
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
    });

    return res.status(200).json({
      success: true,
      url: blob.url,
      message: 'Imagen subida exitosamente'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Error al subir imagen',
      message: error.message
    });
  }
}
