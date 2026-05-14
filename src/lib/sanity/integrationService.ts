// Reescrito sobre el API. Mismas firmas para no romper callers.
// Nota: el parametro userId pasado al servicio se ignora en el API (el JWT
// resuelve el user); lo conservamos en la firma por compat.
import { api } from '@/lib/api/client';
import { Integration, CreateIntegrationData } from '@/types';

export interface IntegrationFilters {
  userId?: string;
  type?: 'google' | 'outlook' | 'zoho';
  status?: 'connected' | 'disconnected' | 'pending' | 'error';
}

export interface IntegrationStats {
  total: number;
  connected: number;
  disconnected: number;
  pending: number;
  error: number;
  lastSync?: string;
}

type ApiType = 'GOOGLE' | 'OUTLOOK' | 'ZOHO';
type ApiStatus = 'CONNECTED' | 'DISCONNECTED' | 'PENDING' | 'ERROR';

const TYPE_TO_API: Record<NonNullable<IntegrationFilters['type']>, ApiType> = {
  google: 'GOOGLE',
  outlook: 'OUTLOOK',
  zoho: 'ZOHO',
};
const TYPE_FROM_API: Record<ApiType, Integration['type']> = {
  GOOGLE: 'google',
  OUTLOOK: 'outlook',
  ZOHO: 'zoho',
};
const STATUS_TO_API: Record<NonNullable<IntegrationFilters['status']>, ApiStatus> = {
  connected: 'CONNECTED',
  disconnected: 'DISCONNECTED',
  pending: 'PENDING',
  error: 'ERROR',
};
const STATUS_FROM_API: Record<ApiStatus, Integration['status']> = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  PENDING: 'pending',
  ERROR: 'error',
};

interface ApiIntegration {
  id: string;
  userId: string;
  type: ApiType;
  name: string | null;
  status: ApiStatus;
  config: Integration['config'] | null;
  error: string | null;
  lastSync: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function toIntegration(i: ApiIntegration): Integration {
  return {
    _id: i.id,
    userId: i.userId,
    type: TYPE_FROM_API[i.type],
    name: i.name ?? '',
    status: STATUS_FROM_API[i.status],
    lastSync: i.lastSync ?? undefined,
    config: i.config ?? undefined,
    error: i.error ?? undefined,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    deletedAt: i.deletedAt ?? undefined,
  };
}

export async function getIntegrationsByUser(
  _userId: string,
  filters?: IntegrationFilters,
): Promise<Integration[]> {
  void _userId;
  const items = await api.get<ApiIntegration[]>('/integrations', {
    type: filters?.type ? TYPE_TO_API[filters.type] : undefined,
    status: filters?.status ? STATUS_TO_API[filters.status] : undefined,
  });
  return items.map(toIntegration);
}

export async function getIntegrationById(integrationId: string): Promise<Integration | null> {
  try {
    const i = await api.get<ApiIntegration>(`/integrations/${encodeURIComponent(integrationId)}`);
    return toIntegration(i);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
}

export async function createIntegrationInSanity(
  integrationData: CreateIntegrationData,
): Promise<Integration> {
  const created = await api.post<ApiIntegration>('/integrations', {
    type: TYPE_TO_API[integrationData.type],
    name: integrationData.name,
    status: integrationData.status ? STATUS_TO_API[integrationData.status] : undefined,
    config: integrationData.config,
  });
  return toIntegration(created);
}

export async function updateIntegrationInSanity(
  integrationId: string,
  updateData: Record<string, unknown>,
): Promise<Integration> {
  // updateData puede traer status como lowercase del front; lo mapeamos
  const body: Record<string, unknown> = { ...updateData };
  if (typeof body.status === 'string') {
    body.status =
      STATUS_TO_API[body.status as keyof typeof STATUS_TO_API] ?? body.status;
  }
  const updated = await api.patch<ApiIntegration>(
    `/integrations/${encodeURIComponent(integrationId)}`,
    body,
  );
  return toIntegration(updated);
}

export async function updateIntegrationStatus(
  integrationId: string,
  status: 'connected' | 'disconnected' | 'pending' | 'error',
  config?: Record<string, unknown>,
  error?: string,
): Promise<Integration> {
  const updated = await api.patch<ApiIntegration>(
    `/integrations/${encodeURIComponent(integrationId)}/status`,
    {
      status: STATUS_TO_API[status],
      config,
      error,
    },
  );
  return toIntegration(updated);
}

export async function deleteIntegrationInSanity(integrationId: string): Promise<void> {
  await api.delete(`/integrations/${encodeURIComponent(integrationId)}`);
}

export async function getIntegrationStatsByUser(_userId: string): Promise<IntegrationStats> {
  void _userId;
  return api.get<IntegrationStats>('/integrations/stats');
}

export async function isIntegrationRecentlySynced(
  integrationId: string,
  minutesThreshold: number = 15,
): Promise<boolean> {
  try {
    const integration = await getIntegrationById(integrationId);
    if (!integration || !integration.lastSync || integration.status !== 'connected') {
      return false;
    }
    const lastSync = new Date(integration.lastSync);
    const diffMinutes = (Date.now() - lastSync.getTime()) / (1000 * 60);
    return diffMinutes <= minutesThreshold;
  } catch {
    return false;
  }
}

export async function getConnectedIntegrationsByType(
  userId: string,
  type: 'google' | 'outlook' | 'zoho',
): Promise<Integration[]> {
  return getIntegrationsByUser(userId, { type, status: 'connected' });
}
