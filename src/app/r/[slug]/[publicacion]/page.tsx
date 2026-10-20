"use client";

// Una publicación vista desde un revendedor: /r/<revendedor>/<publicacion>
//
// La venta se atribuye al revendedor del enlace, igual que en su catálogo.
import React, { Suspense } from 'react';
import { MotorReservas } from '@/components/BookingEngine/MotorReservas';
import { SkeletonCard } from '@/components/Skeleton';

export default function PublicacionDeRevendedorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
            <SkeletonCard />
          </div>
        </div>
      }
    >
      <MotorReservas modoReseller />
    </Suspense>
  );
}
