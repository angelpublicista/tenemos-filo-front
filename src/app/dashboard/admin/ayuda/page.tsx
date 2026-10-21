"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
  TextInput,
} from 'flowbite-react';
import { AiOutlinePlus } from 'react-icons/ai';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import ContenidoMarkdown from '@/components/Ayuda/ContenidoMarkdown';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  actualizarArticulo,
  crearArticulo,
  eliminarArticulo,
  getArticulo,
  listArticulos,
  type ArticuloResumen,
  type DatosDeArticulo,
  type RolDeAudiencia,
} from '@/lib/api/ayuda';

const ROLES: Array<{ valor: RolDeAudiencia; etiqueta: string }> = [
  { valor: 'HOST', etiqueta: 'Anfitriones' },
  { valor: 'RESELLER', etiqueta: 'Revendedores' },
  { valor: 'GUEST', etiqueta: 'Comensales' },
];

const VACIO: DatosDeArticulo = {
  slug: '',
  title: '',
  summary: '',
  body: '',
  category: '',
  position: 0,
  audience: [],
  isPublished: false,
};

/** "Cómo crear una sede" -> "como-crear-una-sede". */
const aSlug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export default function AdminAyudaPage() {
  const { showSuccess, showError, showConfirmation } = useSweetAlert();

  const [filas, setFilas] = useState<ArticuloResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  // null = cerrado; id vacío = artículo nuevo.
  const [editando, setEditando] = useState<{ id: string; datos: DatosDeArticulo } | null>(null);
  // Mientras no toque el enlace a mano, sigue al título.
  const [slugAMano, setSlugAMano] = useState(false);
  const [verPrevia, setVerPrevia] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setFilas(await listArticulos());
    } catch (e) {
      showError('No se pudo cargar la ayuda', mensajeDeError(e));
    } finally {
      setCargando(false);
    }
    // showError cambia en cada render; incluirlo recargaría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = async (fila?: ArticuloResumen) => {
    setVerPrevia(false);
    if (!fila) {
      setSlugAMano(false);
      setEditando({ id: '', datos: VACIO });
      return;
    }
    try {
      // La lista no trae el cuerpo; se pide al abrir.
      const { id, updatedAt: _u, ...datos } = await getArticulo(fila.slug);
      void _u;
      setSlugAMano(true);
      setEditando({ id, datos });
    } catch (e) {
      showError('No se pudo abrir el artículo', mensajeDeError(e));
    }
  };

  const cambiar = (parcial: Partial<DatosDeArticulo>) =>
    setEditando((e) => (e ? { ...e, datos: { ...e.datos, ...parcial } } : e));

  const guardar = async () => {
    if (!editando) return;
    const { id, datos } = editando;
    setGuardando(true);
    try {
      if (id) await actualizarArticulo(id, datos);
      else await crearArticulo(datos);
      showSuccess(id ? 'Artículo guardado' : 'Artículo creado');
      setEditando(null);
      await cargar();
    } catch (e) {
      showError('No se pudo guardar', mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const alternarPublicado = async (a: ArticuloResumen) => {
    try {
      await actualizarArticulo(a.id, { isPublished: !a.isPublished });
      await cargar();
    } catch (e) {
      showError('No se pudo cambiar', mensajeDeError(e));
    }
  };

  const borrar = async (a: ArticuloResumen) => {
    const ok = await showConfirmation(
      `¿Eliminar «${a.title}»?`,
      'Se borra para todos y el enlace deja de funcionar.',
      'Sí, eliminar',
    );
    if (!ok) return;
    try {
      await eliminarArticulo(a.id);
      await cargar();
    } catch (e) {
      showError('No se pudo eliminar', mensajeDeError(e));
    }
  };

  const d = editando?.datos;
  const valido = !!d && d.title.trim().length >= 3 && d.slug.length >= 3 && d.summary.trim().length >= 3 && d.category.trim().length >= 2 && d.body.trim().length > 0;

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <AdminHeader
            titulo="Base de conocimiento"
            descripcion="Los artículos del centro de ayuda. Un borrador solo lo ves tú; al publicarlo lo ven quienes pertenezcan a su audiencia."
            total={filas.length}
          />
          <Button onClick={() => void abrir()} className="bg-[#F26726] hover:bg-[#d9551c] shrink-0">
            <AiOutlinePlus className="mr-2" /> Nuevo artículo
          </Button>
        </div>

        <AdminTable
          columnas={['Artículo', 'Categoría', 'Audiencia', 'Estado', '']}
          cargando={cargando}
          vacio={filas.length === 0}
          mensajeVacio="Todavía no hay artículos. Crea el primero."
        >
          {filas.map((a) => (
            <tr key={a.id} className="border-b dark:border-gray-700">
              <td className="px-6 py-4">
                <Link
                  href={`/dashboard/ayuda/${a.slug}`}
                  className="font-medium text-gray-900 hover:underline dark:text-gray-100"
                >
                  {a.title}
                </Link>
                <p className="text-xs text-gray-500">/{a.slug}</p>
              </td>
              <td className="px-6 py-4">{a.category}</td>
              <td className="px-6 py-4">
                {a.audience.length === 0
                  ? 'Todos'
                  : a.audience.map((r) => ROLES.find((x) => x.valor === r)?.etiqueta ?? r).join(', ')}
              </td>
              <td className="px-6 py-4">
                <Badge color={a.isPublished ? 'success' : 'gray'} className="w-fit">
                  {a.isPublished ? 'Publicado' : 'Borrador'}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <Button size="xs" color="light" onClick={() => void alternarPublicado(a)}>
                    {a.isPublished ? 'Despublicar' : 'Publicar'}
                  </Button>
                  <Button size="xs" color="light" onClick={() => void abrir(a)}>
                    Editar
                  </Button>
                  <Button size="xs" color="light" onClick={() => void borrar(a)}>
                    Eliminar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>

        {editando && d && (
          <Modal show onClose={() => setEditando(null)} size="3xl">
            <ModalHeader>{editando.id ? 'Editar artículo' : 'Nuevo artículo'}</ModalHeader>
            <ModalBody className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <TextInput
                  id="titulo"
                  value={d.title}
                  onChange={(e) =>
                    cambiar({
                      title: e.target.value,
                      ...(slugAMano ? {} : { slug: aSlug(e.target.value) }),
                    })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="categoria">Categoría</Label>
                  <TextInput
                    id="categoria"
                    value={d.category}
                    onChange={(e) => cambiar({ category: e.target.value })}
                    placeholder="Primeros pasos, Pagos, Catálogo…"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Enlace</Label>
                  <TextInput
                    id="slug"
                    value={d.slug}
                    onChange={(e) => {
                      setSlugAMano(true);
                      cambiar({ slug: e.target.value });
                    }}
                    addon="/dashboard/ayuda/"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="resumen">Resumen</Label>
                <TextInput
                  id="resumen"
                  value={d.summary}
                  onChange={(e) => cambiar({ summary: e.target.value })}
                  placeholder="Una frase que diga de qué trata"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label htmlFor="cuerpo">Contenido (Markdown)</Label>
                  <button
                    type="button"
                    onClick={() => setVerPrevia((v) => !v)}
                    className="text-xs text-marca underline"
                  >
                    {verPrevia ? 'Seguir editando' : 'Vista previa'}
                  </button>
                </div>
                {verPrevia ? (
                  <div className="min-h-48 rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                    <ContenidoMarkdown texto={d.body} />
                  </div>
                ) : (
                  <Textarea
                    id="cuerpo"
                    rows={12}
                    value={d.body}
                    onChange={(e) => cambiar({ body: e.target.value })}
                    className="font-mono text-sm"
                  />
                )}
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  ¿Para quién es?
                </p>
                <div className="flex flex-wrap gap-4">
                  {ROLES.map((r) => (
                    <label key={r.valor} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={d.audience.includes(r.valor)}
                        onChange={(e) =>
                          cambiar({
                            audience: e.target.checked
                              ? [...d.audience, r.valor]
                              : d.audience.filter((x) => x !== r.valor),
                          })
                        }
                      />
                      {r.etiqueta}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">Sin marcar ninguno, lo ven todos.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={d.isPublished}
                  onChange={(e) => cambiar({ isPublished: e.target.checked })}
                />
                Publicado
              </label>
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => void guardar()} disabled={!valido || guardando} className="bg-[#F26726] hover:bg-[#d9551c]">
                {guardando ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button color="light" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}
