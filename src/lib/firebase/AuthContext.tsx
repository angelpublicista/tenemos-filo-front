// src/lib/firebase/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, UserCredential } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useRouter } from "next/navigation";
import { createUserInSanity, getUserByFirebaseId } from "../sanity/userService";
import { AuthContextType, CreateUserData, SanityUser } from "@/types";
import { getTranslatedFirebaseError } from "./firebaseErrors";
import { useCompanySetup } from "@/hooks/useCompanySetup";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sanityUser, setSanityUser] = useState<SanityUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const { companySetupState, markSetupCompleted, clearSetupState, isSetupCompleted, hasCompany } = useCompanySetup();

  // Función para obtener y verificar el usuario de Sanity
  const fetchSanityUser = async (firebaseUser: User) => {
    try {
      const userData = await getUserByFirebaseId(firebaseUser.uid);
      setSanityUser(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching Sanity user:', error);
      setSanityUser(null);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && !isRegistering) {
        // Si hay un usuario de Firebase y no está en proceso de registro, obtener los datos de Sanity
        const userData = await fetchSanityUser(currentUser);
        
        // Sincronizar estado de company setup con Sanity
        if (userData && userData.companyId) {
          markSetupCompleted(userData.companyId);
        }
      } else if (!currentUser) {
        setSanityUser(null);
      }
      
      // Solo marcar como no cargando si no estamos en proceso de registro
      if (!isRegistering) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isRegistering]);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Verificar si el usuario existe en Sanity
      const userData = await fetchSanityUser(userCredential.user);
      
      if (!userData) {
        await signOut(auth);
        throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
      }
      
      // Verificar si el usuario necesita completar la configuración de empresa
      // Verificar desde Sanity si tiene companyId asociado (fuente de verdad)
      const hasCompletedSetup = !!(userData.companyId);
      
      // Si tiene empresa en Sanity, actualizar localStorage
      if (hasCompletedSetup) {
        markSetupCompleted(userData.companyId);
      }
      
      if (userData.role === 'host' && !hasCompletedSetup) {
        router.push('/company-setup');
        return;
      }
      
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = getTranslatedFirebaseError(error);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setSanityUser(null);
      clearSetupState(); // Limpiar el estado de company setup del localStorage
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = getTranslatedFirebaseError(error);
      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, password: string, userData: Omit<CreateUserData, 'firebaseId'>) => {
    let userCredential: UserCredential | null = null;
    
    try {
      // Marcar que estamos en proceso de registro
      setIsRegistering(true);
      
      // Crear usuario en Firebase Auth
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crear usuario en Sanity con los datos adicionales
      const sanityUserData: CreateUserData = {
        firebaseId: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        typeDocument: userData.typeDocument,
        documentNumber: userData.documentNumber,
      };
      
      await createUserInSanity(sanityUserData);
      
      // Enviar email de verificación de Firebase
      try {
        await sendEmailVerification(userCredential.user);
        console.log('Email de verificación de Firebase enviado');
      } catch (verificationError) {
        console.error('Error enviando email de verificación de Firebase:', verificationError);
        // Log detallado para debugging
        if (verificationError && typeof verificationError === 'object' && 'code' in verificationError) {
          console.error('Código de error Firebase:', verificationError.code);
          if (verificationError.code === 'auth/unauthorized-domain') {
            console.error('SOLUCIÓN: Agrega el dominio actual a los dominios autorizados en Firebase Console > Authentication > Settings > Authorized domains');
          }
        }
        // No fallar el registro si el email de verificación falla
      }

      // Obtener el usuario de Sanity para establecer el estado
      await fetchSanityUser(userCredential.user);
      
      // Enviar email de bienvenida
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'welcome',
            email: userData.email,
            name: userData.name,
            role: userData.role,
            // Probar plantillas de Brevo con el fix del sender
            useTemplate: true,
            templateId: Number(process.env.BREVO_TEMPLATE_WELCOME_ID) || 1
          }),
        });
      } catch (emailError) {
        console.error('Error enviando email de bienvenida:', emailError);
        // No fallar el registro si el email falla
      }
      
      // Marcar que ya no estamos en proceso de registro
      setIsRegistering(false);
      setLoading(false);
      
      // Los usuarios se crean activos por defecto, redirigir al dashboard después de un breve delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
      
      return userCredential;
    } catch (error: unknown) {
      // Marcar que ya no estamos en proceso de registro
      setIsRegistering(false);
      setLoading(false);
      
      // Si hay un error en Sanity, eliminar el usuario de Firebase
      if (error instanceof Error && (error.message.includes('email') || error.message.includes('documento'))) {
        // Intentar eliminar el usuario de Firebase si ya se creó
        try {
          if (userCredential?.user) {
            await userCredential.user.delete();
          }
        } catch (firebaseError) {
          console.error('Error deleting Firebase user after Sanity error:', firebaseError);
        }
      }
      
      const errorMessage = getTranslatedFirebaseError(error);
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      const errorMessage = getTranslatedFirebaseError(error);
      throw new Error(errorMessage);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      
      if (user.emailVerified) {
        throw new Error('El email ya está verificado');
      }

      console.log('Enviando email de verificación desde dominio:', window.location.hostname);
      await sendEmailVerification(user);
      return { success: true, message: 'Email de verificación enviado correctamente' };
    } catch (error: unknown) {
      console.error('Error detallado en sendVerificationEmail:', error);
      // Log específico para errores de dominio
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/unauthorized-domain') {
        console.error('DOMINIO NO AUTORIZADO:', window.location.hostname);
        console.error('SOLUCIÓN: Agrega este dominio a Firebase Console > Authentication > Settings > Authorized domains');
      }
      const errorMessage = getTranslatedFirebaseError(error);
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      sanityUser, 
      loading, 
      login, 
      logout, 
      register, 
      resetPassword, 
      sendVerificationEmail,
      // Funciones de company setup
      markSetupCompleted,
      clearSetupState,
      isSetupCompleted,
      hasCompany,
      companySetupState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};