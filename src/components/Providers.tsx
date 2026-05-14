"use client";

import { ReactNode } from 'react';
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as FlowbiteThemeProvider, createTheme } from "flowbite-react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const customTheme = createTheme({
  mode: 'light',
  button: {
    base: "rounded-full p-6 cursor-pointer",
    color: {
      primary: "bg-[#F26726] text-white hover:bg-[#F26726]/80 transition",
      gray: "bg-white border border-gray-300 text-[#334C5D] hover:bg-gray-50 transition dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700",
      ghost: "bg-transparent text-[#334C5D] hover:bg-gray-100 transition dark:text-gray-200 dark:hover:bg-gray-700",
    }
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

