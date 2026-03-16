"use client";

import React, { useState } from 'react';
import { Card, Button, Badge, Tooltip } from 'flowbite-react';
import { HiOutlineCloud, HiCheckCircle, HiRefresh, HiOutlineQuestionMarkCircle, HiLockClosed } from 'react-icons/hi';
import { SiGooglecalendar } from 'react-icons/si';
import IntegrationSetupModal from './IntegrationSetupModal';

interface GoogleIntegrationCardProps {
  integration?: {
    _id: string;
    status: 'connected' | 'disconnected' | 'pending' | 'error';
    lastSync?: string;
    config?: {
      calendarId?: string;
      autoSync?: boolean;
      syncFrequency?: string;
    };
  };
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  available?: boolean;
}

const SETUP_STEPS = [
  { label: 'Crea un proyecto en Google Cloud Console' },
  { label: 'Activa la', code: 'Google Calendar API' },
  { label: 'Ve a Credenciales → Crear credenciales → ID de cliente OAuth 2.0' },
  { label: 'Selecciona tipo "Aplicación web" y agrega el Redirect URI que aparece abajo' },
  { label: 'Comparte el Client ID y Client Secret con el administrador de la plataforma' },
];

export default function GoogleIntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onSync,
  available = true,
}: GoogleIntegrationCardProps) {
  const [showSetup, setShowSetup] = useState(false);
  const isConnected = integration?.status === 'connected';

  const getStatusBadge = () => {
    if (!available) return <Badge color="indigo">No disponible</Badge>;
    if (!integration) return <Badge color="gray">No conectado</Badge>;
    switch (integration.status) {
      case 'connected': return <Badge color="success" icon={HiCheckCircle}>Conectado</Badge>;
      case 'disconnected': return <Badge color="gray">Desconectado</Badge>;
      case 'pending': return <Badge color="warning">Pendiente</Badge>;
      case 'error': return <Badge color="failure">Error</Badge>;
      default: return <Badge color="gray">Desconectado</Badge>;
    }
  };

  return (
    <>
      <Card className="p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HiOutlineCloud className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#334C5D]">Google Calendar</h3>
              <p className="text-sm text-gray-600">Sincroniza con tu calendario de Google</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {isConnected && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Estado de sincronización</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Última sincronización:</span>
                <span className="font-medium">
                  {integration.lastSync
                    ? new Date(integration.lastSync).toLocaleString('es-CO')
                    : 'Nunca'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sincronización automática:</span>
                <span className="font-medium">
                  {integration.config?.autoSync ? 'Activada' : 'Desactivada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frecuencia:</span>
                <span className="font-medium">
                  {integration.config?.syncFrequency || '15 minutos'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 flex-1">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium text-gray-900 mb-2">Características:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Sincronización bidireccional de eventos</li>
              <li>Prevención de conflictos de horarios</li>
              <li>Notificaciones automáticas</li>
              <li>Acceso a múltiples calendarios</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            {!available ? (
              <Tooltip content="Configura las credenciales en el servidor para habilitar esta integración">
                <Button size="sm" color="gray" disabled className="w-full cursor-not-allowed">
                  <HiLockClosed className="w-4 h-4 mr-2" />
                  No disponible
                </Button>
              </Tooltip>
            ) : isConnected ? (
              <>
                <Button size="sm" color="primary" onClick={onSync} className="flex-1">
                  <HiRefresh className="w-4 h-4 mr-2" />
                  Sincronizar Ahora
                </Button>
                <Button size="sm" color="gray" onClick={onDisconnect}>
                  Desconectar
                </Button>
              </>
            ) : (
              <Button size="sm" color="primary" onClick={onConnect} className="w-full">
                Conectar con Google Calendar
              </Button>
            )}
          </div>
        </div>

        {integration?.status === 'error' && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              ❌ Error en la integración. Desconéctala y vuelve a conectarla.
            </p>
          </div>
        )}

        <button
          onClick={() => setShowSetup(true)}
          className="mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-[#F26726] transition-colors self-start"
        >
          <HiOutlineQuestionMarkCircle className="w-3.5 h-3.5" />
          ¿Cómo configurarlo?
        </button>
      </Card>

      <IntegrationSetupModal
        show={showSetup}
        onClose={() => setShowSetup(false)}
        title="Google Calendar"
        icon={<SiGooglecalendar className="w-5 h-5 text-red-500" />}
        docsUrl="https://console.cloud.google.com"
        steps={SETUP_STEPS}
        redirectUri="/api/auth/google/callback"
      />
    </>
  );
}
