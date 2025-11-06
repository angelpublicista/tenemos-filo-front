import { sanityClient } from './sanityClient';
import { Integration, CreateIntegrationData, UpdateIntegrationData } from '@/types';

export interface IntegrationFilters {
  userId?: string;
  type?: 'google' | 'outlook';
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

/**
 * Obtiene todas las integraciones para un usuario
 */
export async function getIntegrationsByUser(userId: string, filters?: IntegrationFilters): Promise<Integration[]> {
  const filterConditions = /* groq */ `
    userId == $userId &&
    ${filters?.type ? 'type == $type &&' : ''}
    ${filters?.status ? 'status == $status &&' : ''}
    deletedAt == null
  `;

  const query = /* groq */ `
    *[_type == "integration" && ${filterConditions}] | order(createdAt desc) {
      _id,
      _createdAt as createdAt,
      userId,
      type,
      name,
      status,
      lastSync,
      config,
      error,
      deletedAt
    }
  `;

  const params: Record<string, unknown> = { userId };
  if (filters?.type) params.type = filters.type;
  if (filters?.status) params.status = filters.status;

  try {
    return await sanityClient.fetch(query, params);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    throw new Error('Error al obtener integraciones');
  }
}

/**
 * Obtiene una integración por ID
 */
export async function getIntegrationById(integrationId: string): Promise<Integration | null> {
  const query = /* groq */ `
    *[_type == "integration" && _id == $integrationId && deletedAt == null][0] {
      _id,
      _createdAt as createdAt,
      userId,
      type,
      name,
      status,
      lastSync,
      config,
      error,
      deletedAt
    }
  `;

  try {
    return await sanityClient.fetch(query, { integrationId });
  } catch (error) {
    console.error('Error fetching integration:', error);
    throw new Error('Error al obtener la integración');
  }
}

/**
 * Crea una nueva integración
 */
export async function createIntegrationInSanity(integrationData: CreateIntegrationData): Promise<Integration> {
  const doc = {
    _type: 'integration',
    userId: integrationData.userId,
    type: integrationData.type,
    name: integrationData.name,
    status: integrationData.status || 'pending',
    config: integrationData.config || {},
    createdAt: new Date().toISOString(),
  };

  try {
    const result = await sanityClient.create(doc);
    return {
      ...result,
      _id: result._id,
      createdAt: result._createdAt || result.createdAt,
    };
  } catch (error) {
    console.error('Error creating integration:', error);
    throw new Error('Error al crear la integración');
  }
}

/**
 * Actualiza una integración existente
 */
export async function updateIntegrationInSanity(
  integrationId: string, 
  updateData: Record<string, unknown>
): Promise<Integration> {
  const updatePayload: Record<string, unknown> = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await sanityClient
      .patch(integrationId)
      .set(updatePayload)
      .commit({ returnDocuments: true });

    return {
      ...result.documents[0],
      _id: result.documents[0]._id,
      createdAt: result.documents[0]._createdAt || result.documents[0].createdAt,
    };
  } catch (error) {
    console.error('Error updating integration:', error);
    throw new Error('Error al actualizar la integración');
  }
}

/**
 * Actualiza el estado de una integración
 */
export async function updateIntegrationStatus(
  integrationId: string, 
  status: 'connected' | 'disconnected' | 'pending' | 'error',
  config?: Record<string, unknown>,
  error?: string
): Promise<Integration> {
  const updateData: Record<string, unknown> = {
    status,
  };

  if (config) {
    updateData.config = config;
  }

  if (status === 'connected') {
    updateData.lastSync = new Date().toISOString();
    updateData.error = null;
  } else if (status === 'error' && error) {
    updateData.error = error;
  }

  return updateIntegrationInSanity(integrationId, updateData);
}

/**
 * Elimina una integración (soft delete)
 */
export async function deleteIntegrationInSanity(integrationId: string): Promise<void> {
  try {
    await sanityClient
      .patch(integrationId)
      .set({ 
        deletedAt: new Date().toISOString(),
        status: 'disconnected'
      })
      .commit();
  } catch (error) {
    console.error('Error deleting integration:', error);
    throw new Error('Error al eliminar la integración');
  }
}

/**
 * Obtiene estadísticas de integraciones para un usuario
 */
export async function getIntegrationStatsByUser(userId: string): Promise<IntegrationStats> {
  const query = /* groq */ `
    *[_type == "integration" && userId == $userId && deletedAt == null] {
      status,
      lastSync,
      createdAt
    }
  `;

  try {
    const integrations = await sanityClient.fetch(query, { userId });
    
    const stats: IntegrationStats = {
      total: integrations.length,
      connected: 0,
      disconnected: 0,
      pending: 0,
      error: 0,
    };

    let latestSync: Date | null = null;

    integrations.forEach((integration: Record<string, unknown>) => {
      const status = integration.status as string;
      
      switch (status) {
        case 'connected':
          stats.connected++;
          if (integration.lastSync) {
            const syncDate = new Date(integration.lastSync as string);
            if (!latestSync || syncDate > latestSync) {
              latestSync = syncDate;
            }
          }
          break;
        case 'disconnected':
          stats.disconnected++;
          break;
        case 'pending':
          stats.pending++;
          break;
        case 'error':
          stats.error++;
          break;
      }
    });

    if (latestSync) {
      stats.lastSync = (latestSync as Date).toISOString();
    }

    return stats;
  } catch (error) {
    console.error('Error fetching integration stats:', error);
    throw new Error('Error al obtener estadísticas de integraciones');
  }
}

/**
 * Verifica si una integración está sincronizada recientemente
 */
export async function isIntegrationRecentlySynced(
  integrationId: string, 
  minutesThreshold: number = 15
): Promise<boolean> {
  try {
    const integration = await getIntegrationById(integrationId);
    if (!integration || !integration.lastSync || integration.status !== 'connected') {
      return false;
    }

    const lastSync = new Date(integration.lastSync);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    
    return diffMinutes <= minutesThreshold;
  } catch (error) {
    console.error('Error checking sync status:', error);
    return false;
  }
}

/**
 * Obtiene integraciones conectadas de un tipo específico
 */
export async function getConnectedIntegrationsByType(
  userId: string, 
  type: 'google' | 'outlook'
): Promise<Integration[]> {
  return getIntegrationsByUser(userId, { type, status: 'connected' });
}

