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
  button: {
    base: "rounded-full p-6 cursor-pointer",
    color: {
      primary: "bg-[#f26726] text-white hover:bg-[#f26726]/80 transition",
      gray: "bg-gray-200 text-gray-700 hover:bg-gray-300 transition",
    }
  },
  textInput: {
    field: {
      input: {
        base: "rounded-sm",
        colors: {
          white: "bg-white text-gray-500 border-gray-300",
        },
      }
    }
  },
  label: {
    root: {
      base: "text-sm",
      colors: {
        gray: "text-gray-600",
      },
    },
  },
  checkbox: {
    root: {
      base: "rounded-sm",
    },
    color: {
      white: "text-gray-600 bg-white",
    },
  },
});

export const metadata: Metadata = {
  title: "Tenemos Filo",
  description: "Plataforma de eventos gastronómicos",
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
