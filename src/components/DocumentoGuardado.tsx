"use client";

import React, { useState } from 'react';
import { HiDocumentText, HiExternalLink } from 'react-icons/hi';
import { enlaceDeDocumento } from '@/lib/api/uploads';

interface DocumentoGuardadoProps {
  etiqueta: string;
  documentoKey: string;
  subidoEl?: string;
}

/**
 * Un documento legal ya guardado, en modo lectura.
 *
 * No enseña miniatura ni enlace directo: el fichero es privado y su URL se
 * firma al pulsar, no al pintar la pantalla. Un enlace pedido "por si acaso"
 * caducaria antes de que nadie lo usara.
 */
export default function DocumentoGuardado({
  etiqueta,
  documentoKey,
  subidoEl,
}: DocumentoGuardadoProps) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState(false);

  const abrir = async () => {
    try {
      setAbriendo(true);
      setError(false);
      const url = await enlaceDeDocumento(documentoKey);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error abriendo documento:', err);
      setError(true);
    } finally {
      setAbriendo(false);
    }
  };

  const fecha = subidoEl
    ? new Date(subidoEl).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div>
      <label className="text-sm font-medium text-gray-500 block mb-1">{etiqueta}</label>
      <div className="flex items-center gap-2">
        <HiDocumentText className="w-5 h-5 text-[#F26726] shrink-0" />
        <button
          type="button"
          onClick={abrir}
          disabled={abriendo}
          className="text-sm text-[#F26726] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
        >
          <HiExternalLink className="w-3.5 h-3.5" />
          {abriendo ? 'Abriendo...' : 'Ver documento'}
        </button>
        {fecha && <span className="text-xs text-gray-400">· subido el {fecha}</span>}
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1">No se pudo abrir. Inténtalo de nuevo.</p>
      )}
    </div>
  );
}
