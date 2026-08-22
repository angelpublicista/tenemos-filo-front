"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { HiX, HiClock, HiUsers, HiLocationMarker, HiVideoCamera, HiCheck, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import type { BookingExperience, BookingLocationAddress } from '@/app/book/[slug]/page';
import { urlDeImagen } from '@/lib/images';

const CATEGORY_LABEL: Record<string, string> = {
  cooking: 'Cocina', mixology: 'Mixología', tasting: 'Degustación',
  catering: 'Catering', corporate: 'Corporativo', celebrations: 'Celebraciones',
  workshops: 'Talleres', other: 'Otro',
};


function formatAddress(address: BookingLocationAddress | string | undefined): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.street, address.city, address.state, address.country].filter(Boolean).join(', ');
}

function formatPrice(price: number, currency: string) {
  return price.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 });
}

function formatDuration(duration?: number): string {
  if (duration == null) return '—';
  if (duration >= 60) return `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}min` : ''}`;
  return `${duration} min`;
}

interface Props {
  experience: BookingExperience;
  onClose: () => void;
  onBook: (exp: BookingExperience) => void;
}

export default function ExperienceDetailModal({ experience, onClose, onBook }: Props) {
  const gallery = (experience as BookingExperience & { gallery?: Array<{ assetId: string; alt?: string; caption?: string }> }).gallery ?? [];
  const featuredRef = typeof experience.featuredImage === 'string'
    ? experience.featuredImage
    : (experience.featuredImage as unknown as { asset?: { _ref?: string } })?.asset?._ref;

  // Se acepta cualquier imagen que se pueda resolver. Antes solo entraban
  // las que empezaban por "image-", el formato viejo de Sanity, asi que las
  // que se suben hoy (URL de CloudFront) quedaban fuera y la galeria salia
  // vacia aunque la experiencia tuviera fotos.
  const allImages: Array<{ url: string; alt?: string; caption?: string }> = [];
  const urlDestacada = urlDeImagen(featuredRef);
  if (urlDestacada) {
    allImages.push({ url: urlDestacada, alt: experience.title });
  }
  gallery.forEach(g => {
    const url = urlDeImagen(g.assetId);
    if (url) allImages.push({ url, alt: g.alt, caption: g.caption });
  });

  const [current, setCurrent] = useState(0);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && allImages.length > 1) setCurrent(c => (c - 1 + allImages.length) % allImages.length);
    if (e.key === 'ArrowRight' && allImages.length > 1) setCurrent(c => (c + 1) % allImages.length);
  }, [onClose, allImages.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [handleKey]);

  const locations = experience.locations ?? [];
  const isVirtual = experience.experienceType === 'virtual' || experience.isVirtual === true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-4 py-10 sm:py-12 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-auto relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white shadow-sm"
        >
          <HiX className="w-5 h-5" />
        </button>

        {/* Galería */}
        {allImages.length > 0 ? (
          <div className="relative bg-gray-100">
            <img
              src={allImages[current].url}
              alt={allImages[current].alt ?? experience.title}
              className="block w-full h-72 sm:h-96 object-cover"
            />
            {allImages.length > 1 && (
              <>
                <button
                  onClick={() => setCurrent(c => (c - 1 + allImages.length) % allImages.length)}
                  aria-label="Imagen anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white shadow-sm"
                >
                  <HiChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrent(c => (c + 1) % allImages.length)}
                  aria-label="Imagen siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white shadow-sm"
                >
                  <HiChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur rounded-full px-3 py-1.5">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      aria-label={`Ir a imagen ${i + 1}`}
                      className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
            {allImages[current].caption && (
              <p className="absolute bottom-3 right-3 max-w-xs text-xs text-white bg-black/50 backdrop-blur rounded-lg px-3 py-1.5">
                {allImages[current].caption}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full h-56 bg-linear-to-br from-[#F26726]/10 via-[#E23694]/10 to-[#334C5D]/10" />
        )}

        {/* Contenido */}
        <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{experience.title}</h2>
            <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
              isVirtual ? 'bg-blue-100 text-blue-700' :
              experience.experienceType === 'hybrid' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              {isVirtual ? 'Virtual' : experience.experienceType === 'hybrid' ? 'Híbrida' : 'Presencial'}
            </span>
          </div>

          {experience.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {experience.categories.map(c => (
                <span key={c} className="text-xs bg-orange-50 text-[#F26726] px-2.5 py-1 rounded-full">
                  {CATEGORY_LABEL[c] ?? c}
                </span>
              ))}
            </div>
          )}

          {typeof experience.description === 'string' && experience.description && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-6">
              {experience.description}
            </p>
          )}

          {/* Datos clave */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <HiClock className="w-3.5 h-3.5" /> Duración
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatDuration(experience.duration)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <HiUsers className="w-3.5 h-3.5" /> Capacidad
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {experience.minCapacity ? `${experience.minCapacity}–` : ''}{experience.capacity} personas
              </p>
            </div>
            {isVirtual ? (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <HiVideoCamera className="w-3.5 h-3.5" /> Plataforma
                </div>
                <p className="text-sm font-semibold text-gray-900 capitalize">{experience.virtualPlatform ?? 'En línea'}</p>
              </div>
            ) : experience.presentialCity ? (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <HiLocationMarker className="w-3.5 h-3.5" /> Ciudad
                </div>
                <p className="text-sm font-semibold text-gray-900">{experience.presentialCity}</p>
              </div>
            ) : null}
          </div>

          {/* Incluye */}
          {experience.includes && experience.includes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Qué incluye</h3>
              <ul className="space-y-1.5">
                {experience.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <HiCheck className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requisitos */}
          {experience.requirements && experience.requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Requisitos</h3>
              <ul className="space-y-1.5">
                {experience.requirements.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Addons */}
          {experience.addons && experience.addons.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Complementos disponibles</h3>
              <div className="space-y-2">
                {experience.addons.map((addon, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                      {addon.description && <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-[#334C5D] shrink-0">
                      {formatPrice(addon.price, experience.currency)}
                      <span className="text-xs text-gray-400 font-normal ml-1">
                        {addon.priceType === 'per_person' ? '/persona' : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sedes */}
          {!isVirtual && locations.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {locations.length === 1 ? 'Sede' : 'Sedes disponibles'}
              </h3>
              <div className="space-y-2">
                {locations.map(loc => {
                  const cityOnly = typeof loc.address === 'object' && loc.address ? loc.address.city : '';
                  return (
                    <div key={loc._id} className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{loc.name}</p>
                      {experience.hideAddress ? (
                        cityOnly && (
                          <p className="text-xs text-gray-500 mt-0.5">{cityOnly}</p>
                        )
                      ) : (
                        formatAddress(loc.address) && (
                          <p className="text-xs text-gray-500 mt-0.5">{formatAddress(loc.address)}</p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
              {experience.hideAddress && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  La dirección exacta se compartirá una vez confirmemos tu reserva.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer sticky */}
        <div className="border-t border-gray-100 bg-white px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">Precio por persona</p>
            <p className="text-xl font-bold text-[#334C5D]">
              {experience.basePrice != null && experience.currency ? formatPrice(experience.basePrice, experience.currency) : 'Consultar'}
            </p>
          </div>
          <button
            onClick={() => onBook(experience)}
            className="px-6 py-3 bg-[#F26726] hover:bg-[#d9571f] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}
