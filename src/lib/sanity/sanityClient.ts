import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01', // Usar la fecha actual
  useCdn: false, // `false` si quieres asegurar datos frescos
  token: process.env.NEXT_PUBLIC_SANITY_TOKEN, // Token para escritura
}); 