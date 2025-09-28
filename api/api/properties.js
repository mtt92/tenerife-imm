// api/properties.js - API per gestire le proprietà
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = '/tmp/properties.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getProperties(req, res);
      case 'POST':
        return await createProperty(req, res);
      case 'DELETE':
        return await deleteProperty(req, res);
      default:
        return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getProperties(req, res) {
  let properties = [];
  
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    properties = JSON.parse(data);
  } catch (error) {
    // File non esiste, restituisci array vuoto
    properties = [];
  }

  return res.status(200).json({
    success: true,
    count: properties.length,
    data: properties
  });
}

async function createProperty(req, res) {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken) {
    return res.status(401).json({ error: 'Token amministratore richiesto' });
  }

  const property = {
    id: 'prop_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  let properties = [];
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    properties = JSON.parse(data);
  } catch (error) {
    // File non esiste
  }

  properties.unshift(property);
  await fs.writeFile(DATA_FILE, JSON.stringify(properties, null, 2));

  return res.status(201).json({
    success: true,
    message: 'Proprietà creata con successo',
    data: property
  });
}

async function deleteProperty(req, res) {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken) {
    return res.status(401).json({ error: 'Token amministratore richiesto' });
  }

  const { id } = req.query;
  let properties = [];
  
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    properties = JSON.parse(data);
  } catch (error) {
    return res.status(404).json({ error: 'Proprietà non trovata' });
  }

  properties = properties.filter(p => p.id !== id);
  await fs.writeFile(DATA_FILE, JSON.stringify(properties, null, 2));

  return res.status(200).json({
    success: true,
    message: 'Proprietà eliminata'
  });
}
