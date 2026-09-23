"use client";

import React, { useState, useRef } from 'react';
import { Label } from 'flowbite-react';
import { HiDocumentText, HiTrash, HiExternalLink } from 'react-icons/hi';
import { subirDocumento, enlaceDeDocumento, UploadScope } from '@/lib/api/uploads';

interface DocumentUploadProps {
  label: string;
  /** Clave de S3 del documento ya subido, no una URL. */
  value?: string;
  /** Recibe la clave, o '' al quitarlo. */
  onChange: (key: string) => void;
  helpText?: string;
  scope?: UploadScope;
  /** Se llama con el fichero recien elegido, antes de subirlo. */
  onArchivo?: (file: File) => void;
  disabled?: boolean;
  /**
   * La IA esta leyendo ESTE documento.
   *
   * Es un estado aparte de `subiendo` y no un detalle: la subida termina en
   * un par de segundos y la lectura tarda bastantes mas. Justo cuando empieza
   * la espera larga, la caja ya se ha convertido en "documento cargado" y
   * dejaba de haber cualquier señal de que algo seguia pasando.
   */
  analizando?: boolean;
}

const TIPOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

const formatearTamaño = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

/**
 * Subida de un documento legal.
 *
 * No se reutiliza `ImageUpload` porque filtra por `accept="image/*"`, rechaza
 * lo que no empiece por `image/` y previsualiza con `next/image`, que no puede
 * pintar un PDF. Comparte su aspecto —mismo spinner, misma caja de error— pero
 * aqui el "preview" es el nombre del fichero y un enlace firmado, porque el
 * documento no es publico y no hay miniatura que enseñar.
 */
export default function DocumentUpload({
  label,
  value,
  onChange,
  helpText,
  scope = 'documentos',
  onArchivo,
  disabled = false,
  analizando = false,
}: DocumentUploadProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!TIPOS.includes(file.type)) {
      setError('Sube el documento en PDF, JPG o PNG.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}" pesa ${formatearTamaño(file.size)} — el límite es 10 MB`);
      return;
    }

    setSubiendo(true);
    setError(null);
    try {
      // Se avisa antes de subir para que quien lo use pueda leer el documento
      // en paralelo: la lectura no necesita esperar a que S3 termine.
      onArchivo?.(file);
      const key = await subirDocumento(file, scope);
      setNombre(file.name);
      onChange(key);
    } catch (err) {
      console.error('Error subiendo documento:', err);
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento.');
    } finally {
      setSubiendo(false);
      // Sin esto, volver a elegir el mismo fichero no dispara el evento.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const abrir = async () => {
    if (!value) return;
    try {
      setAbriendo(true);
      // El enlace se pide al abrir y no al cargar la pantalla: caduca en
      // minutos, asi que uno pedido "por si acaso" llegaria muerto.
      const url = await enlaceDeDocumento(value);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error abriendo documento:', err);
      setError('No se pudo abrir el documento.');
    } finally {
      setAbriendo(false);
    }
  };

  const quitar = () => {
    onChange('');
    setNombre(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helpText && <p className="text-sm text-gray-500">{helpText}</p>}

      {value ? (
        <div
          className={`flex items-center gap-3 border rounded-lg p-3 transition-colors ${
            analizando ? 'border-[#F26726] bg-orange-50' : 'border-gray-200 bg-gray-50'
          }`}
          aria-busy={analizando}
        >
          {analizando ? (
            <div className="animate-spin rounded-full border-b-2 border-[#F26726] h-8 w-8 shrink-0" />
          ) : (
            <HiDocumentText className="w-8 h-8 text-[#F26726] shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#334C5D] truncate">
              {nombre ?? 'Documento cargado'}
            </p>
            {analizando ? (
              // Se dice que puede tardar: sin eso, diez segundos de spinner
              // parecen que algo se colgo.
              <p className="text-xs text-[#F26726]">
                Analizando el documento… puede tardar unos segundos
              </p>
            ) : (
              <button
                type="button"
                onClick={abrir}
                disabled={abriendo}
                className="text-xs text-[#F26726] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                <HiExternalLink className="w-3 h-3" />
                {abriendo ? 'Abriendo...' : 'Ver documento'}
              </button>
            )}
          </div>
          {/* Quitarlo a mitad de la lectura dejaria el resumen aplicandose
              sobre un documento que ya no esta. */}
          <button
            type="button"
            onClick={quitar}
            disabled={disabled || analizando}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`Quitar ${label}`}
          >
            <HiTrash className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !subiendo && inputRef.current?.click()}
          className={`border-2 border-dashed border-gray-300 rounded-lg p-5 text-center transition-colors ${
            disabled || subiendo
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer hover:border-[#F26726]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={elegir}
            className="hidden"
            disabled={disabled}
          />
          {subiendo ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full border-b-2 border-[#F26726] h-6 w-6 mx-auto" />
              <p className="text-sm text-gray-600">Subiendo...</p>
            </div>
          ) : (
            <div className="space-y-1">
              <HiDocumentText className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-700 font-medium">Haz clic para subir</p>
              <p className="text-xs text-gray-400">PDF, JPG o PNG · hasta 10 MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-red-600 text-sm flex items-start gap-1.5">
            <span className="mt-0.5 flex-shrink-0">⚠</span>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
