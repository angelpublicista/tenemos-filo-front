"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HiOutlineCog, HiRefresh, HiCalendar } from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';
import { Integration } from '@/types';
import {
  getIntegrationsByUser,
  updateIntegrationStatus,
  deleteIntegrationInSanity,
  updateIntegrationInSanity,
} from '@/lib/sanity/integrationService';
import GoogleIntegrationCard from '@/components/IntegrationCards/GoogleIntegrationCard';
import OutlookIntegrationCard from '@/components/IntegrationCards/OutlookIntegrationCard';
import ZohoIntegrationCard from '@/components/IntegrationCards/ZohoIntegrationCard';
import ICalIntegrationCard from '@/components/IntegrationCards/ICalIntegrationCard';

const ERROR_MESSAGES: Record<string, string> = {
  google_auth_denied: 'Autenticación con Google cancelada',
  google_auth_failed: 'Error al autenticar con Google',
  google_token_failed: 'Error al obtener tokens de Google',
  microsoft_auth_denied: 'Autenticación con Microsoft cancelada',
  microsoft_auth_failed: 'Error al autenticar con Microsoft',
  microsoft_token_failed: 'Error al obtener tokens de Microsoft',
  zoho_auth_denied: 'Autenticación con Zoho cancelada',
  zoho_auth_failed: 'Error al autenticar con Zoho',
  zoho_token_failed: 'Error al obtener tokens de Zoho',
  invalid_state: 'Error de seguridad en la autenticación. Intenta de nuevo.',
  not_configured: 'Esta integración aún no está configurada en el servidor.',
  missing_user: 'No se pudo identificar tu usuario. Recarga la página.',
};

