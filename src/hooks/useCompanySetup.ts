"use client";

import { useState, useEffect } from 'react';

interface CompanySetupState {
  hasCompletedSetup: boolean;
  companyId?: string;
  lastUpdated: string;
}

const COMPANY_SETUP_KEY = 'companySetupState';

export const useCompanySetup = () => {
  const [companySetupState, setCompanySetupState] = useState<CompanySetupState | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar estado desde localStorage al inicializar
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(COMPANY_SETUP_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setCompanySetupState(parsedState);
      }
    } catch (error) {
      console.error('Error loading company setup state from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para marcar el setup como completado
  const markSetupCompleted = (companyId?: string) => {
    const newState: CompanySetupState = {
      hasCompletedSetup: true,
      companyId: companyId || undefined,
      lastUpdated: new Date().toISOString()
    };

    try {
      localStorage.setItem(COMPANY_SETUP_KEY, JSON.stringify(newState));
      setCompanySetupState(newState);
    } catch (error) {
      console.error('Error saving company setup state to localStorage:', error);
    }
  };

  // Función para marcar el setup como no completado
  const markSetupIncomplete = () => {
    const newState: CompanySetupState = {
      hasCompletedSetup: false,
      lastUpdated: new Date().toISOString()
    };

    try {
      localStorage.setItem(COMPANY_SETUP_KEY, JSON.stringify(newState));
      setCompanySetupState(newState);
    } catch (error) {
      console.error('Error saving company setup state to localStorage:', error);
    }
  };

  // Función para limpiar el estado (logout)
  const clearSetupState = () => {
    try {
      localStorage.removeItem(COMPANY_SETUP_KEY);
      setCompanySetupState(null);
    } catch (error) {
      console.error('Error clearing company setup state from localStorage:', error);
    }
  };

  // Función para verificar si el setup está completado
  const isSetupCompleted = () => {
    return companySetupState?.hasCompletedSetup || false;
  };

  // Función para verificar si tiene empresa asociada
  const hasCompany = () => {
    return !!(companySetupState?.hasCompletedSetup && companySetupState?.companyId);
  };

  return {
    companySetupState,
    loading,
    markSetupCompleted,
    markSetupIncomplete,
    clearSetupState,
    isSetupCompleted,
    hasCompany
  };
};
