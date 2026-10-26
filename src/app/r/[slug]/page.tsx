"use client";

// Catalogo de un revendedor: /r/<slug>
//
// Mismo motor de reservas que el catalogo de un anfitrion, con dos
// diferencias: las experiencias son las de toda la plataforma, y cada
// reserva se atribuye al revendedor del enlace.
import React, { Suspense } from 'react';
import { MotorReservas } from '@/components/BookingEngine/MotorReservas';
import { SkeletonCard } from '@/components/Skeleton';

export default function CatalogoRevendedor() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      }
    >
      <MotorReservas modoReseller />
    </Suspense>
  );
}
