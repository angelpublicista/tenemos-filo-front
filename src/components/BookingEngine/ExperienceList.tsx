"use client";

import { useRef, useState } from 'react';
import { HiClock, HiUsers, HiLocationMarker, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import type { BookingExperience } from '@/components/BookingEngine/MotorReservas';
import ExperienceDetailModal from './ExperienceDetailModal';
import CompartirExperiencia from './CompartirExperiencia';
import { urlDeImagen } from '@/lib/images';
import { ciudadesQueCubre, cuposMaximos, precioDesde } from '@/lib/experiencias/condicionesDeSede';

const CATEGORY_LABEL: Record<string, string> = {
  cooking: 'Cocina', mixology: 'Mixología', tasting: 'Degustación',
  catering: 'Catering', corporate: 'Corporativo', celebrations: 'Celebraciones',
  workshops: 'Talleres', other: 'Otro',
};


/**
 * Todas las imágenes de la experiencia: la portada primero y después la
 * galería, sin repetir. Es la misma lista que recorre el detalle, para que lo
 * que se ve en la tarjeta sea lo que se encuentra al abrirla.
 */
function imagenesDe(exp: BookingExperience): string[] {
  const fi = exp.featuredImage as unknown;
  const ref = typeof fi === 'string' ? fi : (fi as { asset?: { _ref?: string } } | undefined)?.asset?._ref;
  const urls = [
    urlDeImagen(ref),
    ...((exp as BookingExperience & { gallery?: Array<{ assetId: string }> }).gallery ?? []).map((g) =>
      urlDeImagen(g.assetId),
    ),
    ...(exp.images ?? []).map((i) => urlDeImagen(i.asset?._ref)),
  ].filter((u): u is string => !!u);
  return [...new Set(urls)];
}

/** Cuánto hay que arrastrar para que cuente como deslizar y no como un toque. */
const UMBRAL_DESLIZAR = 40;

/**
 * La portada de una tarjeta: una imagen, o un carrusel si hay más de una.
 *
 * Sin rotación automática a propósito: en una lista de tarjetas, varias cosas
 * moviéndose a la vez cansan y le quitan el control a quien lee. Se cambia con
 * las flechas, los puntos o deslizando.
 */
function PortadaDeExperiencia({ imagenes, titulo }: { imagenes: string[]; titulo: string }) {
  const [actual, setActual] = useState(0);
  const inicioX = useRef<number | null>(null);
  const total = imagenes.length;
  const ir = (i: number) => setActual(((i % total) + total) % total);

  if (total === 1) {
    return (
      <img src={imagenes[0]} alt={titulo} className="block w-full h-56 object-cover border-b border-gray-100" />
    );
  }

  return (
    <div
      className="group relative h-56 overflow-hidden border-b border-gray-100 bg-gray-100"
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Imágenes de ${titulo}`}
      // touch-pan-y: el gesto vertical sigue siendo scroll de la página.
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => { inicioX.current = e.clientX; }}
      onPointerUp={(e) => {
        if (inicioX.current === null) return;
        const dx = e.clientX - inicioX.current;
        inicioX.current = null;
        if (Math.abs(dx) >= UMBRAL_DESLIZAR) ir(actual + (dx < 0 ? 1 : -1));
      }}
      onPointerCancel={() => { inicioX.current = null; }}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${actual * 100}%)` }}
      >
        {imagenes.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={i === 0 ? titulo : `${titulo} (${i + 1} de ${total})`}
            draggable={false}
            // Solo la primera se pide de entrada; el resto, cuando se acerquen.
            loading={i === 0 ? 'eager' : 'lazy'}
            className="block h-full w-full shrink-0 object-cover"
          />
        ))}
      </div>

      {/* En pantallas táctiles siempre visibles; con ratón, al pasar por encima. */}
      <button
        type="button"
        onClick={() => ir(actual - 1)}
        aria-label="Imagen anterior"
        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
      >
        <HiChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => ir(actual + 1)}
        aria-label="Imagen siguiente"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
      >
        <HiChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2.5 py-1">
        {imagenes.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => ir(i)}
            aria-label={`Ir a la imagen ${i + 1}`}
            aria-current={i === actual}
            className={`h-1.5 rounded-full transition-all ${i === actual ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
}

function getImageUrl(exp: BookingExperience): string | null {
  // featuredImage es la URL que devolvió la subida. También se acepta el
  // formato objeto { asset: { _ref } } por compatibilidad. No se filtra por
  // prefijo: el "image-" era de Sanity y dejaba sin portada a todas las que se
  // suben hoy.
  const fi = exp.featuredImage as unknown;
  const ref = typeof fi === 'string' ? fi : (fi as { asset?: { _ref?: string } } | undefined)?.asset?._ref;
  const portada = urlDeImagen(ref);
  if (portada) return portada;
  // Sin portada, la primera foto de la galería: mejor que el marcador vacío.
  const primera = (exp as BookingExperience & { gallery?: Array<{ assetId: string }> }).gallery?.[0]?.assetId;
  const deGaleria = urlDeImagen(primera);
  if (deGaleria) return deGaleria;
  if (exp.images?.[0]?.asset?._ref) return urlDeImagen(exp.images[0].asset._ref);
  return null;
}

function formatPrice(price: number, currency: string) {
  return price.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 });
}

interface Props {
  experiences: BookingExperience[];
  onSelect: (exp: BookingExperience) => void;
  /** /book/<empresa> o /r/<canal>: de ahí cuelga el enlace de cada publicación. */
  rutaDelCatalogo: string;
}

export default function ExperienceList({ experiences, onSelect, rutaDelCatalogo }: Props) {
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
        const imagenes = imagenesDe(exp);
        return (
          <div
            key={exp._id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full"
          >
            <div className="flex flex-col h-full">
              {/* Imagen / Placeholder con misma altura fija */}
              {img ? (
                <PortadaDeExperiencia imagenes={imagenes.length > 0 ? imagenes : [img]} titulo={exp.title} />
              ) : (
                <div className="w-full h-56 bg-linear-to-br from-marca-tenue via-acento-tenue to-[#334C5D]/10 flex items-center justify-center border-b border-gray-100">
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
                    {/* Todo es presencial; lo que hay que distinguir es si el
                        anfitrión va a casa de quien reserva. */}
                    <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
                      exp.atHome ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {exp.atHome ? 'A domicilio' : 'En sede'}
                    </span>
                  </div>

                  {exp.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {exp.categories.slice(0, 3).map(c => (
                        <span key={c} className="text-xs bg-marca-tenue text-marca px-2.5 py-1 rounded-full">
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
                      {/* El máximo sale de las franjas: los cupos son del horario. */}
                      {(() => {
                        const tope = cuposMaximos(exp.availabilitySchedules ?? []);
                        if (tope) return `${exp.minCapacity ? `${exp.minCapacity}–` : ''}${tope} personas`;
                        return exp.minCapacity ? `Desde ${exp.minCapacity} personas` : '';
                      })()}
                    </span>
                    {(exp.atHome ? ciudadesQueCubre(exp).length > 0 : exp.presentialCity) && (
                      <span className="inline-flex items-center gap-1.5 mr-4 mb-2">
                        <HiLocationMarker className="w-4 h-4 text-gray-400" />
                        {/* A domicilio la ciudad es el área que cubre, no un
                            sitio al que ir; y puede ser más de una. */}
                        {exp.atHome
                          ? `${ciudadesQueCubre(exp).join(', ')} y alrededores`
                          : exp.presentialCity}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    {(() => {
                      // Con sedes a precios distintos no hay «el precio»: se
                      // anuncia el mas bajo y se dice que depende de la sede.
                      const { precio, varía } = precioDesde(exp);
                      return (
                        <>
                          <p className="text-xs text-gray-400 mb-0.5">
                            {varía ? 'Desde, por persona' : 'Precio por persona'}
                          </p>
                          <p className="text-xl font-bold text-[#334C5D]">
                            {precio != null && exp.currency ? formatPrice(precio, exp.currency) : 'Consultar'}
                          </p>
                        </>
                      );
                    })()}
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
                      className="flex-1 px-4 py-2.5 bg-marca hover:bg-marca-fuerte text-marca-contraste text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      Reservar
                    </button>
                    <CompartirExperiencia experience={exp} rutaDelCatalogo={rutaDelCatalogo} />
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
