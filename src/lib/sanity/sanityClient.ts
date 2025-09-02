import { createClient } from '@sanity/client';

// Verificar que las variables de entorno estén configuradas
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.NEXT_PUBLIC_SANITY_TOKEN;

if (!projectId) {
  console.error('Error: NEXT_PUBLIC_SANITY_PROJECT_ID no está configurado');
}

if (!token) {
  console.error('Error: NEXT_PUBLIC_SANITY_TOKEN no está configurado');
}

export const sanityClient = createClient({
  projectId: projectId || '',
  dataset: dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: token, // Token para escritura
  withCredentials: true, // Incluir credenciales en las peticiones
}); 