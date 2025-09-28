// api/properties.js - API Serverless per gestire le proprietà
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'properties.json');

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getProperties(req, res);
      case 'POST':
        return await createProperty(req, res);
      case 'PUT':
        return await updateProperty(req, res);
      case 'DELETE':
        return await deleteProperty(req, res);
      default:
        return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// GET - Obtener propiedades
async function getProperties(req, res) {
  try {
    let properties = [];
    
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      properties = JSON.parse(data);
    } catch (error) {
      // Si el archivo no existe, crear uno vacío
      await ensureDataFile([]);
      properties = [];
    }

    // Aplicar filtros de query
    const { type, operation, location, minPrice, maxPrice, featured } = req.query;
    
    let filtered = properties;

    if (type) filtered = filtered.filter(p => p.type === type);
    if (operation) filtered = filtered.filter(p => p.operation === operation);
    if (location) filtered = filtered.filter(p => p.location === location);
    if (minPrice) filtered = filtered.filter(p => p.price >= parseInt(minPrice));
    if (maxPrice) filtered = filtered.filter(p => p.price <= parseInt(maxPrice));
    if (featured === 'true') filtered = filtered.filter(p => p.featured === true);

    // Ordenar por fecha de creación (más recientes primero)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: filtered.length,
      total: properties.length,
      data: filtered,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    throw new Error('Error al cargar propiedades: ' + error.message);
  }
}

// POST - Crear nueva propiedad
async function createProperty(req, res) {
  // Verificar token admin
  const adminToken = req.headers['x-admin-token'];
  if (!verifyAdminToken(adminToken)) {
    return res.status(401).json({ error: 'Token de administrador requerido' });
  }

  const requiredFields = ['title', 'type', 'operation', 'location', 'price', 'size', 'description'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Campos requeridos: ${missingFields.join(', ')}`
    });
  }

  try {
    // Crear nueva propiedad
    const property = {
      id: 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: req.body.title.trim(),
      type: req.body.type,
      operation: req.body.operation,
      location: req.body.location,
      locationName: getLocationName(req.body.location),
      price: parseInt(req.body.price),
      priceType: req.body.priceType || 'total',
      size: parseInt(req.body.size),
      totalSize: parseInt(req.body.totalSize) || null,
      terrace: parseInt(req.body.terrace) || 0,
      rooms: parseInt(req.body.rooms) || 0,
      bathrooms: parseInt(req.body.bathrooms) || 1,
      floor: req.body.floor || '',
      pool: req.body.pool || 'no',
      parking: req.body.parking || 'no',
      virtualTour: req.body.virtualTour || '',
      description: req.body.description.trim(),
      features: Array.isArray(req.body.features) ? req.body.features : [],
      images: Array.isArray(req.body.images) ? req.body.images : [],
      featured: req.body.featured === true,
      active: req.body.active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Cargar propiedades existentes
    let properties = [];
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      properties = JSON.parse(data);
    } catch (error) {
      // Archivo no existe, se creará
    }

    // Agregar nueva propiedad
    properties.unshift(property);

    // Guardar archivo
    await ensureDataFile(properties);

    res.status(201).json({
      success: true,
      message: 'Propiedad creada exitosamente',
      data: property
    });
  } catch (error) {
    throw new Error('Error al crear propiedad: ' + error.message);
  }
}

// PUT - Actualizar propiedad
async function updateProperty(req, res) {
  const adminToken = req.headers['x-admin-token'];
  if (!verifyAdminToken(adminToken)) {
    return res.status(401).json({ error: 'Token de administrador requerido' });
  }

  const propertyId = req.query.id || req.body.id;
  if (!propertyId) {
    return res.status(400).json({ error: 'ID de propiedad requerido' });
  }

  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    let properties = JSON.parse(data);

    const propertyIndex = properties.findIndex(p => p.id === propertyId);
    if (propertyIndex === -1) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    // Actualizar propiedad
    const updatedProperty = {
      ...properties[propertyIndex],
      ...req.body,
      id: propertyId, // Mantener ID original
      updatedAt: new Date().toISOString()
    };

    if (req.body.location) {
      updatedProperty.locationName = getLocationName(req.body.location);
    }

    properties[propertyIndex] = updatedProperty;

    await ensureDataFile(properties);

    res.status(200).json({
      success: true,
      message: 'Propiedad actualizada exitosamente',
      data: updatedProperty
    });
  } catch (error) {
    throw new Error('Error al actualizar propiedad: ' + error.message);
  }
}

// DELETE - Eliminar propiedad
async function deleteProperty(req, res) {
  const adminToken = req.headers['x-admin-token'];
  if (!verifyAdminToken(adminToken)) {
    return res.status(401).json({ error: 'Token de administrador requerido' });
  }

  const propertyId = req.query.id;
  if (!propertyId) {
    return res.status(400).json({ error: 'ID de propiedad requerido' });
  }

  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    let properties = JSON.parse(data);

    const propertyIndex = properties.findIndex(p => p.id === propertyId);
    if (propertyIndex === -1) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const deletedProperty = properties.splice(propertyIndex, 1)[0];
    await ensureDataFile(properties);

    res.status(200).json({
      success: true,
      message: 'Propiedad eliminada exitosamente',
      data: deletedProperty
    });
  } catch (error) {
    throw new Error('Error al eliminar propiedad: ' + error.message);
  }
}

// Funciones auxiliares
function verifyAdminToken(token) {
  const validTokens = [
    process.env.ADMIN_SECRET_TOKEN,
    'cristina-admin-2024' // Token desarrollo - cambiar en producción
  ];
  return validTokens.includes(token);
}

function getLocationName(locationCode) {
  const locations = {
    'los-cristianos': 'Los Cristianos',
    'playa-americas': 'Playa de las Américas',
    'costa-adeje': 'Costa Adeje',
    'arona': 'Arona',
    'san-miguel': 'San Miguel de Abona',
    'puerto-colon': 'Puerto Colón'
  };
  return locations[locationCode] || locationCode;
}

async function ensureDataFile(data) {
  try {
    // Crear directorio si no existe
    const dataDir = path.dirname(DATA_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Escribir archivo
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error al guardar archivo de datos:', error);
    throw error;
  }
}