"use client";

// Una publicación del catálogo con su propia URL: /book/<empresa>/<publicacion>
//
// Es la misma página del catálogo, pero entra directo en una experiencia y una
// sede. El motor lee el segmento `publicacion` de la ruta.
import React, { Suspense } from 'react';
import { MotorReservas } from '@/components/BookingEngine/MotorReservas';
import { SkeletonCard } from '@/components/Skeleton';

export default function PublicacionPage() {
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
      <MotorReservas />
    </Suspense>
  );
}
