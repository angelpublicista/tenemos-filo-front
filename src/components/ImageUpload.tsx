"use client";

import React, { useState, useRef } from 'react';
import { Label, Button, TextInput } from 'flowbite-react';
import { HiUpload, HiPhotograph, HiPlus, HiTrash } from 'react-icons/hi';
import Image from 'next/image';
import { uploadImage, UploadScope } from '@/lib/api/uploads';

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  required?: boolean;
  helpText?: string;
  compact?: boolean;
  circular?: boolean;
  scope?: UploadScope;
}

interface GalleryUploadProps {
  label: string;
  values: Array<{ assetId: string; alt?: string; caption?: string }>;
  onChange: (images: Array<{ assetId: string; alt?: string; caption?: string }>) => void;
  maxImages?: number;
  helpText?: string;
  scope?: UploadScope;
}

// Resuelve la URL de visualizacion. Compat con assets viejos de Sanity:
// - URL absoluta (S3/CloudFront): se usa tal cual
// - "image-..." (asset id Sanity legacy): se construye URL del CDN de Sanity
function getImageUrl(value: string): string {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  // Legacy: Sanity asset id
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  if (value.startsWith('image-')) {
    const cleanAssetId = value.replace('image-', '').replace(/-([a-z]+)$/, '.$1');
    return `https://cdn.sanity.io/images/${projectId}/${dataset}/${cleanAssetId}`;
  }
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${value}`;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

// ─── Imagen única ────────────────────────────────────────────────────────────

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  required = false,
  helpText,
  compact = false,
  circular = false,
  scope = 'misc',
}) => {
  const shapeClass = circular ? 'rounded-full' : 'rounded-lg';
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(`"${file.name}" pesa ${formatSize(file.size)} — el límite es 10 MB`);
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, scope);
      onChange(url);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Error al subir la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {helpText && <p className="text-sm text-gray-500">{helpText}</p>}

      <div className="space-y-4">
        {value ? (
          <div className={`relative group ${compact ? 'inline-block' : ''}`}>
            <div
              className={`relative bg-gray-100 border border-gray-200 ${shapeClass} overflow-hidden ${
                compact ? 'w-32 h-32 sm:w-36 sm:h-36' : 'w-full h-64'
              }`}
            >
              <Image src={getImageUrl(value)} alt={label} fill className="object-cover" unoptimized />
            </div>
            <div className={compact ? 'absolute -top-2 -right-2' : 'absolute top-2 right-2'}>
              <Button size="xs" color="danger" onClick={handleRemove} className="opacity-90 hover:opacity-100">
                <HiTrash className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-300 ${shapeClass} text-center cursor-pointer hover:border-[#F26726] transition-colors ${
              compact ? 'w-32 h-32 sm:w-36 sm:h-36 p-3 flex flex-col items-center justify-center' : 'p-8'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            {isUploading ? (
              <div className={compact ? 'space-y-2' : 'space-y-3'}>
                <div
                  className={`animate-spin rounded-full border-b-2 border-[#F26726] mx-auto ${
                    compact ? 'h-6 w-6' : 'h-12 w-12'
                  }`}
                />
                <p className={`text-gray-600 ${compact ? 'text-xs' : ''}`}>Subiendo...</p>
              </div>
            ) : compact ? (
              <div className="space-y-1.5">
                <HiPhotograph className="w-7 h-7 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-600 leading-tight">Subir logo</p>
                <p className="text-[10px] text-gray-400 leading-tight">PNG, JPG · 10 MB</p>
              </div>
            ) : (
              <div className="space-y-3">
                <HiPhotograph className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-gray-700 font-medium">Haz clic para seleccionar una imagen</p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF hasta 10 MB</p>
                </div>
                <Button type="button" color="gray" size="sm" className="inline-flex">
                  <HiUpload className="w-4 h-4 mr-2" />
                  Seleccionar Archivo
                </Button>
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
    </div>
  );
};

// ─── Galería múltiple ─────────────────────────────────────────────────────────

export const GalleryUpload: React.FC<GalleryUploadProps> = ({
  label,
  values,
  onChange,
  maxImages = 10,
  helpText,
  scope = 'gallery',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validationErrors: string[] = [];

    if (values.length + fileArray.length > maxImages) {
      const remaining = maxImages - values.length;
      validationErrors.push(
        `Solo puedes agregar ${remaining} imagen${remaining !== 1 ? 'es' : ''} más (límite: ${maxImages})`
      );
      setErrors(validationErrors);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        validationErrors.push(`"${file.name}" no es una imagen válida`);
      } else if (file.size > 10 * 1024 * 1024) {
        validationErrors.push(`"${file.name}" pesa ${formatSize(file.size)} — el límite es 10 MB`);
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setErrors([]);

    try {
      const uploaded = await Promise.all(
        fileArray.map(async (file) => {
          const url = await uploadImage(file, scope);
          // Conservamos la prop "assetId" en el shape para no romper consumidores;
          // ahora contiene la URL publica de S3 en vez del id de Sanity.
          return { assetId: url, alt: '', caption: '' };
        })
      );
      onChange([...values, ...uploaded]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading images:', err);
      setErrors([err instanceof Error ? err.message : 'Error al subir las imágenes.']);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleUpdateMetadata = (index: number, field: 'alt' | 'caption', value: string) => {
    const next = [...values];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {helpText && <p className="text-sm text-gray-500">{helpText}</p>}

      <div className="space-y-4">
        {values.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {values.map((image, index) => (
              <div key={index} className="space-y-2">
                <div className="relative group">
                  <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={getImageUrl(image.assetId)}
                      alt={image.alt || `Imagen ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button
                      size="xs"
                      color="danger"
                      onClick={() => handleRemove(index)}
                      className="opacity-90 hover:opacity-100"
                    >
                      <HiTrash className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {editingIndex === index ? (
                  <div className="space-y-2">
                    <TextInput
                      sizing="sm"
                      placeholder="Texto alternativo"
                      value={image.alt || ''}
                      onChange={(e) => handleUpdateMetadata(index, 'alt', e.target.value)}
                    />
                    <TextInput
                      sizing="sm"
                      placeholder="Descripción"
                      value={image.caption || ''}
                      onChange={(e) => handleUpdateMetadata(index, 'caption', e.target.value)}
                    />
                    <Button size="xs" color="gray" onClick={() => setEditingIndex(null)} className="w-full">
                      Guardar
                    </Button>
                  </div>
                ) : (
                  <Button size="xs" color="gray" onClick={() => setEditingIndex(index)} className="w-full">
                    Editar Info
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {values.length < maxImages && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#F26726] transition-colors"
            >
              {isUploading ? (
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F26726] mx-auto" />
                  <p className="text-gray-600">Subiendo imágenes...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <HiPlus className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-gray-700 font-medium">Agregar imágenes</p>
                  <p className="text-sm text-gray-500">{values.length} de {maxImages} imágenes · máx. 10 MB c/u</p>
                </div>
              )}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-red-600 text-sm flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                {e}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