export default function IntegrationsPage() {
  const { sanityUser } = useAuth();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [availability, setAvailability] = useState({ google: false, microsoft: false, zoho: false });

  const loadIntegrations = useCallback(async () => {
    if (!sanityUser?._id) return;
    try {
      setIsLoading(true);
      const data = await getIntegrationsByUser(sanityUser._id);
      setIntegrations(data);
    } catch {
      showError('Error al cargar las integraciones');
    } finally {
      setIsLoading(false);
    }
  }, [sanityUser?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    fetch('/api/integrations/available')
      .then(r => r.json())
      .then(setAvailability)
      .catch(() => {});
  }, []);

  // Leer params de OAuth callback y limpiar URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'google_connected') {
      showSuccess('Google Calendar conectado', 'Tu calendario de Google se sincronizará con tus experiencias.');
      loadIntegrations();
    } else if (success === 'microsoft_connected') {
      showSuccess('Outlook Calendar conectado', 'Tu calendario de Microsoft se sincronizará con tus experiencias.');
      loadIntegrations();
    } else if (success === 'zoho_connected') {
      showSuccess('Zoho Calendar conectado', 'Tu calendario de Zoho se sincronizará con tus experiencias.');
      loadIntegrations();
    } else if (error) {
      showError('Error en la integración', ERROR_MESSAGES[error] || 'Ocurrió un error inesperado.');
    }

    if (success || error) {
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = (type: 'google' | 'microsoft' | 'zoho') => {
    if (!sanityUser?._id) {
      showError('Error', 'No se pudo identificar tu usuario.');
      return;
    }
    window.location.href = `/api/auth/${type}?userId=${sanityUser._id}`;
  };

  const handleDisconnect = async (integration: Integration) => {
    const confirmed = await showConfirmation(
      'Desconectar integración',
      `¿Desconectar ${integration.name}? Podrás volver a conectarlo cuando quieras.`,
      'Sí, desconectar'
    );
    if (!confirmed) return;

    try {
      await updateIntegrationStatus(integration._id, 'disconnected');
      setIntegrations(prev =>
        prev.map(i => i._id === integration._id ? { ...i, status: 'disconnected' as const } : i)
      );
      showSuccess('Integración desconectada');
    } catch {
      showError('Error al desconectar la integración');
    }
  };

  const handleSync = async (integration: Integration) => {
    try {
      setSyncing(integration._id);
      await updateIntegrationInSanity(integration._id, {
        lastSync: new Date().toISOString(),
      });
      setIntegrations(prev =>
        prev.map(i => i._id === integration._id ? { ...i, lastSync: new Date().toISOString() } : i)
      );
      showSuccess('Sincronización completada');
    } catch {
      showError('Error al sincronizar');
    } finally {
      setSyncing(null);
    }
  };

  const googleIntegration = integrations.find(i => i.type === 'google');
  const outlookIntegration = integrations.find(i => i.type === 'outlook');
  const zohoIntegration = integrations.find(i => i.type === 'zoho');

  if (isLoading) {
    return <Loader message="Cargando integraciones..." />;
  }

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HiOutlineCog className="w-8 h-8 text-[#334C5D] dark:text-gray-100" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Integraciones de Calendario
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Mantén tu agenda sincronizada con las herramientas que ya usas
              </p>
            </div>
          </div>
        </div>

        {/* Sección 1: Suscripción iCal */}
        <section className="mb-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-1.5 bg-purple-100 rounded-lg mt-0.5">
              <HiCalendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Solo quiero ver mis reservas en mi calendario
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                La opción más simple. Suscríbete con una URL y tus reservas aparecerán automáticamente
                en Google Calendar, Apple Calendar, Outlook o cualquier otra app. No requiere configuración extra.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ICalIntegrationCard companyId={sanityUser?.companyId || undefined} />
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 mb-10" />

        {/* Sección 2: Sincronización avanzada */}
        <section>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-1.5 bg-orange-100 rounded-lg mt-0.5">
              <HiRefresh className="w-5 h-5 text-[#F26726]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Quiero sincronización bidireccional y control total
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conecta tu cuenta de Google, Outlook o Zoho para que las reservas se creen
                automáticamente como eventos en tu calendario, bloqueen tu disponibilidad
                y envíen invitaciones a tus clientes. Requiere autorizar el acceso a tu cuenta.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <GoogleIntegrationCard
              integration={
                googleIntegration
                  ? {
                      _id: googleIntegration._id,
                      status: googleIntegration.status,
                      lastSync: googleIntegration.lastSync,
                      config: googleIntegration.config as {
                        calendarId?: string;
                        autoSync?: boolean;
                        syncFrequency?: string;
                      },
                    }
                  : undefined
              }
              onConnect={() => handleConnect('google')}
              onDisconnect={() => googleIntegration && handleDisconnect(googleIntegration)}
              onSync={() => googleIntegration && !syncing && handleSync(googleIntegration)}
              available={availability.google}
            />

            <OutlookIntegrationCard
              integration={
                outlookIntegration
                  ? {
                      _id: outlookIntegration._id,
                      status: outlookIntegration.status,
                      lastSync: outlookIntegration.lastSync,
                      config: outlookIntegration.config as {
                        calendarId?: string;
                        autoSync?: boolean;
                        syncFrequency?: string;
                        tenantId?: string;
                      },
                    }
                  : undefined
              }
              onConnect={() => handleConnect('microsoft')}
              onDisconnect={() => outlookIntegration && handleDisconnect(outlookIntegration)}
              onSync={() => outlookIntegration && !syncing && handleSync(outlookIntegration)}
              available={availability.microsoft}
            />

            <ZohoIntegrationCard
              integration={
                zohoIntegration
                  ? {
                      _id: zohoIntegration._id,
                      status: zohoIntegration.status,
                      lastSync: zohoIntegration.lastSync,
                      config: zohoIntegration.config as {
                        calendarId?: string;
                        autoSync?: boolean;
                        syncFrequency?: string;
                        organizationId?: string;
                      },
                    }
                  : undefined
              }
              onConnect={() => handleConnect('zoho')}
              onDisconnect={() => zohoIntegration && handleDisconnect(zohoIntegration)}
              onSync={() => zohoIntegration && !syncing && handleSync(zohoIntegration)}
              available={availability.zoho}
            />
          </div>
        </section>

        {/* Integraciones activas */}
        {integrations.filter(i => i.status === 'connected').length > 0 && (
          <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ Tienes <strong>{integrations.filter(i => i.status === 'connected').length}</strong> integración(es) activa(s).
              Tus reservas se sincronizan automáticamente con tus calendarios conectados.
            </p>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
