"use client";

import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Cerrar sesión desde pantallas sin menú (el registro de la empresa, el paso
 * de pago). Sin esto, quien se registró con el correo equivocado no tendría
 * cómo salir: el panel, que es donde está el botón, no le deja entrar.
 */
export default function SalirDeLaSesion() {
  const { logout } = useAuth();
  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="text-sm text-gray-500 underline transition-colors hover:text-[#F26726]"
    >
      Cerrar sesión
    </button>
  );
}
