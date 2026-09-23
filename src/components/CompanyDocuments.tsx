"use client";

import React, { useState } from 'react';
import { HiSparkles } from 'react-icons/hi';
import DocumentUpload from './DocumentUpload';
import { nombreDeCiiu } from '@/data/ciiu';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { dvCoincide } from '@/lib/company/nit';
import {
  camposDesdeDocumento,
  telefonoDesdeDocumento,
  nombreDesdeDocumento,
  type CampoDetectado,
  type DatosExtraidos,
} from '@/lib/company/documentos';

interface CompanyDocumentsProps {
  rutKey: string;
  camaraKey: string;
  onRutChange: (key: string) => void;
  onCamaraChange: (key: string) => void;
  /** Aplica los campos al formulario. Lo hace quien lo usa, que es quien tiene RHF. */
  onAplicar: (campos: CampoDetectado[], telefono: string, nombre: string) => void;
  /**
   * Si se pide el certificado de Camara de Comercio.
   *
   * Una persona natural no esta inscrita, asi que pedirselo seria pedirle un
   * papel que no existe. Lo decide quien usa el componente, a partir del tipo
   * de persona.
   */
  pideCamara?: boolean;
}

type Tipo = 'rut' | 'camara';

/** Algunos campos guardan un codigo; en el resumen se enseña su nombre. */
const ETIQUETAS_DE_VALOR: Record<string, string> = {
  nit: 'NIT',
  cedula: 'Cédula',
  pasaporte: 'Pasaporte',
  other: 'Otro',
};

const paraMostrar = (campo: string, valor: string) => {
  if (campo === 'documentType') return ETIQUETAS_DE_VALOR[valor] ?? valor;
  // Un codigo CIIU a secas no le dice nada a nadie, y aqui es justo donde hay
  // que decidir si se aplica. Se acompaña del nombre cuando lo conocemos.
  if (campo === 'ciiuCode') {
    const nombre = nombreDeCiiu(valor);
    return nombre ? `${valor} · ${nombre}` : valor;
  }
  return valor;
};

/**
 * Carga del RUT y del certificado de Camara de Comercio, con lectura
 * automatica para no pedir dos veces lo que ya esta en el documento.
 *
 * El RUT trae NIT, razon social, direccion, ciudad y correo. Pedirselo a mano a
 * quien acaba de subirlo es pedirle que transcriba un papel que ya nos dio.
 */
