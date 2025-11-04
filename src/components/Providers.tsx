"use client";

import { ReactNode } from 'react';
import { ThemeProvider as FlowbiteThemeProvider, createTheme } from "flowbite-react";
import { AuthProvider } from "@/lib/firebase/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const customTheme = createTheme({
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

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <FlowbiteThemeProvider theme={customTheme}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </FlowbiteThemeProvider>
    </ThemeProvider>
  );
}

