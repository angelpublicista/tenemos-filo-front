"use client";

import { useState } from 'react';
import { HiClock, HiUsers, HiLocationMarker, HiVideoCamera } from 'react-icons/hi';
import type { BookingExperience } from '@/app/book/[slug]/page';
import ExperienceDetailModal from './ExperienceDetailModal';

const CATEGORY_LABEL: Record<string, string> = {
  cooking: 'Cocina', mixology: 'Mixología', tasting: 'Degustación',
  catering: 'Catering', corporate: 'Corporativo', celebrations: 'Celebraciones',
  workshops: 'Talleres', other: 'Otro',
};

function sanityImageUrl(assetRef: string): string {
  const withoutPrefix = assetRef.replace(/^image-/, '');
  const lastDash = withoutPrefix.lastIndexOf('-');
  const ext = withoutPrefix.slice(lastDash + 1);
  const id = withoutPrefix.slice(0, lastDash);
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}.${ext}`;
}

function getImageUrl(exp: BookingExperience): string | null {
  // featuredImage llega como string (asset ref) gracias a la proyección GROQ.
  // También soportamos el formato objeto { asset: { _ref } } por compatibilidad.
  const fi = exp.featuredImage as unknown;
  if (fi) {
    const ref = typeof fi === 'string'
      ? fi
      : (fi as { asset?: { _ref?: string } })?.asset?._ref;
    if (ref && ref.startsWith('image-')) return sanityImageUrl(ref);
  }
  if (exp.images?.[0]?.asset?._ref) return sanityImageUrl(exp.images[0].asset._ref);
  return null;
}

function formatPrice(price: number, currency: string) {
  return price.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 });
}

interface Props {
  experiences: BookingExperience[];
  onSelect: (exp: BookingExperience) => void;
}

export default function ExperienceList({ experiences, onSelect }: Props) {
  const [detailExp, setDetailExp] = useState<BookingExperience | null>(null);

  if (experiences.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">No hay experiencias disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
      {experiences.map((exp) => {
        const img = getImageUrl(exp);
        return (
          <div
            key={exp._id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full"
          >
            <div className="flex flex-col h-full">
              {/* Imagen / Placeholder con misma altura fija */}
              {img ? (
                <img
                  src={img}
                  alt={exp.title}
                  className="block w-full h-56 object-cover border-b border-gray-100"
                />
              ) : (
                <div className="w-full h-56 bg-linear-to-br from-[#F26726]/10 via-[#E23694]/10 to-[#334C5D]/10 flex items-center justify-center border-b border-gray-100">
                  <div className="text-center px-4">
                    <div className="mx-auto w-10 h-10 rounded-full bg-white/80 border border-gray-200 flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-gray-500">Sin imagen de portada</p>
                  </div>
                </div>
              )}

              {/* Contenido */}
              <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{exp.title}</h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
                      exp.experienceType === 'virtual' ? 'bg-blue-100 text-blue-700' :
                      exp.experienceType === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {exp.experienceType === 'virtual' ? 'Virtual' :
                       exp.experienceType === 'hybrid' ? 'Híbrida' : 'Presencial'}
                    </span>
                  </div>

                  {exp.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {exp.categories.slice(0, 3).map(c => (
                        <span key={c} className="text-xs bg-orange-50 text-[#F26726] px-2.5 py-1 rounded-full">
                          {CATEGORY_LABEL[c] ?? c}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">{typeof exp.description === 'string' ? exp.description : ''}</p>

                  <div className="flex flex-wrap text-xs text-gray-500 -mr-4 -mb-2">
                    <span className="inline-flex items-center gap-1.5 mr-4 mb-2">
                      <HiClock className="w-4 h-4 text-gray-400" />
                      {exp.duration != null ? (exp.duration >= 60 ? `${Math.floor(exp.duration / 60)}h${exp.duration % 60 ? ` ${exp.duration % 60}min` : ''}` : `${exp.duration} min`) : '—'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 mr-4 mb-2">
                      <HiUsers className="w-4 h-4 text-gray-400" />
                      {exp.minCapacity ? `${exp.minCapacity}–` : ''}{exp.capacity} personas
                    </span>
                    {exp.experienceType !== 'virtual' && exp.presentialCity && (
                      <span className="inline-flex items-center gap-1.5 mr-4 mb-2">
                        <HiLocationMarker className="w-4 h-4 text-gray-400" />
                        {exp.presentialCity}
                      </span>
                    )}
                    {exp.experienceType === 'virtual' && (
                      <span className="inline-flex items-center gap-1.5 mr-4 mb-2">
                        <HiVideoCamera className="w-4 h-4 text-gray-400" />
                        {exp.virtualPlatform ?? 'En línea'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Precio por persona</p>
                    <p className="text-xl font-bold text-[#334C5D]">
                      {exp.basePrice != null && exp.currency ? formatPrice(exp.basePrice, exp.currency) : 'Consultar'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailExp(exp)}
                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                    >
                      Ver más
                    </button>
                    <button
                      onClick={() => onSelect(exp)}
                      className="flex-1 px-4 py-2.5 bg-[#F26726] hover:bg-[#d9571f] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {detailExp && (
      <ExperienceDetailModal
        experience={detailExp}
        onClose={() => setDetailExp(null)}
        onBook={(exp) => {
          setDetailExp(null);
          onSelect(exp);
        }}
      />
    )}
    </>
  );
}
