"use client";

import React, { Suspense } from 'react';
import { MotorReservas } from '@/components/BookingEngine/MotorReservas';
import { SkeletonCard } from '@/components/Skeleton';

function Cargando() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <MotorReservas />
    </Suspense>
  );
}
