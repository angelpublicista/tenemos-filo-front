// Reemplazo del AuthContext de Firebase. Conserva la misma API publica
// (useAuth, AuthProvider, mismos campos en user/sanityUser) pero esta
// powered by NextAuth + el API propio (tenemosfilo-api).
//
// Migracion clave:
// - `user` ya no es Firebase User; es { uid, email, emailVerified }
// - `sanityUser` se popula desde GET /users/me (no Sanity ya, pero
//   conservamos el nombre por compatibilidad con los 44+ callers).
"use client";

import { CLAVE_DE_VUELTA } from "@/lib/api/mcp";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, ApiHttpError } from "@/lib/api/client";
import { getActingCompany, setActingCompany, setActingOwnerRole } from "@/lib/api/actingCompany";
import { useCompanySetup } from "@/hooks/useCompanySetup";
import type { AuthContextType, AuthUser, CreateUserData, SanityUser } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rutas de recuperacion de contraseña en el API. Si el backend las expone con
// otros nombres, este es el unico sitio a tocar.
//   POST {FORGOT_PASSWORD_PATH}  body { email }             -> 204/200
//   POST {RESET_PASSWORD_PATH}   body { token, password }   -> 204/200
const FORGOT_PASSWORD_PATH = "/auth/forgot-password";
const RESET_PASSWORD_PATH = "/auth/reset-password";

type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  role: "HOST" | "GUEST" | "ADMIN" | "RESELLER";
  image: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Debe cubrir los 4 valores del enum UserRole del API. Si falta uno, el
// lookup devuelve undefined y el usuario queda sin rol en todo el front.
const ROLE_DOWN: Record<ApiUser["role"], SanityUser["role"]> = {
  HOST: "host",
  GUEST: "guest",
  ADMIN: "admin",
  RESELLER: "reseller",
};

// Solo roles auto-registrables: el API rechaza ADMIN en /auth/register.
const ROLE_UP: Record<NonNullable<CreateUserData["role"]>, ApiUser["role"]> = {
  host: "HOST",
  guest: "GUEST",
};

