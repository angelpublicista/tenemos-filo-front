"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { BsSun, BsMoon } from 'react-icons/bs';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
      aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      {theme === 'light' ? (
        <BsMoon className="w-5 h-5 text-gray-700" />
      ) : (
        <BsSun className="w-5 h-5 text-yellow-400" />
      )}
    </button>
  );
}

