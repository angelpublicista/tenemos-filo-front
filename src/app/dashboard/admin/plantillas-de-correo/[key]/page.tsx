"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, Label, Textarea, TextInput } from 'flowbite-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from '@/components/Loader';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  enviarPruebaDePlantilla,
  getPlantilla,
  guardarPlantilla,
  restaurarPlantilla,
  vistaPreviaDePlantilla,
  type ContenidoDePlantilla,
  type PlantillaDetalle,
} from '@/lib/api/plantillasDeCorreo';

const iguales = (a: ContenidoDePlantilla, b: ContenidoDePlantilla) =>
  a.subject === b.subject && a.title === b.title && a.body === b.body && a.buttonText === b.buttonText;

export default function EditarPlantillaDeCorreoPage() {
  const { key } = useParams<{ key: string }>();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();

  const [plantilla, setPlantilla] = useState<PlantillaDetalle | null>(null);
  const [borrador, setBorrador] = useState<ContenidoDePlantilla | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const [previa, setPrevia] = useState<{ subject: string; html: string } | null>(null);
  const [errorPrevia, setErrorPrevia] = useState<string | null>(null);

  const cuerpoRef = useRef<HTMLTextAreaElement>(null);

  const aplicar = useCallback((p: PlantillaDetalle) => {
    setPlantilla(p);
    setBorrador(p.actual);
  }, []);

  useEffect(() => {
    getPlantilla(key)
      .then(aplicar)
      .catch((e) => showError('No se pudo cargar la plantilla', mensajeDeError(e)))
      .finally(() => setCargando(false));
    // showError cambia en cada render; incluirlo recargaría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, aplicar]);

  // La vista previa sale del servidor, con la misma maqueta y los mismos
  // valores de ejemplo que un envío real. Con una pausa para no pedirla en
  // cada tecla.
  useEffect(() => {
    if (!borrador) return;
    const t = setTimeout(() => {
      vistaPreviaDePlantilla(key, borrador)
        .then((p) => {
          setPrevia(p);
          setErrorPrevia(null);
        })
        // Una variable mal escrita o un campo vacío: se dice, y se conserva la
        // última vista buena en vez de vaciarla.
        .catch((e) => setErrorPrevia(mensajeDeError(e)));
    }, 400);
    return () => clearTimeout(t);
  }, [key, borrador]);

  if (cargando) {
    return (
      <ProtectedRoute roles={['admin']}>
        <Loader />
      </ProtectedRoute>
    );
  }
  if (!plantilla || !borrador) {
    return (
      <ProtectedRoute roles={['admin']}>
        <p className="text-gray-500">No encontramos esta plantilla.</p>
      </ProtectedRoute>
    );
  }

  const cambiar = (parcial: Partial<ContenidoDePlantilla>) => setBorrador({ ...borrador, ...parcial });
  const sinGuardar = !iguales(borrador, plantilla.actual);
  const esElOriginal = iguales(borrador, plantilla.defecto);

  /** Inserta {{variable}} en el cuerpo, donde esté el cursor. */
  const insertarVariable = (clave: string) => {
    const el = cuerpoRef.current;
    const marca = `{{${clave}}}`;
    if (!el) return cambiar({ body: borrador.body + marca });
    const { selectionStart: a, selectionEnd: b } = el;
    cambiar({ body: borrador.body.slice(0, a) + marca + borrador.body.slice(b) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + marca.length, a + marca.length);
    });
  };

  const guardar = async () => {
    setOcupado(true);
    try {
      aplicar(await guardarPlantilla(key, borrador));
      showSuccess('Plantilla guardada', 'Los próximos correos saldrán con este texto.');
    } catch (e) {
      showError('No se pudo guardar', mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const restaurar = async () => {
    const ok = await showConfirmation(
      '¿Volver al texto original?',
      'Se descarta tu versión y los próximos correos saldrán con el texto que trae la plataforma.',
      'Sí, restaurar',
      'Cancelar',
    );
    if (!ok) return;
    setOcupado(true);
    try {
      aplicar(await restaurarPlantilla(key));
      showSuccess('Texto original restaurado', '');
    } catch (e) {
      showError('No se pudo restaurar', mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const probar = async () => {
    setOcupado(true);
    try {
      const { enviadoA } = await enviarPruebaDePlantilla(key, borrador);
      showSuccess('Prueba enviada', `Revisa ${enviadoA}. Lleva valores de ejemplo.`);
    } catch (e) {
      showError('No se pudo enviar la prueba', mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <Link href="/dashboard/admin/plantillas-de-correo" className="text-sm text-[#F26726] hover:underline">
        ← Plantillas de correo
      </Link>

      <div className="mt-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{plantilla.nombre}</h1>
          <Badge color={plantilla.personalizada ? 'info' : 'gray'}>
            {plantilla.personalizada ? 'Editada' : 'Texto original'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">{plantilla.cuando}.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div>
            <Label htmlFor="asunto" className="mb-1 block">
              Asunto
            </Label>
            <TextInput id="asunto" value={borrador.subject} onChange={(e) => cambiar({ subject: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="titulo" className="mb-1 block">
              Título (cabecera naranja)
            </Label>
            <TextInput id="titulo" value={borrador.title} onChange={(e) => cambiar({ title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cuerpo" className="mb-1 block">
              Cuerpo
            </Label>
            <Textarea
              id="cuerpo"
              ref={cuerpoRef}
              rows={14}
              value={borrador.body}
              onChange={(e) => cambiar({ body: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Admite HTML sencillo: <code>&lt;p&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;ul&gt;</code>,{' '}
              <code>&lt;ol&gt;</code>, <code>&lt;a href=&quot;…&quot;&gt;</code>.
            </p>
          </div>
          <div>
            <Label htmlFor="boton" className="mb-1 block">
              Texto del botón
            </Label>
            <TextInput
              id="boton"
              value={borrador.buttonText}
              onChange={(e) => cambiar({ buttonText: e.target.value })}
              placeholder="Vacío = sin botón"
            />
            <p className="mt-1 text-xs text-gray-500">El destino del botón lo define la plataforma.</p>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-gray-900">Variables</p>
            {plantilla.variables.length === 0 ? (
              <p className="text-xs text-gray-500">Esta plantilla no usa variables.</p>
            ) : (
              <ul className="space-y-1.5">
                {plantilla.variables.map((v) => (
                  <li key={v.clave} className="flex items-start gap-2 text-xs text-gray-600">
                    <button
                      type="button"
                      onClick={() => insertarVariable(v.clave)}
                      className="shrink-0 rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-800 hover:bg-gray-200"
                      title="Insertar en el cuerpo"
                    >
                      {`{{${v.clave}}}`}
                    </button>
                    <span>
                      {v.descripcion}. <span className="text-gray-400">Ej.: {v.ejemplo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-gray-500">Funcionan en el asunto, el título, el cuerpo y el botón.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button color="primary" onClick={guardar} disabled={ocupado || !sinGuardar || !!errorPrevia}>
              Guardar
            </Button>
            <Button color="light" onClick={probar} disabled={ocupado || !!errorPrevia}>
              Enviarme una prueba
            </Button>
            <Button
              color="light"
              onClick={() => setBorrador(plantilla.defecto)}
              disabled={ocupado || esElOriginal}
              title="Carga el texto original en el editor; no guarda hasta que pulses Guardar"
            >
              Cargar el original
            </Button>
            {plantilla.personalizada && (
              <Button color="light" onClick={restaurar} disabled={ocupado}>
                Restaurar
              </Button>
            )}
          </div>
        </Card>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <div>
              <p className="text-sm font-medium text-gray-900">Vista previa</p>
              <p className="text-xs text-gray-500">Con valores de ejemplo.</p>
            </div>
            {errorPrevia && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorPrevia}</p>
            )}
            {previa && (
              <>
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">Asunto: </span>
                  {previa.subject}
                </p>
                {/* sandbox sin permisos: el HTML es del administrador, pero se
                    muestra aislado de la sesión del panel de todas formas. */}
                <iframe
                  title="Vista previa del correo"
                  sandbox=""
                  srcDoc={previa.html}
                  className="h-[520px] w-full rounded-lg border border-gray-200 bg-white"
                />
              </>
            )}
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
