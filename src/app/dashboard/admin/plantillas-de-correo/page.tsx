"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button } from 'flowbite-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import { listPlantillas, type PlantillaResumen } from '@/lib/api/plantillasDeCorreo';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AdminPlantillasDeCorreoPage() {
  const { showError } = useSweetAlert();
  const [filas, setFilas] = useState<PlantillaResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listPlantillas()
      .then(setFilas)
      .catch((e) => showError('No se pudieron cargar las plantillas', mensajeDeError(e)))
      .finally(() => setCargando(false));
    // showError cambia en cada render; incluirlo recargaría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Plantillas de correo"
        descripcion="Los correos que la plataforma envía por su cuenta. Puedes cambiar el asunto, el título, el texto y el botón; el diseño y el destino del botón son fijos."
        total={filas.length}
      />

      <AdminTable
        columnas={['Plantilla', 'Cuándo se envía', 'Estado', '']}
        cargando={cargando}
        vacio={filas.length === 0}
        mensajeVacio="No hay plantillas."
      >
        {filas.map((p) => (
          <tr key={p.key} className="bg-white border-b hover:bg-gray-50">
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
              <Link href={`/dashboard/admin/plantillas-de-correo/${p.key}`}>
                <Button size="xs" color="light">
                  Ver y editar
                </Button>
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </ProtectedRoute>
  );
}
