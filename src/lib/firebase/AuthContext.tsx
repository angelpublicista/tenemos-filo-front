// src/lib/firebase/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useRouter } from "next/navigation";
import { createUserInSanity, getUserByFirebaseId } from "../sanity/userService";
import { AuthContextType, CreateUserData, SanityUser } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sanityUser, setSanityUser] = useState<SanityUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      
      if (currentUser) {
        // Si hay un usuario de Firebase, obtener los datos de Sanity
        await fetchSanityUser(currentUser);
      } else {
        setSanityUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Verificar si el usuario está activo en Sanity
      const userData = await fetchSanityUser(userCredential.user);
      
      if (!userData) {
        await signOut(auth);
        throw new Error('Usuario no encontrado en la base de datos');
      }
      
      if (!userData.isActive) {
        await signOut(auth);
        throw new Error('Tu cuenta está pendiente de activación. Por favor, contacta al administrador.');
      }
      
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setSanityUser(null);
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, password: string, userData: Omit<CreateUserData, 'firebaseId'>) => {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crear usuario en Sanity con los datos adicionales
      const sanityUserData: CreateUserData = {
        firebaseId: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
      };
      
      await createUserInSanity(sanityUserData);
      
      // No redirigir automáticamente al dashboard ya que el usuario no está activo
      await signOut(auth);
      router.push('/login?message=registration-success');
      
      return userCredential;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ user, sanityUser, loading, login, logout, register, resetPassword }}>
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