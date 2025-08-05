// src/lib/firebase/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useRouter } from "next/navigation";
import { createUserInSanity } from "../sanity/userService";
import { AuthContextType, CreateUserData } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard'); // Redirigir al dashboard después del login
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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
             
             router.push('/dashboard'); // Redirigir al dashboard después del registro
             
             return userCredential; // Retornar el UserCredential
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
    <AuthContext.Provider value={{ user, loading, login, logout, register, resetPassword }}>
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