"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { getCompanyById } from '@/lib/sanity/companyService';
import { getActiveExperiencesByCompany } from '@/lib/sanity/experienceService';
import { createPublicReservation } from '@/lib/sanity/reservationService';
import type { Company, AvailabilitySchedule } from '@/types';
import type { Experience } from '@/types';
import ExperienceList from '@/components/BookingEngine/ExperienceList';
import DateTimeStep from '@/components/BookingEngine/DateTimeStep';
import ContactStep from '@/components/BookingEngine/ContactStep';
import ConfirmationStep from '@/components/BookingEngine/ConfirmationStep';
import FiloLogo from '@/components/FiloLogo';
import { SkeletonCard } from '@/components/Skeleton';

const getCompanyLogoUrl = (assetRef: string): string => {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const cleanAssetId = assetRef.startsWith('image-')
    ? assetRef.replace('image-', '').replace(/-([a-z]+)$/, '.$1')
    : assetRef;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${cleanAssetId}`;
};

export interface BookingLocationAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BookingExperience extends Omit<Experience, 'locations' | 'availabilities'> {
  availabilitySchedules?: AvailabilitySchedule[];
  locations?: Array<{ _id: string; name: string; address?: BookingLocationAddress | string; isMain?: boolean }>;
}

export interface SelectedAddon {
  name: string;
  price: number;
  quantity: number;
  priceType: 'per_person' | 'total';
}

export interface BookingData {
  experience: BookingExperience;
  date: Date;
  time: string;
  participants: number;
  locationId?: string;
  locationName?: string;
  selectedAddons?: SelectedAddon[];
  guestInfo: {
    name: string;
    email: string;
    phone: string;
    notes?: string;
  };
}

type Step = 'experiences' | 'datetime' | 'contact' | 'confirmation' | 'success';

const STEP_LABELS: Record<Step, string> = {
  experiences: 'Experiencia',
  datetime: 'Fecha y hora',
  contact: 'Tus datos',
  confirmation: 'Confirmación',
  success: 'Listo',
};

const STEP_ORDER: Step[] = ['experiences', 'datetime', 'contact', 'confirmation'];

// Inner component that uses useSearchParams (requires Suspense)
function BookingPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.companyId as string;
  const isEmbed = searchParams.get('embed') === '1';

  const [company, setCompany] = useState<Company | null>(null);
  const [experiences, setExperiences] = useState<BookingExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('experiences');
  const [booking, setBooking] = useState<Partial<BookingData>>({});
  const [reservationNumber, setReservationNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!companyId) {
      console.error('[BookingPage] companyId is empty, cannot load data.');
      setError('Enlace de reservas inválido.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const load = async () => {
      try {
        console.log('[BookingPage] Loading data for companyId:', companyId);
        const [companyData, expData] = await Promise.all([
          getCompanyById(companyId),
          getActiveExperiencesByCompany(companyId),
        ]);
        if (controller.signal.aborted) return;
        console.log('[BookingPage] Company:', companyData?.companyName ?? 'NOT FOUND');
        console.log('[BookingPage] Active experiences:', expData?.length ?? 0);
        if (!companyData) { setError('No se encontró la empresa.'); return; }
        setCompany(companyData);
        setExperiences(expData as BookingExperience[]);
      } catch (err) {
        if (controller.signal.aborted) {
          console.error('[BookingPage] Fetch timed out after 12s');
          setError('La carga tardó demasiado. Verifica tu conexión e intenta de nuevo.');
        } else {
          console.error('[BookingPage] Error loading booking page:', err);
          setError('Error al cargar la información. Intenta de nuevo más tarde.');
        }
      } finally {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [companyId]);

  const handleSelectExperience = (exp: BookingExperience) => {
    setBooking({ experience: exp });
    setStep('datetime');
  };

  const handleDateTimeNext = (
    date: Date,
    time: string,
    participants: number,
    locationId?: string,
    locationName?: string,
    selectedAddons?: SelectedAddon[],
  ) => {
    setBooking(prev => ({ ...prev, date, time, participants, locationId, locationName, selectedAddons }));
    setStep('contact');
  };

  const handleContactNext = (guestInfo: BookingData['guestInfo']) => {
    setBooking(prev => ({ ...prev, guestInfo }));
    setStep('confirmation');
  };

  const handleConfirm = async () => {
    if (!booking.experience || !booking.date || !booking.time || !booking.participants || !booking.guestInfo) return;
    setSubmitting(true);
    try {
      const [hours, minutes] = booking.time.split(':').map(Number);
      const reservationDate = new Date(booking.date);
      reservationDate.setHours(hours, minutes, 0, 0);

      const result = await createPublicReservation({
        experience: booking.experience._id,
        location: booking.locationId,
        reservationDate: reservationDate.toISOString(),
        participants: booking.participants,
        specialRequests: booking.guestInfo.notes,
        selectedAddons: booking.selectedAddons?.map(a => ({ name: a.name, price: a.price, quantity: a.quantity })),
        guestInfo: {
          name: booking.guestInfo.name,
          email: booking.guestInfo.email,
          phone: booking.guestInfo.phone,
        },
      });

      setReservationNumber(result.reservationNumber);
      setStep('success');
    } catch (err) {
      console.error('Error creating reservation:', err);
      alert('Ocurrió un error al crear la reserva. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepIndex = STEP_ORDER.indexOf(step);

  const companyLogoRef = company?.logo?.asset?._ref;

  const wrap = (content: React.ReactNode, options: { showHeader?: boolean } = {}) => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isEmbed && options.showHeader && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 min-w-0">
            {companyLogoRef ? (
              <Image
                src={getCompanyLogoUrl(companyLogoRef)}
                alt={company?.companyName ?? 'Logo de la empresa'}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full border border-gray-200 object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 shrink-0" />
            )}
            {company && (
              <span className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {company.companyName}
              </span>
            )}
          </div>
        </header>
      )}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {content}
      </div>
      {!isEmbed && (
        <footer className="border-t border-gray-200 bg-white">
          <a
            href="https://tenemosfilo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span>Powered by</span>
            <FiloLogo className="h-5 w-auto" />
          </a>
        </footer>
      )}
    </div>
  );

  if (loading) return wrap(
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  if (error) return wrap(
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
      <p className="text-red-500 font-medium mb-2">Algo salió mal</p>
      <p className="text-gray-500 text-sm">{error}</p>
    </div>
  );

  if (step === 'success') return wrap(
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva enviada!</h2>
      <p className="text-gray-500 mb-4">Tu solicitud fue recibida. El anfitrión la confirmará pronto.</p>
      <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-8 py-4 mb-6">
        <p className="text-xs text-gray-400 mb-1">Número de reserva</p>
        <p className="text-2xl font-bold text-[#F26726]">{reservationNumber}</p>
      </div>
      <p className="text-sm text-gray-400">
        Recibirás una confirmación en <strong>{booking.guestInfo?.email}</strong>
      </p>
      {!isEmbed && (
        <button
          onClick={() => { setStep('experiences'); setBooking({}); }}
          className="mt-8 text-sm text-[#F26726] hover:underline"
        >
          Hacer otra reserva
        </button>
      )}
    </div>,
    { showHeader: true }
  );

  return wrap(
    <>
      {/* Header empresa */}
      {step === 'experiences' && company && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-5 text-center sm:text-left">
          {companyLogoRef ? (
            <Image
              src={getCompanyLogoUrl(companyLogoRef)}
              alt={company.companyName}
              width={128}
              height={128}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-gray-200 object-cover mx-auto sm:mx-0 shrink-0 shadow-sm"
              priority
            />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gray-100 border border-gray-200 mx-auto sm:mx-0 shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{company.companyName}</h1>
            {(company as Company & { description?: string }).description && (
              <p className="text-gray-500 mt-2 text-sm sm:text-base leading-relaxed">
                {(company as Company & { description?: string }).description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stepper */}
      {step !== 'experiences' && (
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {STEP_ORDER.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-xs font-medium whitespace-nowrap ${
                i === currentStepIndex ? 'text-[#F26726]' :
                i < currentStepIndex ? 'text-green-600' : 'text-gray-400'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < currentStepIndex ? 'bg-green-500 text-white' :
                  i === currentStepIndex ? 'bg-[#F26726] text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i < currentStepIndex ? '✓' : i + 1}
                </span>
                {STEP_LABELS[s]}
              </div>
              {i < STEP_ORDER.length - 1 && (
                <div className={`flex-1 h-px min-w-4 ${i < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {step === 'experiences' && (
        <ExperienceList experiences={experiences} onSelect={handleSelectExperience} />
      )}
      {step === 'datetime' && booking.experience && (
        <DateTimeStep
          experience={booking.experience}
          onNext={handleDateTimeNext}
          onBack={() => setStep('experiences')}
        />
      )}
      {step === 'contact' && (
        <ContactStep onNext={handleContactNext} onBack={() => setStep('datetime')} />
      )}
      {step === 'confirmation' && booking.experience && booking.date && booking.time && booking.participants && booking.guestInfo && (
        <ConfirmationStep
          booking={booking as BookingData}
          submitting={submitting}
          onConfirm={handleConfirm}
          onBack={() => setStep('contact')}
        />
      )}
    </>,
    { showHeader: step !== 'experiences' }
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    }>
      <BookingPageInner />
    </Suspense>
  );
}
