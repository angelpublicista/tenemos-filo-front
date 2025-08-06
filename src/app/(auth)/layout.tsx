import { Suspense } from 'react';

// Configuración para evitar prerenderización en todas las rutas de autenticación
export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      {children}
    </Suspense>
  );
}
