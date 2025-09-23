"use client";

import React from 'react';
import { HiRefresh } from 'react-icons/hi';

interface LoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Loader({ 
  message = "Cargando...", 
  size = 'md',
  className = ""
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="text-center">
        <HiRefresh 
          className={`${sizeClasses[size]} text-[#F26726] animate-spin mx-auto mb-4`} 
        />
        <p className={`text-gray-600 ${textSizeClasses[size]}`}>
          {message}
        </p>
      </div>
    </div>
  );
}
