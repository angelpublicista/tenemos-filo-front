"use client";

import React, { useState } from 'react';
import { Card, Badge, Tooltip } from 'flowbite-react';
import { HiCalendar, HiClipboardCopy, HiCheck, HiOutlineQuestionMarkCircle } from 'react-icons/hi';
import { SiGooglecalendar, SiApple } from 'react-icons/si';
import { HiOutlineDesktopComputer } from 'react-icons/hi';
import IntegrationSetupModal from './IntegrationSetupModal';

interface ICalIntegrationCardProps {
  companyId?: string;
}

const SETUP_STEPS = [
  { label: 'Haz clic en uno de los botones de abajo para abrir directamente en tu app preferida' },
  { label: 'O copia la URL y pégala manualmente en tu aplicación de calendario' },
  { label: 'En Google Calendar: Otros calendarios → + → Desde URL' },
  { label: 'En Apple Calendar: Archivo → Nueva suscripción de calendario' },
  { label: 'En Outlook: Agregar calendario → Suscribirse desde web' },
];

const CALENDAR_APPS = [
  {
    key: 'google',
    label: 'Google Calendar',
    icon: SiGooglecalendar,
    iconColor: 'text-blue-500',
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    getUrl: (feedUrl: string) =>
      `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`,
  },
  {
    key: 'apple',
    label: 'Apple Calendar',
    icon: SiApple,
    iconColor: 'text-gray-700',
    bg: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    getUrl: (feedUrl: string) => feedUrl.replace(/^https?/, 'webcal'),
  },
  {
    key: 'outlook',
    label: 'Outlook',
    icon: HiOutlineDesktopComputer,
    iconColor: 'text-blue-700',
    bg: 'bg-sky-50 hover:bg-sky-100 border-sky-200',
    getUrl: (feedUrl: string) =>
      `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(feedUrl)}`,
  },
];

export default function ICalIntegrationCard({ companyId }: ICalIntegrationCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const feedUrl = companyId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ical?companyId=${companyId}`
    : null;

  const handleCopy = () => {
    if (!feedUrl) return;
    navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <HiCalendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#334C5D]">Suscripción iCal</h3>
              <p className="text-sm text-gray-600">Cualquier aplicación de calendario</p>
            </div>
          </div>
          <Badge color="purple">Universal</Badge>
        </div>

        {!companyId && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              Completa la configuración de tu empresa para obtener tu URL de calendario.
            </p>
          </div>
        )}

        <div className="space-y-4 flex-1">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium text-gray-900 mb-2">Características:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Compatible con Google, Apple, Outlook y Thunderbird</li>
              <li>Sin necesidad de autenticación ni permisos</li>
              <li>Actualización automática de reservas</li>
              <li>Solo lectura — tus datos siempre seguros</li>
            </ul>
          </div>

          {feedUrl && (
            <>
              {/* Botones de integración directa */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Agregar a mi calendario:</p>
                <div className="grid grid-cols-3 gap-2">
                  {CALENDAR_APPS.map(app => (
                    <a
                      key={app.key}
                      href={app.getUrl(feedUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-center transition-colors ${app.bg}`}
                    >
                      <app.icon className={`w-5 h-5 ${app.iconColor}`} />
                      <span className="text-xs font-medium text-gray-700 leading-tight">{app.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* URL copiable */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">O copia la URL manualmente:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-600 font-mono truncate">
                    {feedUrl}
                  </code>
                  <Tooltip content={copied ? '¡Copiado!' : 'Copiar URL'}>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      {copied ? <HiCheck className="w-4 h-4 text-green-600" /> : <HiClipboardCopy className="w-4 h-4" />}
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Descargar .ics */}
              <a
                href={feedUrl}
                download="tenemosfilo.ics"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ↓ Descargar como archivo .ics
              </a>
            </>
          )}
        </div>

        <button
          onClick={() => setShowSetup(true)}
          className="mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-[#F26726] transition-colors self-start"
        >
          <HiOutlineQuestionMarkCircle className="w-3.5 h-3.5" />
          ¿Cómo usarlo?
        </button>
      </Card>

      <IntegrationSetupModal
        show={showSetup}
        onClose={() => setShowSetup(false)}
        title="Suscripción iCal"
        icon={<HiCalendar className="w-5 h-5 text-purple-600" />}
        docsUrl="https://calendar.google.com"
        steps={SETUP_STEPS}
        redirectUri=""
      />
    </>
  );
}
