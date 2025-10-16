"use client";

import React from 'react';
import { Card, Button, Badge } from 'flowbite-react';
import { HiOutlineCalendar, HiCheckCircle, HiRefresh, HiOutlineExternalLink } from 'react-icons/hi';

interface CalendlyIntegrationCardProps {
  integration?: {
    _id: string;
    status: 'connected' | 'disconnected' | 'pending' | 'error';
    lastSync?: string;
    config?: {
      calendlyUsername?: string;
      autoSync?: boolean;
      syncFrequency?: string;
      webhookSecret?: string;
      availableSlots?: Array<{
        date: string;
        slots: string[];
      }>;
    };
  };
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

export default function CalendlyIntegrationCard({ 
  integration, 
  onConnect, 
  onDisconnect, 
  onSync 
}: CalendlyIntegrationCardProps) {
  const isConnected = integration?.status === 'connected';

  const getStatusBadge = () => {
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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <HiOutlineCalendar className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#334C5D]">
              Calendly
            </h3>
            <p className="text-sm text-gray-600">
              Gestiona citas automáticamente con Calendly
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {isConnected && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-800 mb-2">Estado de la integración</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Usuario Calendly:</span>
              <span className="font-medium">
                @{integration.config?.calendlyUsername || 'usuario'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Última sincronización:</span>
              <span className="font-medium">
                {integration.lastSync 
                  ? new Date(integration.lastSync).toLocaleString('es-CO')
                  : 'Nunca'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Webhooks activos:</span>
              <span className="font-medium">
                {integration.config?.webhookSecret ? 'Conectados' : 'No configurados'}
              </span>
            </div>
          </div>
          
          {integration.config?.calendlyUsername && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <a 
                href={`https://calendly.com/${integration.config.calendlyUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
              >
                <HiOutlineExternalLink className="w-4 h-4 mr-1" />
                Ver página de Calendly
              </a>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          <h4 className="font-medium text-gray-900 mb-2">Características:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Reserva automática en tu calendario</li>
            <li>Confirmación instantánea a clientes</li>
            <li>Recordatorios automáticos</li>
            <li>Sincronización de horarios disponibles</li>
            <li>Formularios personalizados</li>
          </ul>
        </div>

        <div className="flex gap-2 pt-4">
          {isConnected ? (
            <>
              <Button
                size="sm"
                color="primary"
                onClick={onSync}
                className="flex-1"
              >
                <HiRefresh className="w-4 h-4 mr-2" />
                Sincronizar Horarios
              </Button>
              <Button
                size="sm"
                color="gray"
                onClick={onDisconnect}
              >
                Desconectar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              color="primary"
              onClick={onConnect}
              className="w-full"
            >
              Conectar con Calendly
            </Button>
          )}
        </div>
      </div>

      {integration?.status === 'error' && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            ❌ Error en la integración. Verifica tu API key de Calendly y vuelve a intentar.
          </p>
        </div>
      )}

      {/* Info adicional para Calendly */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 <strong>Tip:</strong> Calendly te permite crear tipos de eventos para diferentes experiencias.
          Cada experiencia puede tener su propia página de reserva personalizada.
        </p>
      </div>
    </Card>
  );
}
