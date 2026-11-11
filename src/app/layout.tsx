import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import GoogleTagManager from "@/components/GoogleTagManager";
import SeguimientoDePaginas from "@/components/SeguimientoDePaginas";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="es" suppressHydrationWarning className={poppins.variable}>
      <body
        className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
      >
        {/* Primero en el body, que es donde GTM pide su noscript. Sin
            NEXT_PUBLIC_GTM_ID no se pinta nada. */}
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID ?? ''} />
        <SeguimientoDePaginas />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
