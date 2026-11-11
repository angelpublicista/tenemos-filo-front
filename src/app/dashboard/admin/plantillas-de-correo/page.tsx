"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button } from 'flowbite-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import { cambiarActivaDePlantilla, listPlantillas, type PlantillaResumen } from '@/lib/api/plantillasDeCorreo';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AdminPlantillasDeCorreoPage() {
  const { showError } = useSweetAlert();
  const [filas, setFilas] = useState<PlantillaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  /** La plantilla cuyo cambio está en camino: bloquea su botón para no mandar dos veces. */
  const [cambiando, setCambiando] = useState<string | null>(null);

  useEffect(() => {
    listPlantillas()
      .then(setFilas)
      .catch((e) => showError('No se pudieron cargar las plantillas', mensajeDeError(e)))
      .finally(() => setCargando(false));
    // showError cambia en cada render; incluirlo recargaría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarActiva = async (p: PlantillaResumen) => {
    setCambiando(p.key);
    try {
      const nueva = await cambiarActivaDePlantilla(p.key, !p.activa);
      setFilas((prev) => prev.map((f) => (f.key === p.key ? { ...f, activa: nueva?.activa ?? !p.activa } : f)));
    } catch (e) {
      showError(p.activa ? 'No se pudo apagar la plantilla' : 'No se pudo encender la plantilla', mensajeDeError(e));
    } finally {
      setCambiando(null);
    }
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Plantillas de correo"
        descripcion="Los correos que la plataforma envía por su cuenta. Puedes cambiar el asunto, el título, el texto y el botón; el diseño y el destino del botón son fijos."
        total={filas.length}
      />

      <AdminTable
        columnas={['Plantilla', 'Cuándo se envía', 'Estado', 'Envío', '']}
        cargando={cargando}
        vacio={filas.length === 0}
        mensajeVacio="No hay plantillas."
      >
        {filas.map((p, i) => (
          <React.Fragment key={p.key}>
            {/* Cabecera cada vez que cambia el grupo: la lista ya llega ordenada por grupo. */}
            {p.grupo !== filas[i - 1]?.grupo && (
              <tr className="bg-gray-50 border-b">
                <td colSpan={5} className="px-6 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {p.grupo}
                </td>
              </tr>
            )}
          <tr className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4">
              <div className="font-medium text-gray-900">{p.nombre}</div>
              <div className="text-xs text-gray-500">{p.descripcion}</div>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{p.cuando}</td>
            <td className="px-6 py-4">
              {p.personalizada ? (
                <Badge color="info" className="w-fit">
                  Editada{p.updatedAt ? ` · ${fecha(p.updatedAt)}` : ''}
                </Badge>
              ) : (
                <Badge color="gray" className="w-fit">
                  Texto original
                </Badge>
              )}
            </td>
            <td className="px-6 py-4">
              {p.esencial ? (
                <span className="text-xs text-gray-500" title="Sin este correo la persona no podría entrar a su cuenta">
                  Siempre activa
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge color={p.activa ? 'success' : 'failure'} className="w-fit">
                    {p.activa ? 'Activa' : 'Apagada'}
                  </Badge>
                  <Button
                    size="xs"
                    color={p.activa ? 'light' : 'success'}
                    disabled={cambiando === p.key}
                    onClick={() => cambiarActiva(p)}
                  >
                    {p.activa ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              )}
            </td>
            <td className="px-6 py-4">
              <Link href={`/dashboard/admin/plantillas-de-correo/${p.key}`}>
                <Button size="xs" color="light">
                  Ver y editar
                </Button>
              </Link>
            </td>
          </tr>
          </React.Fragment>
        ))}
      </AdminTable>
    </ProtectedRoute>
  );
}