function toSanityUser(u: ApiUser): SanityUser {
  return {
    _id: u.id,
    _type: "user",
    firebaseId: u.id, // alias por compat — antes era firebase uid, ahora es id Postgres
    name: u.name ?? "",
    email: u.email,
    image: u.image ?? undefined,
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
  // Empresa en la que trabaja un anfitrion con varias. Siempre null para el admin.
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
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

  // Rehidrata la empresa activa del storage. Solo aplica al anfitrion con
  // varias empresas (elige en cual trabaja). Un admin nunca opera como otra
  // empresa: si le quedo una guardada de antes, se descarta para que el
  // cliente HTTP deje de anunciarla.
  useEffect(() => {
    const rol = sanityUser?.role;
    if (rol === "admin") {
      setActingCompany(null);
      setActingOwnerRole(null);
      return;
    }
    if (rol !== "host") return;
    setActiveCompanyIdState(getActingCompany());
  }, [sanityUser?.role]);

  /**
   * Vuelve a leer el perfil del API.
   *
   * Hace falta cuando algo del usuario cambia fuera del flujo normal —la foto
   * de perfil, por ejemplo—: sin esto el avatar de la barra seguiria mostrando
   * lo anterior hasta recargar la pagina.
   */
  const refrescarPerfil = useCallback(async () => {
    try {
      const u = await api.get<ApiUser>("/users/me");
      setSanityUser(toSanityUser(u));
    } catch (err) {
      // Que falle el refresco no debe romper lo que acaba de hacer la persona:
      // el cambio ya se guardo, solo no se ve hasta la proxima carga.
      console.error("No se pudo refrescar el perfil:", err);
    }
  }, []);

  const setActiveCompany = useCallback(
    (companyId: string | null) => {
      // El admin no opera como otra empresa; solo el anfitrion cambia de una
      // a otra de las suyas.
      if (sanityUser?.role === "admin") return;
      // Persistimos ANTES de tocar el estado: el cliente HTTP lee del storage,
      // asi que cualquier request disparado por el re-render ya lleva la nueva.
      setActingCompany(companyId);
      setActiveCompanyIdState(companyId);
    },
    [sanityUser?.role],
  );

  /**
   * Perfil que ven las pantallas. Un anfitrion con varias empresas trabaja en
   * la elegida: sustituimos el companyId para que todas las pantallas operen
   * sobre ella sin cambiarles una linea.
   */
  const effectiveUser: SanityUser | null =
    sanityUser && activeCompanyId && sanityUser.role === "host"
      ? { ...sanityUser, companyId: activeCompanyId }
      : sanityUser;

  const esPanelRevendedor = sanityUser?.role === "reseller";

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
      // Quien venía a aprobar la conexión de un asistente vuelve a eso. Solo
      // se acepta esa ruta nuestra: lo guardado no puede mandar a otro sitio.
      let volverA: string | null = null;
      try {
        volverA = window.sessionStorage.getItem(CLAVE_DE_VUELTA);
        window.sessionStorage.removeItem(CLAVE_DE_VUELTA);
      } catch {
        // Sin almacenamiento, al panel como siempre.
      }
      if (volverA?.startsWith("/oauth/autorizar?")) {
        router.push(volverA);
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
    async (
      email: string,
      password: string,
      userData: Omit<CreateUserData, "firebaseId">,
      recaptchaToken?: string | null,
    ) => {
      try {
        await api.post<ApiUser>("/auth/register", {
          email,
          password,
          name: userData.name,
          phone: userData.phone,
          role: ROLE_UP[userData.role],
          documentType: userData.typeDocument,
          documentNumber: userData.documentNumber,
          // Quien decide si vale es el API, no el navegador.
          recaptchaToken: recaptchaToken ?? undefined,
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
      //
      // Un anfitrión recién registrado no tiene empresa, y sin ella el panel no
      // le sirve para nada: el registro sigue con los datos de la empresa y,
      // si hay suscripción, con su pago.
      router.push(userData.role === "host" ? "/company-setup" : "/dashboard");
      return { user: { uid: email } };
    },
    [router],
  );

  // Paso 1 del reset: el API genera el token, lo persiste y envia el correo.
  // El enlace del correo apunta a /reset-password?token=... y lo arma el API.
  const resetPassword = useCallback(async (email: string) => {
    try {
      await api.post(FORGOT_PASSWORD_PATH, { email });
    } catch (err) {
      // OJO: no tragamos el 404. El API devuelve 404 NOT_FOUND tanto para
      // "email inexistente" como para "ruta inexistente" (notFoundHandler),
      // asi que tratarlo como exito mostraria "correo enviado" cuando el
      // endpoint ni siquiera existe. La proteccion contra enumeracion de
      // usuarios va en el API: debe responder 204 exista o no el email.
      if (err instanceof ApiHttpError && err.status === 429) {
        throw new Error("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      }
      throw new Error("No se pudo enviar el correo de recuperacion. Intenta de nuevo.");
    }
  }, []);

  // Paso 2 del reset: canjea el token del enlace por la contrasena nueva.
  const confirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    try {
      await api.post(RESET_PASSWORD_PATH, { token, password: newPassword });
    } catch (err) {
      if (err instanceof ApiHttpError && (err.status === 400 || err.status === 410)) {
        throw new Error(
          "El enlace de recuperacion no es valido o ya expiro. Solicita uno nuevo.",
        );
      }
      throw new Error("No se pudo cambiar la contraseña. Intenta de nuevo.");
    }
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    // Stub: el API no maneja verificacion de email todavia.
    return { success: true, message: "Verificacion de email no requerida en esta version." };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        sanityUser: effectiveUser,
        activeCompanyId,
        setActiveCompany,
        esPanelRevendedor,
        loading,
        login,
        logout,
        register,
        resetPassword,
        confirmPasswordReset,
        sendVerificationEmail,
        markSetupCompleted,
        refrescarPerfil,
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
