"use client";

import React, { useState, useEffect } from 'react';
import { Button, Card, Badge, Alert } from 'flowbite-react';
import { 
  HiOutlineCalendar,
  HiOutlineCog,
  HiOutlineLightBulb,
  HiCheckCircle,
  HiExclamationCircle,
  HiPlus,
  HiTrash,
  HiOfficeBuilding
} from 'react-icons/hi';
import { SiGooglecalendar } from 'react-icons/si';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';

interface Integration {
  _id: string;
  type: 'google' | 'outlook';
  name: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  lastSync?: string;
  config?: Record<string, unknown>;
  createdAt: string;
}

export default function IntegrationsPage() {
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Datos mockados para desarrollo
  const mockIntegrations: Integration[] = [
    {
      _id: '1',
      type: 'google',
      name: 'Google Calendar',
      status: 'connected',
      lastSync: '2025-01-02T14:30:00Z',
      createdAt: '2024-12-15T10:00:00Z'
    },
    {
      _id: '2',
      type: 'outlook',
      name: 'Outlook Calendar',
      status: 'disconnected',
      createdAt: '2024-12-10T09:00:00Z'
    }
  ];

  useEffect(() => {
    loadIntegrations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      // Simular carga de datos real
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIntegrations(mockIntegrations);
    } catch {
      showError('Error al cargar las integraciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (type: 'google' | 'outlook') => {
    try {
      const confirmed = await showConfirmation(
        'Confirmar integración',
        `¿Estás seguro de que quieres conectar tu cuenta ${getIntegrationName(type)}?`,
      );

      if (confirmed) {
        await connectIntegration(type);
      }
    } catch {
      showError('Error al conectar la integración');
    }
  };

  const handleDisconnect = async (integrationId: string, integrationName: string) => {
    try {
      const confirmed = await showConfirmation(
        'Desconectar integración',
        `¿Estás seguro de que quieres desconectar ${integrationName}? Esto puede afectar la sincronización de tu calendario.`
      );

      if (confirmed) {
        await disconnectIntegration(integrationId);
      }
    } catch {
      showError('Error al desconectar la integración');
    }
  };

  const handleDelete = async (integrationId: string, integrationName: string) => {
    try {
      const confirmed = await showConfirmation(
        'Eliminar integración',
        `¿Estás seguro de que quieres eliminar completamente ${integrationName}? Esta acción no se puede deshacer.`
      );

      if (confirmed) {
        await deleteIntegration(integrationId);
      }
    } catch {
      showError('Error al eliminar la integración');
    }
  };

  const connectIntegration = async (type: 'google' | 'outlook') => {
    // Simular conexión
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newIntegration: Integration = {
      _id: Date.now().toString(),
      type,
      name: getIntegrationName(type),
      status: 'connected',
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setIntegrations(prev => [...prev, newIntegration]);
    showSuccess(`${getIntegrationName(type)} conectado exitosamente`);
  };

  const disconnectIntegration = async (integrationId: string) => {
    // Simular desconexión
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIntegrations(prev => 
      prev.map(integration => 
        integration._id === integrationId 
          ? { ...integration, status: 'disconnected' as const }
          : integration
      )
    );
    
    showSuccess('Integración desconectada exitosamente');
  };

  const deleteIntegration = async (integrationId: string) => {
    // Simular eliminación
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIntegrations(prev => prev.filter(integration => integration._id !== integrationId));
    showSuccess('Integración eliminada exitosamente');
  };

  const getIntegrationName = (type: 'google' | 'outlook') => {
    switch (type) {
      case 'google': return 'Google Calendar';
      case 'outlook': return 'Outlook Calendar';
    }
  };

  const getIntegrationIcon = (type: 'google' | 'outlook') => {
    switch (type) {
      case 'google': return <SiGooglecalendar className="w-6 h-6 text-blue-500" />;
      case 'outlook': return <HiOfficeBuilding className="w-6 h-6 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected': return <Badge color="success" icon={HiCheckCircle}>Conectado</Badge>;
      case 'disconnected': return <Badge color="gray">Desconectado</Badge>;
      case 'pending': return <Badge color="warning">Pendiente</Badge>;
      case 'error': return <Badge color="failure" icon={HiExclamationCircle}>Error</Badge>;
    }
  };

  const getAvailableIntegrations = () => {
    const connectedTypes = integrations.map(i => i.type);
    return [
      {
        type: 'google' as const,
        name: 'Google Calendar',
        description: 'Sincroniza tu calendario de Google con tus experiencias',
        icon: <SiGooglecalendar className="w-8 h-8 text-red-500" />,
        disabled: connectedTypes.includes('google')
      },
      {
        type: 'outlook' as const,
        name: 'Outlook Calendar',
        description: 'Integra tu calendario de Outlook/Microsoft 365',
        icon: <HiOfficeBuilding className="w-8 h-8 text-blue-600" />,
        disabled: connectedTypes.includes('outlook')
      }
    ];
  };

  if (isLoading) {
    return <Loader message="Cargando integraciones..." />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <HiOutlineCog className="w-8 h-8 text-[#334C5D]" />
          <div>
            <h1 className="text-3xl font-bold text-[#334C5D]">
              Integraciones de Calendario
            </h1>
            <p className="text-gray-600">
              Conecta tus calendarios externos para sincronizar automáticamente tus experiencias
            </p>
          </div>
        </div>

        {/* Info */}
        <Alert color="info" icon={HiOutlineLightBulb} className="mb-6">
          <span className="font-medium">Información:</span> Las integraciones te permiten sincronizar automáticamente 
          tus reservas con tus calendarios externos, evitando conflictos de horarios.
        </Alert>
      </div>


      {/* Integrations List */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#334C5D] mb-6">
          Integraciones Conectadas ({integrations.filter(i => i.status !== 'disconnected').length})
        </h2>
        
        {integrations.filter(i => i.status !== 'disconnected').length === 0 ? (
          <Card className="text-center py-8">
            <HiOutlineCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay integraciones conectadas
            </h3>
            <p className="text-gray-600 mb-4">
              Conecta tus calendarios para sincronizar automáticamente tus experiencias
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {integrations.filter(i => i.status !== 'disconnected').map((integration) => (
              <Card key={integration._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getIntegrationIcon(integration.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-[#334C5D]">
                        {integration.name}
                      </h3>
                      {integration.lastSync && (
                        <p className="text-sm text-gray-600">
                          Última sincronización: {new Date(integration.lastSync).toLocaleString('es-CO')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(integration.status)}
                    
                    <div className="flex gap-2">
                      {integration.status === 'connected' && (
                        <Button
                          size="sm"
                          color="gray"
                          onClick={() => handleDisconnect(integration._id, integration.name)}
                        >
                          <HiOutlineCog className="w-4 h-4 mr-1" />
                          Desconectar
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        color="failure"
                        onClick={() => handleDelete(integration._id, integration.name)}
                      >
                        <HiTrash className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Integrations */}
      <div>
        <h2 className="text-xl font-semibold text-[#334C5D] mb-6">
          Integraciones Disponibles
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {getAvailableIntegrations().map((integration) => (
            <Card key={integration.type} className="p-6 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="mx-auto mb-4 text-gray-600 flex items-center justify-center">
                  {integration.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#334C5D] mb-2">
                  {integration.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>
                
                <Button
                  color="primary"
                  className="w-full"
                  disabled={integration.disabled}
                  onClick={() => handleConnect(integration.type)}
                >
                  {integration.disabled ? (
                    <>
                      <HiCheckCircle className="w-4 h-4 mr-2" />
                      Ya Conectado
                    </>
                  ) : (
                    <>
                      <HiPlus className="w-4 h-4 mr-2" />
                      Conectar
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <Card className="mt-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[#334C5D] mb-4">
            📚 ¿Necesitas ayuda con las integraciones?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Beneficios:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Sincronización automática de reservas</li>
                <li>Evita conflictos de horarios</li>
                <li>Notificaciones push en tiempo real</li>
                <li>Gestión centralizada de calendarios</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Requisitos:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Cuenta activa en la plataforma</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
