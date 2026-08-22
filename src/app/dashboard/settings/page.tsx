"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HiCalendar, HiArrowRight } from "react-icons/hi";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getCompanyById, updateCompanyInSanity, type UpdateCompanyData } from "@/lib/sanity/companyService";
import { uploadImage } from "@/lib/api/uploads";
import { cambiarPassword } from "@/lib/api/account";
import { ApiHttpError } from "@/lib/api/client";
import { urlDeImagen } from "@/lib/images";
import EditorPortada from "@/components/BookingEngine/EditorPortada";
import type { TipoPortada } from "@/components/BookingEngine/PortadaCatalogo";
import type { Company } from "@/types";
import {
  Badge,
  Button,
  Label,
  Select,
  TextInput,
  Textarea,
  ToggleSwitch
} from "flowbite-react";

const COMPANY_TYPE_OPTIONS: Array<{ value: Company["companyType"]; label: string }> = [
  { value: "restaurant", label: "Restaurante" },
  { value: "catering", label: "Catering" },
  { value: "foodtruck", label: "Food Truck" },
  { value: "other", label: "Otro" },
];

const COMPANY_TYPE_LABEL: Record<Company["companyType"], string> = {
  restaurant: "Restaurante",
  catering: "Catering",
  foodtruck: "Food Truck",
  other: "Otro",
};

