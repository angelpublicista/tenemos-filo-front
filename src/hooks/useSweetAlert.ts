"use client";

import { useCallback } from 'react';
import Swal from 'sweetalert2';

interface AlertOptions {
  title?: string;
  text?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
}

export const useSweetAlert = () => {
  const showAlert = useCallback(async (options: AlertOptions) => {
    const result = await Swal.fire({
      title: options.title || 'Información',
      text: options.text || '',
      icon: options.icon || 'info',
      confirmButtonText: options.confirmButtonText || 'OK',
      confirmButtonColor: options.confirmButtonColor || '#F26726',
      cancelButtonColor: options.cancelButtonColor || '#334C5D',
      showCancelButton: options.showCancelButton || false,
      cancelButtonText: options.cancelButtonText || 'Cancelar',
      customClass: {
        popup: 'rounded-lg',
        title: 'text-[#334C5D] font-semibold',
        htmlContainer: 'text-gray-600',
        confirmButton: 'rounded-lg px-6 py-2 font-medium',
        cancelButton: 'rounded-lg px-6 py-2 font-medium'
      }
    });
    return result;
  }, []);

  const showSuccess = useCallback(async (title: string, text?: string) => {
    return showAlert({
      title,
      text,
      icon: 'success',
      confirmButtonText: '¡Perfecto!'
    });
  }, [showAlert]);

  const showError = useCallback(async (title: string, text?: string) => {
    return showAlert({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
  }, [showAlert]);

  const showWarning = useCallback(async (title: string, text?: string) => {
    return showAlert({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'Entendido'
    });
  }, [showAlert]);

  const showConfirmation = useCallback(async (
    title: string, 
    text: string, 
    confirmText: string = 'Sí, continuar',
    cancelText: string = 'Cancelar'
  ): Promise<boolean> => {
    const result = await showAlert({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });
    return result.isConfirmed;
  }, [showAlert]);

  const showLoading = useCallback(async (title: string = 'Procesando...') => {
    Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
      customClass: {
        popup: 'rounded-lg',
        title: 'text-[#334C5D] font-semibold'
      }
    });
  }, []);

  const hideLoading = useCallback(() => {
    Swal.close();
  }, []);

  return {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showConfirmation,
    showLoading,
    hideLoading
  };
};

