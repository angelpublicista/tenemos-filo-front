"use client";

import { useCallback } from 'react';
import Swal from 'sweetalert2';

interface AlertOptions {
  title?: string;
  text?: string;
  /**
   * Cuerpo con saltos de linea respetados. `text` los colapsa en un parrafo,
   * que para una lista de campos detectados es ilegible. Se escapa antes de
   * pintarlo: lo que entra aqui puede venir de un documento de terceros.
   */
  lineas?: string[];
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
}

export const useSweetAlert = () => {
  const showAlert = useCallback(async (options: AlertOptions) => {
    // Lo que llega en `lineas` puede venir de un documento leido por IA, asi
    // que se escapa: nadie va a inyectar HTML desde un RUT, pero el coste de
    // evitarlo es una funcion de cuatro lineas.
    const escapar = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const result = await Swal.fire({
      title: options.title || 'Información',
      ...(options.lineas?.length
        ? { html: options.lineas.map(escapar).join('<br>') }
        : { text: options.text || '' }),
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
    cancelText: string = 'Cancelar',
    lineas?: string[]
  ): Promise<boolean> => {
    const result = await showAlert({
      title,
      text,
      lineas,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });
    return result.isConfirmed;
  }, [showAlert]);

  /**
   * Confirmacion de algo que no se puede deshacer.
   *
   * Aqui si va el rojo solido: es el unico punto del flujo donde el usuario
   * ya eligio borrar y hay que dejarle claro que confirma eso y no otra
   * cosa. En las listas, el boton de borrar va discreto.
   */
  const showDestructiveConfirmation = useCallback(async (
    title: string,
    text: string,
    confirmText: string = 'Sí, eliminar',
    cancelText: string = 'Cancelar'
  ): Promise<boolean> => {
    const result = await showAlert({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#DC2626',
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
    showDestructiveConfirmation,
    showLoading,
    hideLoading
  };
};

