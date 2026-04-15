"use client";

import React, { useState } from 'react';
import { Card } from 'flowbite-react';
import { HiClipboardCopy, HiCheck, HiExternalLink, HiCode, HiLink } from 'react-icons/hi';

interface Props {
  companyId: string;
}

type Tab = 'link' | 'iframe';

export default function SharingPanel({ companyId }: Props) {
  const [tab, setTab] = useState<Tab>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookingUrl = `${origin}/book/${companyId}`;
  const iframeCode = `<iframe\n  src="${bookingUrl}?embed=1"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border-radius:12px;border:1px solid #e5e7eb;"\n  title="Motor de reservas"\n></iframe>`;

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-[#334C5D]">Motor de reservas</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Comparte tu página de reservas o incrústala en tu sitio web
          </p>
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[#F26726] hover:underline font-medium"
        >
          <HiExternalLink className="w-4 h-4" />
          Ver página
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5 w-fit">
        <button
          onClick={() => setTab('link')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'link' ? 'bg-white text-[#334C5D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HiLink className="w-4 h-4" />
          Enlace directo
        </button>
        <button
          onClick={() => setTab('iframe')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'iframe' ? 'bg-white text-[#334C5D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HiCode className="w-4 h-4" />
          Insertar en web
        </button>
      </div>

      {tab === 'link' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Comparte este enlace en WhatsApp, redes sociales, tu bio de Instagram o donde quieras.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 font-mono truncate">
              {bookingUrl}
            </code>
            <button
              onClick={() => copy(bookingUrl, setCopiedLink)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-[#F26726] hover:bg-[#d9571f] text-white text-xs font-medium rounded-lg transition-colors"
            >
              {copiedLink ? <HiCheck className="w-4 h-4" /> : <HiClipboardCopy className="w-4 h-4" />}
              {copiedLink ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
            Tus clientes podrán ver tus experiencias activas y hacer una solicitud de reserva directamente.
          </div>
        </div>
      )}

      {tab === 'iframe' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Pega este código en el HTML de tu sitio web para mostrar el motor de reservas incrustado.
          </p>
          <div className="relative">
            <pre className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre">
              {iframeCode}
            </pre>
            <button
              onClick={() => copy(iframeCode, setCopiedEmbed)}
              className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-[#F26726] hover:border-[#F26726] text-xs font-medium rounded-md transition-colors"
            >
              {copiedEmbed ? <HiCheck className="w-3.5 h-3.5 text-green-600" /> : <HiClipboardCopy className="w-3.5 h-3.5" />}
              {copiedEmbed ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700">
            El iframe se adapta al ancho del contenedor. Puedes ajustar el alto (recomendado: 700–900px) según el número de experiencias.
          </div>
        </div>
      )}
    </Card>
  );
}
