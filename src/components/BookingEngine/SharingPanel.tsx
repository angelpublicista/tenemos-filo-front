"use client";

import React, { useState } from 'react';
import { Card } from 'flowbite-react';
import { HiClipboardCopy, HiCheck, HiExternalLink, HiCode, HiLink, HiMail, HiShare } from 'react-icons/hi';
import { FaWhatsapp, FaFacebookF, FaLinkedinIn, FaTelegram, FaXTwitter } from 'react-icons/fa6';

interface Props {
  companyId: string;
}

type Tab = 'link' | 'share' | 'iframe';

export default function SharingPanel({ companyId }: Props) {
  const [tab, setTab] = useState<Tab>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookingUrl = `${origin}/book/${companyId}`;
  const iframeCode = `<iframe\n  src="${bookingUrl}?embed=1"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border-radius:12px;border:1px solid #e5e7eb;"\n  title="Catálogo digital"\n></iframe>`;

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  const shareMessage = '¡Reserva en nuestro catálogo digital!';
  const shareTargets = [
    {
      name: 'WhatsApp',
      icon: FaWhatsapp,
      bg: 'bg-[#25D366] hover:bg-[#1ebe57]',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${bookingUrl}`)}`,
    },
    {
      name: 'Correo',
      icon: HiMail,
      bg: 'bg-[#334C5D] hover:bg-[#26394a]',
      href: `mailto:?subject=${encodeURIComponent(shareMessage)}&body=${encodeURIComponent(`${shareMessage}\n\n${bookingUrl}`)}`,
    },
    {
      name: 'Facebook',
      icon: FaFacebookF,
      bg: 'bg-[#1877F2] hover:bg-[#0e60c8]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl)}`,
    },
    {
      name: 'X',
      icon: FaXTwitter,
      bg: 'bg-black hover:bg-gray-800',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(bookingUrl)}&text=${encodeURIComponent(shareMessage)}`,
    },
    {
      name: 'LinkedIn',
      icon: FaLinkedinIn,
      bg: 'bg-[#0A66C2] hover:bg-[#08529c]',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(bookingUrl)}`,
    },
    {
      name: 'Telegram',
      icon: FaTelegram,
      bg: 'bg-[#229ED9] hover:bg-[#1c81b1]',
      href: `https://t.me/share/url?url=${encodeURIComponent(bookingUrl)}&text=${encodeURIComponent(shareMessage)}`,
    },
  ];

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[#334C5D]">Catálogo digital</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Comparte tu catálogo digital o incrústalo en tu sitio web
          </p>
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[#F26726] hover:underline font-medium shrink-0"
        >
          <HiExternalLink className="w-4 h-4" />
          Ver página
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5 max-w-full overflow-x-auto">
        <button
          onClick={() => setTab('link')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none ${
            tab === 'link' ? 'bg-white text-[#334C5D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HiLink className="w-4 h-4" />
          <span className="hidden sm:inline">Enlace directo</span>
          <span className="sm:hidden">Enlace</span>
        </button>
        <button
          onClick={() => setTab('share')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none ${
            tab === 'share' ? 'bg-white text-[#334C5D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HiShare className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar por</span>
          <span className="sm:hidden">Enviar</span>
        </button>
        <button
          onClick={() => setTab('iframe')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none ${
            tab === 'iframe' ? 'bg-white text-[#334C5D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HiCode className="w-4 h-4" />
          <span className="hidden sm:inline">Insertar en web</span>
          <span className="sm:hidden">Insertar</span>
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

      {tab === 'share' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Comparte tu catálogo digital directamente desde estas plataformas.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {shareTargets.map(({ name, icon: Icon, bg, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${bg}`}
              >
                <Icon className="w-4 h-4" />
                {name}
              </a>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
            Cada botón abrirá la app o sitio correspondiente con el enlace listo para enviar.
          </div>
        </div>
      )}

      {tab === 'iframe' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Pega este código en el HTML de tu sitio web para mostrar el catálogo digital incrustado.
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