function formatAddress(address?: Company["address"]): string {
  if (!address) return "";
  return [address.street, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

type GeneralFormState = {
  companyName: string;
  companyType: Company["companyType"];
  companyEmail: string;
  companyPhone: string;
  description: string;
  website: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
};

function companyToFormState(c: Company): GeneralFormState {
  return {
    companyName: c.companyName ?? "",
    companyType: c.companyType ?? "restaurant",
    companyEmail: c.companyEmail ?? "",
    companyPhone: c.companyPhone ?? "",
    description: c.description ?? "",
    website: c.website ?? "",
    address: {
      street: c.address?.street ?? "",
      city: c.address?.city ?? "",
      state: c.address?.state ?? "",
      postalCode: c.address?.postalCode ?? "",
      country: c.address?.country ?? "",
    },
  };
}

type Feedback = { type: "success" | "error"; message: string } | null;

export default function SettingsPage() {
  const { sanityUser } = useAuth();

  // Un admin "actuando como" empresa usa las mismas pantallas que un
  // anfitrion. Sin empresa activa no tiene ajustes de empresa que tocar:
  // los suyos son los de la plataforma.
  const operaComoEmpresa = !!sanityUser?.companyId;
  const esAdminSinEmpresa = sanityUser?.role === "admin" && !sanityUser?.companyId;
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [generalForm, setGeneralForm] = useState<GeneralFormState | null>(null);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Marca
  const [editandoMarca, setEditandoMarca] = useState(false);
  const [marcaForm, setMarcaForm] = useState({ tagline: "", description: "", openTableRid: "" });
  const [guardandoMarca, setGuardandoMarca] = useState(false);
  const [marcaFeedback, setMarcaFeedback] = useState<Feedback>(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [portada, setPortada] = useState<{
    tipo: TipoPortada;
    imagenes: string[];
    video: string | null;
  }>({ tipo: 'NONE', imagenes: [], video: null });
  const [guardandoPortada, setGuardandoPortada] = useState(false);
  const [portadaFeedback, setPortadaFeedback] = useState<Feedback>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Operacion
  const [operacion, setOperacion] = useState({
    autoConfirmReservations: false,
    blockWhenFull: true,
  });
  const [guardandoOperacion, setGuardandoOperacion] = useState(false);
  const [operacionFeedback, setOperacionFeedback] = useState<Feedback>(null);

  // Cuenta
  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", repetir: "" });
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!sanityUser?.companyId) {
      setLoadingCompany(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getCompanyById(sanityUser.companyId!);
        if (cancelled) return;
        if (!data) {
          setCompanyError("No se encontró la empresa asociada a tu cuenta.");
        } else {
          setCompany(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setCompanyError("Error al cargar la información de la empresa.");
      } finally {
        if (!cancelled) setLoadingCompany(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sanityUser?.companyId]);

  // Los toggles reflejan lo guardado, no un valor por defecto inventado.
  useEffect(() => {
    if (!company) return;
    setPortada({
      tipo: company.coverType ?? 'NONE',
      imagenes: company.coverImages ?? [],
      video: company.coverVideo ?? null,
    });
    setOperacion({
      autoConfirmReservations: company.autoConfirmReservations ?? false,
      blockWhenFull: company.blockWhenFull ?? true,
    });
  }, [company]);

  useEffect(() => {
    if (!generalFeedback) return;
    const t = setTimeout(() => setGeneralFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [generalFeedback]);

  /** Relee la empresa tras guardar, para que la pantalla muestre lo que quedo. */
  const recargarEmpresa = useCallback(async () => {
    if (!company) return;
    const fresca = await getCompanyById(company._id);
    if (fresca) setCompany(fresca);
  }, [company]);

  const logoUrl = urlDeImagen(company?.logo?.asset?._ref);

  const handleStartEditGeneral = () => {
    if (!company) return;
    setGeneralForm(companyToFormState(company));
    setIsEditingGeneral(true);
    setGeneralFeedback(null);
  };

  const handleCancelEditGeneral = () => {
    setIsEditingGeneral(false);
    setGeneralForm(null);
  };

  const handleSaveGeneral = async () => {
    if (!company || !generalForm) return;
    setSavingGeneral(true);
    setGeneralFeedback(null);
    try {
      const payload: UpdateCompanyData = {
        companyName: generalForm.companyName.trim(),
        companyType: generalForm.companyType,
        companyEmail: generalForm.companyEmail.trim(),
        companyPhone: generalForm.companyPhone.trim(),
        description: generalForm.description.trim() || undefined,
        website: generalForm.website.trim() || undefined,
        address: {
          street: generalForm.address.street.trim() || undefined,
          city: generalForm.address.city.trim() || undefined,
          state: generalForm.address.state.trim() || undefined,
          postalCode: generalForm.address.postalCode.trim() || undefined,
          country: generalForm.address.country.trim() || undefined,
        },
      };
      await updateCompanyInSanity(company._id, payload);
      const refreshed = await getCompanyById(company._id);
      if (refreshed) setCompany(refreshed);
      setIsEditingGeneral(false);
      setGeneralForm(null);
      setGeneralFeedback({ type: "success", message: "Información actualizada correctamente." });
    } catch (err) {
      console.error(err);
      setGeneralFeedback({ type: "error", message: "No se pudo guardar. Intenta de nuevo." });
    } finally {
      setSavingGeneral(false);
    }
  };

  // ─── Marca ───────────────────────────────────────────────────────────────

  const empezarEdicionMarca = () => {
    if (!company) return;
    setMarcaForm({
      tagline: company.tagline ?? "",
      description: company.description ?? "",
      openTableRid: company.openTableRid ?? "",
    });
    setEditandoMarca(true);
    setMarcaFeedback(null);
  };

  const cancelarEdicionMarca = () => {
    setEditandoMarca(false);
    setMarcaFeedback(null);
  };

  const guardarMarca = async () => {
    if (!company) return;
    setGuardandoMarca(true);
    setMarcaFeedback(null);
    try {
      // Cadena vacia = borrar el campo, no guardar "".
      await updateCompanyInSanity(company._id, {
        tagline: marcaForm.tagline.trim() || null,
        description: marcaForm.description.trim() || undefined,
        openTableRid: marcaForm.openTableRid.trim() || null,
      });
      await recargarEmpresa();
      setEditandoMarca(false);
      setMarcaFeedback({ type: "success", message: "Marca actualizada." });
    } catch (err) {
      console.error(err);
      setMarcaFeedback({ type: "error", message: "No se pudo guardar. Intenta de nuevo." });
    } finally {
      setGuardandoMarca(false);
    }
  };

  const subirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    setSubiendoLogo(true);
    setMarcaFeedback(null);
    try {
      const url = await uploadImage(file, "logos");
      await updateCompanyInSanity(company._id, { logo: url });
      await recargarEmpresa();
      setMarcaFeedback({ type: "success", message: "Logo actualizado." });
    } catch (err) {
      console.error(err);
      setMarcaFeedback({ type: "error", message: "No se pudo subir el logo." });
    } finally {
      setSubiendoLogo(false);
      // Sin esto, volver a elegir el mismo archivo no dispara el change.
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const quitarLogo = async () => {
    if (!company) return;
    setSubiendoLogo(true);
    try {
      await updateCompanyInSanity(company._id, { logo: null });
      await recargarEmpresa();
      setMarcaFeedback({ type: "success", message: "Logo eliminado." });
    } catch (err) {
      console.error(err);
      setMarcaFeedback({ type: "error", message: "No se pudo eliminar el logo." });
    } finally {
      setSubiendoLogo(false);
    }
  };

  const guardarPortada = async () => {
    if (!company) return;
    setGuardandoPortada(true);
    setPortadaFeedback(null);
    try {
      await updateCompanyInSanity(company._id, {
        coverType: portada.tipo,
        coverImages: portada.imagenes,
        coverVideo: portada.video,
      });
      await recargarEmpresa();
      setPortadaFeedback({ type: 'success', message: 'Portada actualizada.' });
    } catch (err) {
      console.error(err);
      setPortadaFeedback({ type: 'error', message: 'No se pudo guardar la portada.' });
    } finally {
      setGuardandoPortada(false);
    }
  };

  // ─── Operacion ───────────────────────────────────────────────────────────

  const guardarOperacion = async () => {
    if (!company) return;
    setGuardandoOperacion(true);
    setOperacionFeedback(null);
    try {
      await updateCompanyInSanity(company._id, {
        autoConfirmReservations: operacion.autoConfirmReservations,
        blockWhenFull: operacion.blockWhenFull,
      });
      await recargarEmpresa();
      setOperacionFeedback({ type: "success", message: "Ajustes guardados." });
    } catch (err) {
      console.error(err);
      setOperacionFeedback({ type: "error", message: "No se pudo guardar. Intenta de nuevo." });
    } finally {
      setGuardandoOperacion(false);
    }
  };

  // ─── Cuenta ──────────────────────────────────────────────────────────────

  const guardarPassword = async () => {
    setPasswordFeedback(null);
    // Lo que se puede comprobar sin ir al servidor, se comprueba aqui.
    if (!passwordForm.actual || !passwordForm.nueva) {
      setPasswordFeedback({ type: "error", message: "Completa ambas contraseñas." });
      return;
    }
    if (passwordForm.nueva.length < 8) {
      setPasswordFeedback({ type: "error", message: "La nueva debe tener al menos 8 caracteres." });
      return;
    }
    if (passwordForm.nueva !== passwordForm.repetir) {
      setPasswordFeedback({ type: "error", message: "La nueva y su repetición no coinciden." });
      return;
    }

    setCambiandoPassword(true);
    try {
      await cambiarPassword(passwordForm.actual, passwordForm.nueva);
      setPasswordForm({ actual: "", nueva: "", repetir: "" });
      setPasswordFeedback({ type: "success", message: "Contraseña actualizada." });
    } catch (err) {
      // El API distingue "actual incorrecta" de "es la misma"; su mensaje
      // es mas util que uno generico.
      const mensaje =
        err instanceof ApiHttpError && err.status === 400
          ? err.message
          : "No se pudo cambiar la contraseña. Intenta de nuevo.";
      setPasswordFeedback({ type: "error", message: mensaje });
    } finally {
      setCambiandoPassword(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Encabezado */}
        <header className="space-y-2">
          <Badge color="warning" className="w-fit border border-[#F26726]/10 bg-[#F26726]/10 text-[#F26726]">
            Configuración
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#334C5D]">
            Centro de Configuración
          </h1>
          <p className="max-w-3xl text-gray-600">
            {operaComoEmpresa
              ? "Ajusta la información de tu empresa, su marca, cómo entran las reservas y los datos de tu cuenta."
              : "Ajusta los datos de acceso de tu cuenta."}
          </p>
        </header>

        {/* Ajustes de empresa. Un comensal o un revendedor sin empresa
            no tienen nada que configurar aqui, y hasta ahora veian esta
            pantalla entera con los datos vacios. */}
        {operaComoEmpresa && (
          <>
          {/* Información General */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#334C5D]">
                  Información general
                </h2>
                <p className="text-sm text-gray-500">
                  Revisa los datos principales de tu empresa y del responsable de la cuenta.
                </p>
              </div>
              {!loadingCompany && company && !isEditingGeneral && (
                <Button
                  color="warning"
                  onClick={handleStartEditGeneral}
                  className="border-none bg-[#F26726] hover:bg-[#F26726]/90"
                >
                  Editar información
                </Button>
              )}
              {isEditingGeneral && (
                <div className="flex gap-2">
                  <Button
                    color="light"
                    onClick={handleCancelEditGeneral}
                    disabled={savingGeneral}
                    className="border border-gray-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    color="warning"
                    onClick={handleSaveGeneral}
                    disabled={savingGeneral}
                    className="border-none bg-[#F26726] hover:bg-[#F26726]/90"
                  >
                    {savingGeneral ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              )}
            </div>

            {generalFeedback && (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                  generalFeedback.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {generalFeedback.message}
              </div>
            )}

            {loadingCompany ? (
              <div className="space-y-4">
                <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-20 w-full animate-pulse rounded bg-gray-100" />
              </div>
            ) : companyError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {companyError}
              </div>
            ) : !company ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Aún no completas el registro de tu empresa.
              </div>
            ) : !isEditingGeneral ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Nombre comercial</label>
                    <TextInput readOnly value={company.companyName ?? ""} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Correo de contacto</label>
                    <TextInput readOnly value={company.companyEmail ?? ""} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Teléfono</label>
                    <TextInput readOnly value={company.companyPhone ?? ""} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Sitio web</label>
                    <TextInput readOnly value={company.website ?? "—"} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Sector principal</label>
                    <TextInput readOnly value={COMPANY_TYPE_LABEL[company.companyType] ?? company.companyType ?? ""} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Dirección</label>
                    <Textarea readOnly rows={3} value={formatAddress(company.address) || "—"} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Descripción</label>
                    <Textarea readOnly rows={3} value={company.description || "—"} />
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">Estado de la empresa</p>
                    <p className="text-sm text-gray-500">
                      {company.isActive ? "Activa y verificada." : "Inactiva."}
                    </p>
                  </div>
                </div>
              </div>
            ) : generalForm ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName" className="mb-2 block text-sm font-medium text-gray-700">
                      Nombre comercial
                    </Label>
                    <TextInput
                      id="companyName"
                      value={generalForm.companyName}
                      onChange={(e) => setGeneralForm({ ...generalForm, companyName: e.target.value })}
                      disabled={savingGeneral}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail" className="mb-2 block text-sm font-medium text-gray-700">
                      Correo de contacto
                    </Label>
                    <TextInput
                      id="companyEmail"
                      type="email"
                      value={generalForm.companyEmail}
                      onChange={(e) => setGeneralForm({ ...generalForm, companyEmail: e.target.value })}
                      disabled={savingGeneral}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyPhone" className="mb-2 block text-sm font-medium text-gray-700">
                      Teléfono
                    </Label>
                    <TextInput
                      id="companyPhone"
                      value={generalForm.companyPhone}
                      onChange={(e) => setGeneralForm({ ...generalForm, companyPhone: e.target.value })}
                      disabled={savingGeneral}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website" className="mb-2 block text-sm font-medium text-gray-700">
                      Sitio web
                    </Label>
                    <TextInput
                      id="website"
                      placeholder="https://..."
                      value={generalForm.website}
                      onChange={(e) => setGeneralForm({ ...generalForm, website: e.target.value })}
                      disabled={savingGeneral}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyType" className="mb-2 block text-sm font-medium text-gray-700">
                      Sector principal
                    </Label>
                    <Select
                      id="companyType"
                      value={generalForm.companyType}
                      onChange={(e) => setGeneralForm({ ...generalForm, companyType: e.target.value as Company["companyType"] })}
                      disabled={savingGeneral}
                    >
                      {COMPANY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Dirección</p>
                    <div className="space-y-3">
                      <TextInput
                        placeholder="Calle y número"
                        value={generalForm.address.street}
                        onChange={(e) => setGeneralForm({ ...generalForm, address: { ...generalForm.address, street: e.target.value } })}
                        disabled={savingGeneral}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput
                          placeholder="Ciudad"
                          value={generalForm.address.city}
                          onChange={(e) => setGeneralForm({ ...generalForm, address: { ...generalForm.address, city: e.target.value } })}
                          disabled={savingGeneral}
                        />
                        <TextInput
                          placeholder="Departamento / Estado"
                          value={generalForm.address.state}
                          onChange={(e) => setGeneralForm({ ...generalForm, address: { ...generalForm.address, state: e.target.value } })}
                          disabled={savingGeneral}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput
                          placeholder="Código postal"
                          value={generalForm.address.postalCode}
                          onChange={(e) => setGeneralForm({ ...generalForm, address: { ...generalForm.address, postalCode: e.target.value } })}
                          disabled={savingGeneral}
                        />
                        <TextInput
                          placeholder="País"
                          value={generalForm.address.country}
                          onChange={(e) => setGeneralForm({ ...generalForm, address: { ...generalForm.address, country: e.target.value } })}
                          disabled={savingGeneral}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
                      Descripción
                    </Label>
                    <Textarea
                      id="description"
                      rows={3}
                      value={generalForm.description}
                      onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                      disabled={savingGeneral}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Branding */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#334C5D]">Marca de tu empresa</h2>
                <p className="text-sm text-gray-500">
                  El logo y la descripción que ven tus clientes en el catálogo digital.
                </p>
              </div>
              {!editandoMarca ? (
                <Button color="secondary" onClick={empezarEdicionMarca} disabled={!company}>
                  Editar marca
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button color="secondary" onClick={cancelarEdicionMarca} disabled={guardandoMarca}>
                    Cancelar
                  </Button>
                  <Button color="primary" onClick={guardarMarca} disabled={guardandoMarca}>
                    {guardandoMarca ? "Guardando..." : "Guardar marca"}
                  </Button>
                </div>
              )}
            </div>

            {marcaFeedback && (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                  marcaFeedback.type === "success"
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {marcaFeedback.message}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Logo</p>
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo de la empresa" className="max-h-28 max-w-full object-contain" />
                  ) : (
                    <span className="px-4 text-center text-sm text-gray-500">
                      Todavía no has subido un logo
                    </span>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={subirLogo}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="xs"
                    color="secondary"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={!company || subiendoLogo}
                  >
                    {subiendoLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                  </Button>
                  {logoUrl && (
                    <Button size="xs" color="danger" onClick={quitarLogo} disabled={subiendoLogo}>
                      Quitar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">PNG o JPG. Se muestra en tu catálogo público.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Frase corta</Label>
                <TextInput
                  id="tagline"
                  readOnly={!editandoMarca}
                  value={editandoMarca ? marcaForm.tagline : company?.tagline ?? ""}
                  placeholder="Ej: Cocina de autor en el corazón de Bogotá"
                  onChange={(e) => setMarcaForm((f) => ({ ...f, tagline: e.target.value }))}
                />
                <p className="text-xs text-gray-500">
                  Acompaña al nombre de tu empresa. Una línea, sin punto final.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion-marca">Descripción</Label>
                <Textarea
                  id="descripcion-marca"
                  rows={6}
                  readOnly={!editandoMarca}
                  value={editandoMarca ? marcaForm.description : company?.description ?? ""}
                  placeholder="Cuenta qué hace especial a tu cocina."
                  onChange={(e) => setMarcaForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Vinculo con OpenTable. Vive aqui, junto a la marca, porque es
                otra forma en la que la empresa aparece hacia fuera. */}
            <div className="mt-6 border-t border-gray-100 pt-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="opentable-rid">Restaurante en OpenTable</Label>
                  <TextInput
                    id="opentable-rid"
                    readOnly={!editandoMarca}
                    value={editandoMarca ? marcaForm.openTableRid : company?.openTableRid ?? ""}
                    placeholder="Ej: 1234567"
                    onChange={(e) => setMarcaForm((f) => ({ ...f, openTableRid: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">
                    Es el número que aparece como <code>rid=</code> en los enlaces de tu
                    restaurante en OpenTable.
                  </p>
                </div>
                <div className="lg:col-span-2 flex items-start">
                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 w-full">
                    Vincularlo te permite llevar tus experiencias a OpenTable desde{' '}
                    <Link href="/dashboard/canales" className="text-[#F26726] hover:underline">
                      Otros canales
                    </Link>
                    .
                    {company?.openTableRid && (
                      <a
                        href={`https://www.opentable.com/restref/client/?rid=${company.openTableRid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-[#F26726] hover:underline"
                      >
                        Ver la página de reservas de tu restaurante
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Portada del catalogo */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#334C5D]">Portada del catálogo</h2>
              <p className="text-sm text-gray-500">
                Lo primero que ve quien abre tu enlace, encima de tus experiencias.
              </p>
            </div>
            <Button color="primary" onClick={guardarPortada} disabled={!company || guardandoPortada}>
              {guardandoPortada ? "Guardando..." : "Guardar portada"}
            </Button>
          </div>

          {portadaFeedback && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                portadaFeedback.type === "success"
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {portadaFeedback.message}
            </div>
          )}

          <EditorPortada
            tipo={portada.tipo}
            imagenes={portada.imagenes}
            video={portada.video}
            guardando={guardandoPortada}
            onChange={setPortada}
            onError={(message) => setPortadaFeedback({ type: "error", message })}
          />
        </section>

        {/* Integraciones */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#334C5D]">
                  Integraciones
                </h2>
                <p className="text-sm text-gray-500">
                  Conecta TenemosFilo con tus herramientas externas como calendarios y otras plataformas.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/integrations"
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-4 transition hover:border-[#F26726]/30 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F26726]/10 p-2">
                  <HiCalendar className="h-5 w-5 text-[#F26726]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#334C5D]">Integraciones de calendario</p>
                  <p className="text-sm text-gray-500">
                    Sincroniza tu agenda con iCal, Google Calendar, Outlook y más.
                  </p>
                </div>
              </div>
              <HiArrowRight className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
          </section>

          {/* Operacion */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#334C5D]">Cómo entran las reservas</h2>
                <p className="text-sm text-gray-500">
                  Estos ajustes se aplican al momento de reservar, tanto desde tu catálogo como
                  desde una venta cargada a mano.
                </p>
              </div>
              <Button color="primary" onClick={guardarOperacion} disabled={!company || guardandoOperacion}>
                {guardandoOperacion ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>

            {operacionFeedback && (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                  operacionFeedback.type === "success"
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {operacionFeedback.message}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-4">
                <div>
                  <p className="text-sm font-semibold text-[#334C5D]">Confirmación automática</p>
                  <p className="text-sm text-gray-500">
                    Las reservas nuevas quedan confirmadas de una vez. Si lo dejas apagado,
                    entran como pendientes y las confirmas tú.
                  </p>
                </div>
                <ToggleSwitch
                  checked={operacion.autoConfirmReservations}
                  label={operacion.autoConfirmReservations ? "Sí" : "No"}
                  onChange={() =>
                    setOperacion((o) => ({
                      ...o,
                      autoConfirmReservations: !o.autoConfirmReservations,
                    }))
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-4">
                <div>
                  <p className="text-sm font-semibold text-[#334C5D]">Respetar el aforo</p>
                  <p className="text-sm text-gray-500">
                    Rechaza las reservas que pasarían del cupo de la experiencia para esa fecha.
                    Apágalo solo si gestionas el sobrecupo por tu cuenta.
                  </p>
                </div>
                <ToggleSwitch
                  checked={operacion.blockWhenFull}
                  label={operacion.blockWhenFull ? "Sí" : "No"}
                  onChange={() => setOperacion((o) => ({ ...o, blockWhenFull: !o.blockWhenFull }))}
                />
              </div>
            </div>
          </section>

          </>
        )}

        {/* El admin en modo plataforma no configura una empresa: lo suyo
            son las comisiones y la pasarela, que viven en su panel. */}
        {esAdminSinEmpresa && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#334C5D]">Ajustes de la plataforma</h2>
            <p className="mt-1 text-sm text-gray-500">
              Estás en modo plataforma. Las comisiones y la pasarela de pago se configuran en
              el panel de administración; para ver los ajustes de una empresa concreta,
              selecciónala en el menú superior.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button color="primary" href="/dashboard/admin/ajustes">
                Comisiones y pagos
              </Button>
              <Button color="secondary" href="/dashboard/admin/empresas">
                Empresas
              </Button>
              <Button color="secondary" href="/dashboard/admin/usuarios">
                Usuarios
              </Button>
            </div>
          </section>
        )}

        {/* Cuenta. Es lo unico que aplica a todos los roles: un comensal o
            un revendedor sin empresa no tienen nada mas que configurar. */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#334C5D]">Tu cuenta</h2>
            <p className="text-sm text-gray-500">
              Datos de acceso de {sanityUser?.email ?? "tu usuario"}.
            </p>
          </div>

          {passwordFeedback && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                passwordFeedback.type === "success"
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {passwordFeedback.message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pass-actual">Contraseña actual</Label>
              <TextInput
                id="pass-actual"
                type="password"
                autoComplete="current-password"
                value={passwordForm.actual}
                onChange={(e) => setPasswordForm((f) => ({ ...f, actual: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass-nueva">Contraseña nueva</Label>
              <TextInput
                id="pass-nueva"
                type="password"
                autoComplete="new-password"
                value={passwordForm.nueva}
                onChange={(e) => setPasswordForm((f) => ({ ...f, nueva: e.target.value }))}
              />
              <p className="text-xs text-gray-500">Mínimo 8 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass-repetir">Repetir la nueva</Label>
              <TextInput
                id="pass-repetir"
                type="password"
                autoComplete="new-password"
                value={passwordForm.repetir}
                onChange={(e) => setPasswordForm((f) => ({ ...f, repetir: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button color="primary" onClick={guardarPassword} disabled={cambiandoPassword}>
              {cambiandoPassword ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
            <Link href="/dashboard/profile" className="text-sm text-[#F26726] hover:underline">
              Editar mis datos personales
            </Link>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