export default function CompanyDocuments({
  rutKey,
  camaraKey,
  pideCamara = true,
  onRutChange,
  onCamaraChange,
  onAplicar,
}: CompanyDocumentsProps) {
  const [leyendo, setLeyendo] = useState<Tipo | null>(null);
  const { showError, showSuccess, showConfirmation } = useSweetAlert();

  const leer = async (file: File, tipo: Tipo) => {
    setLeyendo(tipo);
    try {
      const cuerpo = new FormData();
      cuerpo.append('archivo', file);
      cuerpo.append('tipo', tipo);

      // Tiempo limite. Un fetch colgado no falla nunca, se queda esperando: sin
      // esto el spinner giraria para siempre y, como durante la lectura no se
      // puede quitar el documento, la persona no tendria salida.
      const corte = new AbortController();
      const alarma = setTimeout(() => corte.abort(), 90_000);
      let res: Response;
      try {
        res = await fetch('/api/ai/extraer-documento', {
          method: 'POST',
          body: cuerpo,
          signal: corte.signal,
        });
      } finally {
        clearTimeout(alarma);
      }
      const json = await res.json();

      if (!res.ok) {
        // Que la lectura falle no invalida la subida: el documento ya esta
        // guardado y la persona puede rellenar a mano.
        showError(
          'No pudimos leer el documento',
          json.error || 'Puedes completar los datos a mano.',
        );
        return;
      }

      const datos = (json.datos ?? {}) as DatosExtraidos;
      const campos = camposDesdeDocumento(datos);

      if (campos.length === 0) {
        showError(
          'No encontramos datos en el documento',
          'Puede que la imagen esté borrosa o que no sea el documento esperado. Completa los campos a mano.',
        );
        return;
      }

      // El DV del documento contra el que sale del NIT leido. Si no cuadran,
      // lo mas probable es que el NIT se leyera mal: es un numero de nueve
      // cifras frente a una sola, asi que hay mas sitio donde fallar. No se
      // bloquea nada —el documento manda—, pero se avisa antes de aplicarlo.
      const nitLeido = campos.find((c) => c.campo === 'documentNumber')?.valor;
      const cuadra = nitLeido ? dvCoincide(nitLeido, datos.digitoVerificacion) : null;
      const aviso =
        cuadra === false
          ? ['', '⚠ El dígito de verificación del documento no coincide con el NIT que leímos. Revisa el número antes de continuar.']
          : [];

      // Se enseña antes de tocar nada: son varios campos de golpe y alguno
      // puede pisar lo que la persona ya escribio.
      const confirmado = await showConfirmation(
        'Esto encontramos en el documento',
        '',
        'Usar estos datos',
        'Prefiero escribirlos yo',
        [
          ...campos.map((c) => `• ${c.etiqueta}: ${paraMostrar(c.campo, c.valor)}`),
          ...aviso,
          '',
          'Se usarán para rellenar el formulario. Podrás corregir lo que quieras.',
        ],
      );
      if (!confirmado) return;

      onAplicar(campos, telefonoDesdeDocumento(datos), nombreDesdeDocumento(datos));
      showSuccess('Datos aplicados', 'Revísalos antes de continuar.');
    } catch (error) {
      console.error('Error leyendo documento:', error);
      const seAgoto = error instanceof DOMException && error.name === 'AbortError';
      showError(
        seAgoto ? 'La lectura tardó demasiado' : 'Error de red',
        // El documento ya esta guardado en los dos casos: lo unico que no se
        // pudo fue leerlo, y eso solo cuesta teclear.
        seAgoto
          ? 'Tu documento quedó guardado. Completa los datos a mano o inténtalo de nuevo.'
          : 'No pudimos leer el documento. Inténtalo de nuevo.',
      );
    } finally {
      setLeyendo(null);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        {leyendo ? (
          <div className="animate-spin rounded-full border-b-2 border-[#F26726] h-6 w-6 shrink-0 mt-0.5" />
        ) : (
          <HiSparkles className="w-6 h-6 text-[#F26726] shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <h4 className="font-semibold text-[#334C5D]">
            {leyendo
              ? `Analizando tu ${leyendo === 'rut' ? 'RUT' : 'certificado'}…`
              : 'Sube tus documentos y ahorra tiempo'}
          </h4>
          <p className="text-sm text-gray-600 mt-0.5">
            {leyendo
              ? 'Estamos leyendo los datos. Puede tardar unos segundos; no cierres ni recargues esta página.'
              : `Al cargar el RUT leemos el NIT, la razón social, la dirección, el
                 contacto y la actividad económica, y rellenamos el formulario por
                 ti. Siempre podrás corregirlo.`}
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${pideCamara ? 'sm:grid-cols-2' : ''}`}>
        <DocumentUpload
          label="RUT"
          value={rutKey || undefined}
          onChange={onRutChange}
          onArchivo={(f) => leer(f, 'rut')}
          disabled={leyendo !== null}
          analizando={leyendo === 'rut'}
          helpText="Opcional"
        />
        {/* Se sigue mostrando si ya hay uno subido aunque ahora no toque: la
            empresa pudo cambiar de tipo despues, y esconderselo dejaria un
            documento suyo guardado y sin forma de verlo ni quitarlo. */}
        {(pideCamara || camaraKey) && (
          <DocumentUpload
            label="Cámara de Comercio"
            value={camaraKey || undefined}
            onChange={onCamaraChange}
            onArchivo={(f) => leer(f, 'camara')}
            disabled={leyendo !== null}
            analizando={leyendo === 'camara'}
            helpText={
              pideCamara ? 'Opcional' : 'No aplica a una persona natural. Puedes quitarlo.'
            }
          />
        )}
      </div>
    </div>
  );
}
