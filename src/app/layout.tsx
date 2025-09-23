import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider, createTheme } from "flowbite-react";
import { AuthProvider } from "@/lib/firebase/AuthContext";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const customTheme = createTheme({
  // Configurar tema claro por defecto
  mode: 'light',
  button: {
    base: "rounded-full p-6 cursor-pointer",
    color: {
      primary: "bg-[#F26726] text-white hover:bg-[#F26726]/80 transition",
      gray: "bg-gray-200 text-[#334C5D] hover:bg-gray-300 transition",
    }
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

export const metadata: Metadata = {
  title: "Tenemos Filo",
  description: "Plataforma de experiencias gastronómicas",
};

// Configuración para evitar prerenderización
export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${poppins.variable} antialiased`}
      >
        <ThemeProvider theme={customTheme}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
