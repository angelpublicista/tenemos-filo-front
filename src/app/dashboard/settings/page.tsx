"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  Badge,
  Button,
  Select,
  TextInput,
  Textarea,
  ToggleSwitch
} from "flowbite-react";

const brandColors = {
  primary: "#F26726",
  accent: "#19A3A2",
  dark: "#334C5D",
  highlight: "#EBD52C"
};

export default function SettingsPage() {
  const { sanityUser } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState({
    reservas: true,
    experiencias: true,
    recordatorios: true,
    marketing: false
  });

  const [experiencePreferences, setExperiencePreferences] = useState({
    confirmacionAutomatica: false,
    permitirOverbooking: false,
    recordatorioAutomatizado: true,
    bloqueosAutomaticos: true
  });

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleExperienceToggle = (key: keyof typeof experiencePreferences) => {
    setExperiencePreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Encabezado */}
        <header className="space-y-2">
          <Badge color="warning" className="w-fit border border-[#F26726]/10 bg-[#F26726]/10 text-[#F26726]">
            Configuración
          </Badge>
          <h1 className="text-3xl font-bold text-[#334C5D]">
            Centro de Configuración
          </h1>
          <p className="max-w-3xl text-gray-600">
            Personaliza la experiencia de tu empresa en TenemosFilo. Ajusta tu información,
            branding, comunicaciones y controles operativos desde un solo lugar.
          </p>
        </header>

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
            <Button color="warning" className="border-none bg-[#F26726] hover:bg-[#F26726]/90">
              Editar información
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nombre comercial
                </label>
                <TextInput readOnly value={sanityUser?.name || "Tenemos Filo Experiencias"} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Correo de contacto
                </label>
                <TextInput readOnly value={sanityUser?.email || "contacto@cortesrueda.com"} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <TextInput readOnly value="+57 320 000 0000" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Sector principal
                </label>
                <Select disabled value="Experiencias Gastronómicas">
                  <option>Experiencias Gastronómicas</option>
                  <option>Eventos Corporativos</option>
                  <option>Turismo</option>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Dirección fiscal
                </label>
                <Textarea readOnly rows={3} value="Carrera 12 #34-56, Bogotá, Colombia" />
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Estado de la empresa</p>
                <p className="text-sm text-gray-500">
                  {sanityUser?.companyId
                    ? "Configuración completada y verificada."
                    : "Pendiente de completar el proceso de configuración."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#334C5D]">
                Branding y personalización
              </h2>
              <p className="text-sm text-gray-500">
                Mantén la identidad visual de Tenemos Filo en todas las comunicaciones.
              </p>
            </div>
            <Button color="light" className="border border-[#334C5D]/20 text-[#334C5D] hover:bg-[#334C5D]/10">
              Actualizar branding
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Logo principal</p>
                <div className="mt-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                  <span className="text-sm text-gray-500">Logo Tenemos Filo (PNG)</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Eslogan actual</p>
                <TextInput readOnly value="Experiencias culinarias con sello Tenemos Filo" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Paleta de colores oficial</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                  <span className="block h-8 w-full rounded-md" style={{ backgroundColor: brandColors.primary }} />
                  <p className="mt-2 text-xs font-semibold text-gray-600">Primario</p>
                  <p className="text-xs text-gray-500">{brandColors.primary}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                  <span className="block h-8 w-full rounded-md" style={{ backgroundColor: brandColors.accent }} />
                  <p className="mt-2 text-xs font-semibold text-gray-600">Acento</p>
                  <p className="text-xs text-gray-500">{brandColors.accent}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                  <span className="block h-8 w-full rounded-md" style={{ backgroundColor: brandColors.dark }} />
                  <p className="mt-2 text-xs font-semibold text-gray-600">Texto Principal</p>
                  <p className="text-xs text-gray-500">{brandColors.dark}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                  <span className="block h-8 w-full rounded-md" style={{ backgroundColor: brandColors.highlight }} />
                  <p className="mt-2 text-xs font-semibold text-gray-600">Resaltado</p>
                  <p className="text-xs text-gray-500">{brandColors.highlight}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Tono de comunicación</p>
              <Textarea
                readOnly
                rows={6}
                value="Comunicaciones cercanas, profesionales y orientadas al disfrute gastronómico. Mantener un lenguaje inclusivo y respetuoso."
              />
            </div>
          </div>
        </section>

        {/* Notificaciones */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#334C5D]">
                Preferencias de notificaciones
              </h2>
              <p className="text-sm text-gray-500">
                Controla las comunicaciones que recibes relacionadas con reservas y experiencias.
              </p>
            </div>
            <Button color="light" className="border border-[#19A3A2]/20 text-[#19A3A2] hover:bg-[#19A3A2]/10">
              Guardar preferencias
            </Button>
          </div>

          <div className="space-y-4">
            {[
              {
                key: "reservas" as const,
                title: "Actualizaciones de reservas",
                description: "Recibe confirmaciones, cancelaciones y cambios en tiempo real."
              },
              {
                key: "experiencias" as const,
                title: "Estado de experiencias",
                description: "Alertas sobre experiencias próximas, ventas y feedback recibido."
              },
              {
                key: "recordatorios" as const,
                title: "Recordatorios operativos",
                description: "Agenda, checklists y tareas pendientes para el equipo."
              },
              {
                key: "marketing" as const,
                title: "Novedades de marketing",
                description: "Promociones, campañas y material de marca disponible."
              }
            ].map((item) => (
              <div
                key={item.key}
                className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 transition hover:border-[#F26726]/30 hover:shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#334C5D]">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ToggleSwitch
                  checked={notificationSettings[item.key]}
                  label={notificationSettings[item.key] ? "Activado" : "Desactivado"}
                  onChange={() => handleNotificationToggle(item.key)}
                  theme={{
                    root: {
                      base: "group flex items-center",
                      active: {
                        on: "cursor-pointer",
                        off: "cursor-pointer"
                      },
                      label: "ms-3 text-sm font-medium text-[#334C5D]"
                    },
                    toggle: {
                      base: "relative h-6 w-11 rounded-full after:absolute after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all group-focus:ring-2",
                      checked: {
                        on: "bg-[#F26726] after:translate-x-full after:border-transparent rtl:after:-translate-x-full group-focus:ring-[#F26726]/40",
                        off: "bg-gray-200 after:border-gray-300 dark:bg-gray-700"
                      }
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Operación de experiencias */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#334C5D]">
                Controles operativos
              </h2>
              <p className="text-sm text-gray-500">
                Ajusta cómo se publican y administran las experiencias y reservas.
              </p>
            </div>
            <Button color="light" className="border border-[#F26726]/20 text-[#F26726] hover:bg-[#F26726]/10">
              Guardar cambios
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                key: "confirmacionAutomatica" as const,
                title: "Confirmación automática",
                description: "Aprueba automáticamente las reservas cuando haya cupos disponibles."
              },
              {
                key: "permitirOverbooking" as const,
                title: "Permitir lista de espera",
                description: "Habilita una lista de espera para reservas en experiencias con alta demanda."
              },
              {
                key: "recordatorioAutomatizado" as const,
                title: "Recordatorios automatizados",
                description: "Envia recordatorios 48 horas antes de cada experiencia."
              },
              {
                key: "bloqueosAutomaticos" as const,
                title: "Bloqueos automáticos",
                description: "Bloquea el calendario cuando se alcance el aforo máximo de la sede."
              }
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-4 hover:border-[#19A3A2]/30 hover:shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-[#334C5D]">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ToggleSwitch
                  checked={experiencePreferences[item.key]}
                  label={experiencePreferences[item.key] ? "Sí" : "No"}
                  onChange={() => handleExperienceToggle(item.key)}
                  theme={{
                    root: {
                      base: "group flex items-center",
                      active: {
                        on: "cursor-pointer",
                        off: "cursor-pointer"
                      },
                      label: "ms-3 text-sm font-medium text-[#334C5D]"
                    },
                    toggle: {
                      base: "relative h-6 w-11 rounded-full after:absolute after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all group-focus:ring-2",
                      checked: {
                        on: "bg-[#19A3A2] after:translate-x-full after:border-transparent rtl:after:-translate-x-full group-focus:ring-[#19A3A2]/40",
                        off: "bg-gray-200 after:border-gray-300 dark:bg-gray-700"
                      }
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Seguridad */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#334C5D]">
                Seguridad y accesos
              </h2>
              <p className="text-sm text-gray-500">
                Protege la cuenta de tu empresa y gestiona los accesos del equipo.
              </p>
            </div>
            <Button color="light" className="border border-[#334C5D]/20 text-[#334C5D] hover:bg-[#334C5D]/10">
              Revisar accesos
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-lg border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#334C5D]">Autenticación reforzada</p>
                <Badge color="success" className="bg-[#19A3A2]/10 text-[#19A3A2]">
                  Recomendado
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                Añade un segundo factor de autenticación para los miembros del equipo.
              </p>
              <Button color="warning" className="border-none bg-[#F26726] hover:bg-[#F26726]/90">
                Configurar MFA
              </Button>
            </div>

            <div className="space-y-4 rounded-lg border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#334C5D]">Roles y permisos</p>
                <Badge color="warning" className="bg-[#EBD52C]/10 text-[#E23694]">
                  Próximamente
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                Define qué miembros pueden editar experiencias, gestionar reservas o ver información financiera.
              </p>
              <Button color="light" className="border border-dashed border-[#334C5D]/30 text-[#334C5D] hover:bg-[#334C5D]/10">
                Administrar equipo
              </Button>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

