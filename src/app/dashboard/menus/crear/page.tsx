"use client";

import ProtectedRoute from '@/components/ProtectedRoute';
import MenuForm from '@/components/MenuForm';

export default function CrearMenuPage() {
  return (
    <ProtectedRoute>
      <MenuForm menu={null} />
    </ProtectedRoute>
  );
}
