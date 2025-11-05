"use client";

import React, { useState, useRef } from 'react';
import { sanityClient } from '@/lib/sanity/sanityClient';
import { Label, Button, TextInput } from 'flowbite-react';
import { HiUpload, HiX, HiPhotograph, HiPlus, HiTrash } from 'react-icons/hi';
import Image from 'next/image';

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (assetId: string) => void;
  required?: boolean;
  helpText?: string;
}

interface GalleryUploadProps {
  label: string;
  values: Array<{ assetId: string; alt?: string; caption?: string }>;
  onChange: (images: Array<{ assetId: string; alt?: string; caption?: string }>) => void;
  maxImages?: number;
  helpText?: string;
}

// Función para obtener URL de imagen desde Sanity
const getImageUrl = (assetId: string): string => {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  
  // Extraer el ID del asset si viene en formato completo
  const cleanAssetId = assetId.replace('image-', '').replace(/-([a-z]+)$/, '.$1');
  
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${cleanAssetId}`;
};

// Componente para subir una sola imagen
export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  required = false,
  helpText,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen debe ser menor a 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await sanityClient.assets.upload('image', file, {
        filename: file.name,
      });

      onChange(result._id);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Error al subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {helpText && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}

      <div className="space-y-4">
        {value ? (
          <div className="relative group">
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={getImageUrl(value)}
                alt={label}
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="sm"
                color="failure"
                onClick={handleRemove}
                className="opacity-90 hover:opacity-100"
              >
                <HiTrash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={handleClick}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#F26726] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {isUploading ? (
              <div className="space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F26726] mx-auto"></div>
                <p className="text-gray-600">Subiendo imagen...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <HiPhotograph className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-gray-700 font-medium">Haz clic para seleccionar una imagen</p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF hasta 10MB</p>
                </div>
                <Button
                  type="button"
                  color="gray"
                  size="sm"
                  className="inline-flex"
                >
                  <HiUpload className="w-4 h-4 mr-2" />
                  Seleccionar Archivo
                </Button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
};

// Componente para galería de múltiples imágenes
export const GalleryUpload: React.FC<GalleryUploadProps> = ({
  label,
  values,
  onChange,
  maxImages = 10,
  helpText,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validar número máximo de imágenes
    if (values.length + files.length > maxImages) {
      setError(`Puedes agregar hasta ${maxImages} imágenes`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          throw new Error('Archivo no válido');
        }

        // Validar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Imagen muy grande');
        }

        const result = await sanityClient.assets.upload('image', file, {
          filename: file.name,
        });

        return {
          assetId: result._id,
          alt: '',
          caption: '',
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      onChange([...values, ...uploadedImages]);

      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading images:', err);
      setError('Error al subir una o más imágenes. Por favor intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleUpdateMetadata = (index: number, field: 'alt' | 'caption', value: string) => {
    const newValues = [...values];
    newValues[index] = {
      ...newValues[index],
      [field]: value,
    };
    onChange(newValues);
  };

  const handleClick = () => {
    if (values.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {helpText && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}

      <div className="space-y-4">
        {/* Grid de imágenes */}
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
                    />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="xs"
                      color="failure"
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
                    <Button
                      size="xs"
                      color="gray"
                      onClick={() => setEditingIndex(null)}
                      className="w-full"
                    >
                      Guardar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="xs"
                    color="gray"
                    onClick={() => setEditingIndex(index)}
                    className="w-full"
                  >
                    Editar Info
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botón para agregar más imágenes */}
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
              onClick={handleClick}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#F26726] transition-colors"
            >
              {isUploading ? (
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F26726] mx-auto"></div>
                  <p className="text-gray-600">Subiendo imágenes...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <HiPlus className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-gray-700 font-medium">Agregar imágenes</p>
                  <p className="text-sm text-gray-500">
                    {values.length} de {maxImages} imágenes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
};

