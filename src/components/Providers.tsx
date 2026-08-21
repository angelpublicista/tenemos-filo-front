"use client";

import { ReactNode } from 'react';
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as FlowbiteThemeProvider, createTheme } from "flowbite-react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

/**
 * Jerarquia de botones.
 *
 * Cuatro niveles, no once colores sueltos. La regla es que en cada pantalla
 * haya UNA accion primaria: si todo grita, nada se oye.
 *
 *   primary    la accion que la pantalla existe para hacer
 *   secondary  acciones frecuentes de apoyo (editar, filtrar, cancelar)
 *   ghost      acciones de baja frecuencia, sin peso visual
 *   danger     destructivas — con borde, no rellenas: borrar no debe
 *              llamar mas la atencion que la accion principal. El rojo
 *              solido se reserva para confirmar dentro del modal
 *   selected   estado activo de un grupo de opciones (mes/semana/dia).
 *              Va en gris a proposito: si el toggle usa el naranja de
 *              marca, el naranja deja de significar "accion principal"
 *
 * `gray` queda como alias de `secondary` porque es el color historico en
 * la mayor parte del codigo y renombrarlo de golpe en 100 sitios daria
 * mas ruido que valor.
 */
const secundario =
  "bg-white border border-gray-300 text-[#334C5D] hover:bg-gray-50 hover:border-gray-400 transition dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700";

const customTheme = createTheme({
  mode: 'light',
  button: {
    // Sin padding aqui: lo pone `size`. Con un `p-6` fijo todos los
    // botones acababan del mismo tamaño y `size="xs"` no hacia nada.
    base: "rounded-full font-medium cursor-pointer focus:ring-2 focus:ring-[#F26726]/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
    color: {
      primary: "bg-[#F26726] text-white hover:bg-[#E05617] shadow-sm transition",
      secondary: secundario,
      // Alias historicos: los dos se usaban como "secundario" por todo el
      // codigo, con estilos distintos. Ahora son el mismo boton.
      gray: secundario,
      light: secundario,
      ghost: "bg-transparent text-[#334C5D] hover:bg-gray-100 transition dark:text-gray-200 dark:hover:bg-gray-700",
      danger: "bg-white border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition dark:bg-gray-800 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-500/10",
      // Solo para confirmar una destructiva ya elegida.
      dangerSolid: "bg-red-600 text-white hover:bg-red-700 shadow-sm transition",
      selected: "bg-[#334C5D] text-white hover:bg-[#2a3d4a] transition",
    },
    size: {
      xs: "px-3 py-1.5 text-xs",
      sm: "px-4 py-2 text-sm",
      md: "px-5 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
      xl: "px-7 py-3.5 text-base",
    },
  },
  card: {
    root: {
      base: "flex rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800",
      children: "flex h-full flex-col gap-3 p-4",
    },
  },
  textInput: {
    field: {
      input: {
        base: "rounded-sm",
        colors: {
          white: "bg-white text-[#334C5D] border-gray-300 focus:border-[#F26726] focus:ring-[#F26726]",
        },
      }
    }
  },
  label: {
    root: {
      base: "text-sm",
      colors: {
        gray: "text-[#334C5D]",
      },
    },
  },
  checkbox: {
    root: {
      base: "rounded-sm",
    },
    color: {
      white: "text-[#334C5D] bg-white",
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <FlowbiteThemeProvider theme={customTheme}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </FlowbiteThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

