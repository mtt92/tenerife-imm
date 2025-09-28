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

  const adminToken = req.headers['x-admin-token'];
  if (!adminToken) {
    return res.status(401).json({ error: 'Token de administrador requerido' });
  }

  try {
    jwt.verify(adminToken, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const { filename, file } = req.body;
    
    if (!filename || !file) {
      return res.status(400).json({ error: 'Filename y file requeridos' });
    }

    // Log per debug
    console.log('Attempting upload for:', filename);

    // Convertir base64 a buffer
    const buffer = Buffer.from(file, 'base64');
    
    // Generar nome unico
    const timestamp = Date.now();
    const extension = filename.split('.').pop();
    const uniqueFilename = `properties/${timestamp}.${extension}`;

    // Upload a Vercel Blob con token esplicito
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log('Upload successful:', blob.url);

    return res.status(200).json({
      success: true,
      url: blob.url,
      message: 'Imagen subida exitosamente'
    });

  } catch (error) {
    console.error('Upload error details:', error);
    return res.status(500).json({
      error: 'Error al subir imagen',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
