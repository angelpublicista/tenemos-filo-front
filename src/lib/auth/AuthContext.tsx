// Reemplazo del AuthContext de Firebase. Conserva la misma API publica
// (useAuth, AuthProvider, mismos campos en user/sanityUser) pero esta
// powered by NextAuth + el API propio (tenemosfilo-api).
//
// Migracion clave:
// - `user` ya no es Firebase User; es { uid, email, emailVerified }
// - `sanityUser` se popula desde GET /users/me (no Sanity ya, pero
//   conservamos el nombre por compatibilidad con los 44+ callers).
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, ApiHttpError } from "@/lib/api/client";
import { useCompanySetup } from "@/hooks/useCompanySetup";
import type { AuthContextType, AuthUser, CreateUserData, SanityUser } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  role: "HOST" | "GUEST" | "ADMIN";
  image: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const ROLE_DOWN: Record<ApiUser["role"], SanityUser["role"]> = {
  HOST: "host",
  GUEST: "guest",
  ADMIN: "admin",
};

const ROLE_UP: Record<NonNullable<CreateUserData["role"]>, ApiUser["role"]> = {
  host: "HOST",
  guest: "GUEST",
  admin: "ADMIN",
};

function toSanityUser(u: ApiUser): SanityUser {
  return {
    _id: u.id,
    _type: "user",
    firebaseId: u.id, // alias por compat — antes era firebase uid, ahora es id Postgres
    name: u.name ?? "",
    email: u.email,
    role: ROLE_DOWN[u.role],
    phone: u.phone ?? "",
    typeDocument: (u.documentType as SanityUser["typeDocument"]) ?? "cedula",
    documentNumber: u.documentNumber ?? "",
    companyId: u.companyId ?? undefined,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { companySetupState, markSetupCompleted, clearSetupState, isSetupCompleted, hasCompany } =
    useCompanySetup();

  const [sanityUser, setSanityUser] = useState<SanityUser | null>(null);
  // Arranca true: hasta que sepamos si hay sesion no podemos decir que
  // "no hay perfil". Esto evita que ProtectedRoute redirija a /login
  // durante el primer render despues de un page reload.
  const [profileLoading, setProfileLoading] = useState(true);
  const lastFetchedFor = useRef<string | null>(null);

  const user: AuthUser | null = session?.user
    ? {
        uid: session.user.id,
        email: session.user.email ?? null,
        // NextAuth con Credentials no expone emailVerified todavia.
        // Asumimos verificado para no bloquear el dashboard.
        emailVerified: true,
      }
    : null;

  // Carga el perfil completo desde el API cuando hay sesion activa.
  useEffect(() => {
    let cancelled = false;

    // NextAuth todavia resolviendo la cookie: mantenemos el loader.
    if (status === "loading") {
      setProfileLoading(true);
      return;
    }

    if (status === "unauthenticated" || !session?.user?.id) {
      setSanityUser(null);
      lastFetchedFor.current = null;
      setProfileLoading(false);
      return;
    }

    // Ya fetched para este user: nada que hacer.
    if (lastFetchedFor.current === session.user.id) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    api
      .get<ApiUser>("/users/me")
      .then((u) => {
        if (cancelled) return;
        lastFetchedFor.current = u.id;
        const mapped = toSanityUser(u);
        setSanityUser(mapped);
        if (mapped.companyId) markSetupCompleted(mapped.companyId);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error cargando perfil del API:", err);
        setSanityUser(null);
        // Solo cerramos sesion si el token quedo invalido o el user fue borrado.
        // Errores de red transitorios NO deben sacar al usuario.
        if (err instanceof ApiHttpError && (err.status === 401 || err.status === 404)) {
          void signOut({ redirect: false });
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, markSetupCompleted]);

  const loading = status === "loading" || (status === "authenticated" && profileLoading);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res || res.error) {
        throw new Error("Credenciales incorrectas. Verifica tu email y contraseña.");
      }
      // Necesitamos el perfil para decidir el redirect; lo pedimos directamente.
      let profile: ApiUser;
      try {
        profile = await api.get<ApiUser>("/users/me");
      } catch {
        throw new Error("No se pudo cargar tu perfil. Intenta de nuevo.");
      }
      if (!profile.isActive) {
        await signOut({ redirect: false });
        throw new Error("Tu cuenta esta inactiva. Contacta al administrador.");
      }
      const mapped = toSanityUser(profile);
      setSanityUser(mapped);
      lastFetchedFor.current = mapped._id;

      const hasSetup = !!mapped.companyId;
      if (hasSetup) markSetupCompleted(mapped.companyId);

      if (mapped.role === "host" && !hasSetup) {
        router.push("/company-setup");
        return;
      }
      router.push("/dashboard");
    },
    [router, markSetupCompleted],
  );

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    setSanityUser(null);
    lastFetchedFor.current = null;
    clearSetupState();
    router.push("/login");
  }, [router, clearSetupState]);

  const register = useCallback(
    async (email: string, password: string, userData: Omit<CreateUserData, "firebaseId">) => {
      try {
        await api.post<ApiUser>("/auth/register", {
          email,
          password,
          name: userData.name,
          phone: userData.phone,
          role: ROLE_UP[userData.role],
          documentType: userData.typeDocument,
          documentNumber: userData.documentNumber,
        });
      } catch (err) {
        if (err instanceof ApiHttpError && err.status === 409) {
          throw new Error("Ya existe una cuenta con ese email.");
        }
        throw new Error(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      }

      // Auto-login despues del registro
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (!signInRes || signInRes.error) {
        // Cuenta creada pero login fallo: que el usuario lo intente desde /login
        router.push("/login?message=registration-success");
        return { user: { uid: email } };
      }

      // Devolvemos shape compatible con el viejo register()
      // (callers solo usan .user.uid; el id real lo obtiene el efecto via /users/me)
      router.push("/dashboard");
      return { user: { uid: email } };
    },
    [router],
  );

  const resetPassword = useCallback(async (_email: string) => {
    void _email;
    throw new Error("Recuperacion de contraseña aun no migrada al nuevo backend.");
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    // Stub: el API no maneja verificacion de email todavia.
    return { success: true, message: "Verificacion de email no requerida en esta version." };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        sanityUser,
        loading,
        login,
        logout,
        register,
        resetPassword,
        sendVerificationEmail,
        markSetupCompleted,
        clearSetupState,
        isSetupCompleted,
        hasCompany,
        companySetupState,
      }}
    >
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
