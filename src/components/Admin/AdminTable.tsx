"use client";

import React from 'react';
import { Card } from 'flowbite-react';
import { SkeletonTableRow } from '@/components/Skeleton';

type AdminTableProps = {
  columnas: string[];
  cargando: boolean;
  vacio: boolean;
  mensajeVacio: string;
  children: React.ReactNode;
};

/**
 * Carcasa de tabla del panel de administracion: mismo look que las tablas
 * del CRM, con estados de carga y vacio resueltos en un solo sitio.
 */
export default function AdminTable({
  columnas,
  cargando,
  vacio,
  mensajeVacio,
  children,
}: AdminTableProps) {
  if (cargando) {
    return (
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTableRow key={i} cols={columnas.length} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {vacio ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{mensajeVacio}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                {columnas.map((c) => (
                  <th key={c} scope="col" className="px-6 py-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Cabecera comun de las paginas del panel. */
export function AdminHeader({
  titulo,
  descripcion,
  total,
}: {
  titulo: string;
  descripcion: string;
  total?: number;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
      <p className="text-sm text-gray-600 mt-1">
        {descripcion}
        {total !== undefined && (
          <span className="ml-1 font-medium text-gray-900">({total} en total)</span>
        )}
      </p>
    </div>
  );
}
