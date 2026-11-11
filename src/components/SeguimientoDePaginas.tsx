"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { evento } from "@/lib/analytics";

/**
 * Un `page_view` en cada cambio de ruta.
 *
 * En una app de una sola página el navegador no recarga al navegar, así que el
 * disparador de «página vista» de GTM se queda en la primera. Esto manda uno por
 * cada pantalla, la primera incluida.
 *
 * Solo la ruta, sin la cadena de consulta: ahí viajan los tokens de recuperar
 * contraseña, verificar el correo y los enlaces de reserva.
 */
export default function SeguimientoDePaginas() {
  const ruta = usePathname();

  useEffect(() => {
    if (!ruta) return;
    evento("page_view", { page_path: ruta, page_title: document.title });
  }, [ruta]);

  return null;
}
