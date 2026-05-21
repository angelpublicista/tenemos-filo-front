// Servicios contra el endpoint /api-keys del backend.
// El backend requiere JWT humano + rol RESELLER/ADMIN; el front respeta esa
// restriccion mostrando el modulo solo a esos roles.
//
// Importante: el token plano se devuelve UNICAMENTE en POST /api-keys.
// No hay forma de recuperarlo despues; el listado solo expone el prefix.

import { api } from '@/lib/api/client';

export const API_SCOPES = [
  'experiences:read',
  'experiences:write',
  'reservations:read',
  'reservations:write',
  'quotes:read',
  'quotes:write',
  'contacts:read',
  'contacts:write',
  'crm-companies:read',
  'crm-companies:write',
  'opportunities:read',
  'opportunities:write',
  'availabilities:read',
  'availabilities:write',
  'locations:read',
  'locations:write',
  'companies:read',
  'companies:write',
  'dashboard:read',
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  companyId: string;
  createdById: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedApiKey extends ApiKey {
  // Solo presente en la respuesta de POST /api-keys.
  token: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiScope[];
  expiresAt?: string; // ISO datetime
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: ApiScope[];
  expiresAt?: string | null;
}

// ─── Estado derivado para UI ─────────────────────────────────────────────────

export type ApiKeyStatus = 'active' | 'expired' | 'revoked';

export function getApiKeyStatus(k: ApiKey, now: Date = new Date()): ApiKeyStatus {
  if (k.revokedAt) return 'revoked';
  if (k.expiresAt && new Date(k.expiresAt).getTime() < now.getTime()) return 'expired';
  return 'active';
}

// ─── Servicios ───────────────────────────────────────────────────────────────

export const listApiKeys = async (): Promise<ApiKey[]> => {
  return api.get<ApiKey[]>('/api-keys');
};

export const getApiKey = async (id: string): Promise<ApiKey> => {
  return api.get<ApiKey>(`/api-keys/${encodeURIComponent(id)}`);
};

export const createApiKey = async (input: CreateApiKeyInput): Promise<CreatedApiKey> => {
  return api.post<CreatedApiKey>('/api-keys', input);
};

export const updateApiKey = async (
  id: string,
  input: UpdateApiKeyInput,
): Promise<ApiKey> => {
  return api.patch<ApiKey>(`/api-keys/${encodeURIComponent(id)}`, input);
};

export const revokeApiKey = async (id: string): Promise<void> => {
  await api.delete<void>(`/api-keys/${encodeURIComponent(id)}`);
};

// ─── Metadata para la UI: agrupacion + etiquetas de scopes ───────────────────

export const SCOPE_LABELS: Record<ApiScope, string> = {
  'experiences:read': 'Experiencias (lectura)',
  'experiences:write': 'Experiencias (escritura)',
  'reservations:read': 'Reservas (lectura)',
  'reservations:write': 'Reservas (escritura)',
  'quotes:read': 'Cotizaciones (lectura)',
  'quotes:write': 'Cotizaciones (escritura)',
  'contacts:read': 'Contactos (lectura)',
  'contacts:write': 'Contactos (escritura)',
  'crm-companies:read': 'Empresas CRM (lectura)',
  'crm-companies:write': 'Empresas CRM (escritura)',
  'opportunities:read': 'Oportunidades (lectura)',
  'opportunities:write': 'Oportunidades (escritura)',
  'availabilities:read': 'Disponibilidad (lectura)',
  'availabilities:write': 'Disponibilidad (escritura)',
  'locations:read': 'Sedes (lectura)',
  'locations:write': 'Sedes (escritura)',
  'companies:read': 'Empresa (lectura)',
  'companies:write': 'Empresa (escritura)',
  'dashboard:read': 'Dashboard (lectura)',
};

export const SCOPE_GROUPS: Array<{ label: string; scopes: ApiScope[] }> = [
  { label: 'Experiencias', scopes: ['experiences:read', 'experiences:write'] },
  { label: 'Reservas', scopes: ['reservations:read', 'reservations:write'] },
  { label: 'Cotizaciones', scopes: ['quotes:read', 'quotes:write'] },
  { label: 'Contactos', scopes: ['contacts:read', 'contacts:write'] },
  { label: 'Empresas CRM', scopes: ['crm-companies:read', 'crm-companies:write'] },
  { label: 'Oportunidades', scopes: ['opportunities:read', 'opportunities:write'] },
  { label: 'Disponibilidad', scopes: ['availabilities:read', 'availabilities:write'] },
  { label: 'Sedes', scopes: ['locations:read', 'locations:write'] },
  { label: 'Empresa', scopes: ['companies:read', 'companies:write'] },
  { label: 'Dashboard', scopes: ['dashboard:read'] },
];
