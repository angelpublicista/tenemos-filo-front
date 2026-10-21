"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import Loader from '@/components/Loader';
import { getSuscripcion } from '@/lib/api/subscription';

/** La única pantalla que sigue abierta con la suscripción vencida. */
export const RUTA_DE_SUSCRIPCION = '/dashboard/suscripcion';

interface Props {
  /** El panel completo, cuando la suscripción está al día. */
  children: React.ReactNode;
  /** Lo que se enseña en lugar del panel cuando está vencida: sin menú. */
  bloqueado: React.ReactNode;
}

/**
 * Cierra el panel del anfitrión con la suscripción vencida.
 *
 * Decide aquí, antes de pintar nada, para que no se vea el panel un instante
 * y luego se lo quiten. Solo aplica a un anfitrión: el administrador y el
 * revendedor no pagan suscripción. El API cierra además todas sus rutas con un
 * 402, así que esto es la cara de esa regla y no la regla.
 */
export default function GuardiaDeSuscripcion({ children, bloqueado }: Props) {
  const { sanityUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const esAnfitrion = sanityUser?.role === 'host';

  // null = todavía no se sabe. Se vuelve a preguntar al cambiar de pantalla:
  // un pago hecho en otra pestaña o un vencimiento a mitad de sesión se notan
  // al siguiente clic, no al siguiente inicio de sesión.
  const [consultada, setBloqueada] = useState<boolean | null>(null);
  // Quien no es anfitrion nunca esta bloqueado, y no hay nada que consultar.
  const bloqueada = esAnfitrion ? consultada : false;

  useEffect(() => {
    if (!esAnfitrion) return;
    let vivo = true;
    getSuscripcion()
      .then((s) => vivo && setBloqueada(s.bloqueada))
      // Un fallo al consultar no puede cerrarle el panel a quien sí pagó.
      .catch(() => vivo && setBloqueada(false));
    return () => {
      vivo = false;
    };
  }, [esAnfitrion, pathname]);

  const enLaPantallaDePago = pathname === RUTA_DE_SUSCRIPCION;

  useEffect(() => {
    if (bloqueada && !enLaPantallaDePago) router.replace(RUTA_DE_SUSCRIPCION);
  }, [bloqueada, enLaPantallaDePago, router]);

  if (esAnfitrion && (bloqueada === null || (bloqueada && !enLaPantallaDePago))) {
    return <Loader message="Cargando..." className="min-h-screen" />;
  }
  return <>{bloqueada ? bloqueado : children}</>;
}
