"use client";

import ProtectedRoute from '@/components/ProtectedRoute';
import MenuForm from '@/components/MenuForm';

export default function CrearMenuPage() {
  return (
    <ProtectedRoute roles={['host', 'admin']}>
      <MenuForm menu={null} />
    </ProtectedRoute>
  );
}
