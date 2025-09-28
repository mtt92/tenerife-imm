import { Redis } from '@upstash/redis';

// Configurazione Redis con le credenziali trovate
const redis = new Redis({
  url: 'redis://default:13PKu6EzWbxn7bbSYQt9uKqdM0D0gdIh@redis-14524.c14.us-east-1-2.ec2.redns.redis-cloud.com:14524'
});

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
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
}

async function getProperties(req, res) {
  try {
    const properties = await redis.get('properties') || [];
    
    const { type, operation, location, featured } = req.query;
    let filtered = properties;

    if (type) filtered = filtered.filter(p => p.type === type);
    if (operation) filtered = filtered.filter(p => p.operation === operation);
    if (location) filtered = filtered.filter(p => p.location === location);
    if (featured === 'true') filtered = filtered.filter(p => p.featured === true);

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: filtered.length,
      total: properties.length,
      data: filtered,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting properties:', error);
    return res.status(500).json({ error: 'Error al cargar propiedades: ' + error.message });
  }
}

async function createProperty(req, res) {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken) {
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
    const property = {
      id: 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: req.body.title.trim(),
      type: req.body.type,
      operation: req.body.operation,
      location: req.body.location,
      locationName: getLocationName(req.body.location),
      price: parseInt(req.body.price),
      rooms: parseInt(req.body.rooms) || 0,
      bathrooms: parseInt(req.body.bathrooms) || 1,
      size: parseInt(req.body.size),
      terrace: parseInt(req.body.terrace) || 0,
      pool: req.body.pool || 'no',
      description: req.body.description.trim(),
      images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
      featured: req.body.featured === true,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingProperties = await redis.get('properties') || [];
    const updatedProperties = [property, ...existingProperties];
    await redis.set('properties', updatedProperties);

    return res.status(201).json({
      success: true,
      message: 'Propiedad creada exitosamente',
      data: property
    });
  } catch (error) {
    console.error('Error creating property:', error);
    return res.status(500).json({ error: 'Error al crear propiedad: ' + error.message });
  }
}

async function deleteProperty(req, res) {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken) {
    return res.status(401).json({ error: 'Token de administrador requerido' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'ID de propiedad requerido' });
    }

    const properties = await redis.get('properties') || [];
    const updatedProperties = properties.filter(p => p.id !== id);
    await redis.set('properties', updatedProperties);

    return res.status(200).json({
      success: true,
      message: 'Propiedad eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    return res.status(500).json({ error: 'Error al eliminar propiedad: ' + error.message });
  }
}

function getLocationName(locationCode) {
  const locations = {
    'los-cristianos': 'Los Cristianos',
    'playa-americas': 'Playa de las Américas',
    'costa-adeje': 'Costa Adeje',
    'arona': 'Arona',
    'san-miguel': 'San Miguel de Abona'
  };
  return locations[locationCode] || locationCode;
}
