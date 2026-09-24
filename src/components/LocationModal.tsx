"use client";

import React, { useState, useEffect } from 'react';
import { Company, Location } from '@/types';
import {
  createLocationInSanity,
  updateLocationInSanity
} from '@/lib/sanity/locationService';
import { getCompanyById } from '@/lib/sanity/companyService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { AiOutlineClose } from 'react-icons/ai';
import DepartamentoCiudad from './DepartamentoCiudad';
import TelefonoInput from './TelefonoInput';
import PaisFijo, { PAIS_FIJO_CODIGO } from './PaisFijo';
import MapaUbicacion, { type Coordenadas } from './MapaUbicacion';
import GaleriaDeFotos from './GaleriaDeFotos';
import SalonesDeSede, { errorDeSalon, type Salon } from './SalonesDeSede';
import { TITULOS, type ContactoDeEmpresa } from '@/lib/company/contactos';
import { datosCopiables, resumenDeCopia } from '@/lib/company/copiarALaSede';

/**
 * El mapeo del API convierte los nulos en cadena vacia (`companyEmail ?? ''`),
 * asi que un `?? prev.x` nunca salta y acaba borrando lo que ya habia escrito
 * quien crea la sede. Aqui el vacio vuelve a ser "no hay dato".
 */
interface LocationModalProps {
  location: Location | null;
  companyId: string;
  onClose: () => void;
  onSave: (updatedLocations: Location[]) => void;
  existingLocations: Location[];
}

const LocationModal: React.FC<LocationModalProps> = ({
  location,
  companyId,
  onClose,
  onSave,
  existingLocations,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isMain: false,
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'CO',
    phone: '',
    email: '',
    maxCapacity: '',
    responsibleContactId: '',
    videoUrl: '',
    // '' = sin declarar, que es como quedan las sedes anteriores a este campo.
    isPublic: '' as '' | 'si' | 'no',
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  /**
   * El pin. Aparte de formData porque son numeros y no texto, y porque el
   * mapa las entrega ya en su forma final: meterlas ahi obligaria a
   * convertirlas de ida y vuelta en cada arrastre.
   */
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  /** Fotos en orden; la primera es la principal. Aparte de formData: es una
   *  lista, no un campo de texto. */
  const [fotos, setFotos] = useState<string[]>([]);
  /**
   * La respuesta a "¿tiene espacios diferenciados?", y los salones.
   *
   * '' es "sin contestar": distinto de "no". Las sedes anteriores a este campo
   * estan asi, y no se les supone ninguna de las dos.
   */
  const [tieneSalones, setTieneSalones] = useState<'' | 'si' | 'no'>('');
  const [salones, setSalones] = useState<Salon[]>([]);
  const [erroresSalones, setErroresSalones] = useState(false);
  /**
   * La empresa, cargada una sola vez al abrir.
   *
   * Da dos cosas: los contactos para elegir responsable, y que datos hay para
   * copiar. Antes se pedia por separado y otra vez en cada pulsacion del
   * boton de copiar.
   */
  const [empresa, setEmpresa] = useState<Company | null>(null);
  const contactos: ContactoDeEmpresa[] = empresa?.contacts ?? [];
  const copiables = datosCopiables(empresa);
  const { showSuccess, showError } = useSweetAlert();

  /**
   * Copia a la sede lo que la empresa tenga.
   *
   * Ya no pide la empresa: se cargo al abrir el modal, y con ella se decide
   * si este boton siquiera se puede pulsar. Aqui solo se aplica.
   */
  const handleUseCompanyData = () => {
    if (!copiables.hayAlgo) return;
    const v = copiables.valores;
    setFormData((prev) => ({
      ...prev,
      street: v.street ?? prev.street,
      city: v.city ?? prev.city,
      state: v.state ?? prev.state,
      postalCode: v.postalCode ?? prev.postalCode,
      email: v.email ?? prev.email,
      phone: v.phone ?? prev.phone,
    }));
    showSuccess(`Copiamos ${copiables.disponibles.join(', ')}`, resumenDeCopia(copiables));
  };

  useEffect(() => {
    if (!companyId) return;
    let vigente = true;
    getCompanyById(companyId)
      .then((c) => {
        if (vigente) setEmpresa(c);
      })
      // Sin empresa, cada bloque explica lo suyo; nada se rompe.
      .catch(() => {
        if (vigente) setEmpresa(null);
      });
    return () => {
      vigente = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        isMain: location.isMain || false,
        street: location.address?.street || '',
        city: location.address?.city || '',
        state: location.address?.state || '',
        postalCode: location.address?.postalCode || '',
        country: location.address?.country || 'CO',
        phone: location.contactInfo?.phone || '',
        email: location.contactInfo?.email || '',
        maxCapacity: location.maxCapacity?.toString() || '',
        responsibleContactId: location.responsibleContactId || '',
        videoUrl: location.videoUrl || '',
        isPublic: location.isPublic === true ? 'si' : location.isPublic === false ? 'no' : '',
        isActive: location.isActive !== false,
      });
      // Van juntas o no van: media coordenada no ubica nada.
      setFotos(location.photos ?? []);
      setTieneSalones(location.hasRooms === true ? 'si' : location.hasRooms === false ? 'no' : '');
      setSalones(
        (location.rooms ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? '',
          maxCapacity: String(r.maxCapacity),
          photos: r.photos ?? [],
          isActive: r.isActive,
        })),
      );
      setCoordenadas(
        typeof location.latitude === 'number' && typeof location.longitude === 'number'
          ? { lat: location.latitude, lng: location.longitude }
          : null,
      );
    } else {
      // Para nueva sede, verificar si ya existe una principal
      const hasMainLocation = existingLocations.some(loc => loc.isMain);
      setFormData(prev => ({
        ...prev,
        isMain: !hasMainLocation, // Si no hay principal, esta será principal
        country: 'CO', // Por defecto Colombia
      }));
    }
  }, [location, existingLocations]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Por favor ingresa el nombre de la sede');
      return;
    }

    if (!formData.street.trim()) {
      showError('Por favor ingresa la dirección');
      return;
    }

    if (!formData.city.trim()) {
      showError('Por favor ingresa la ciudad');
      return;
    }

    if (tieneSalones === 'si') {
      if (salones.length === 0) {
        showError('Añade al menos un salón', 'O responde que la sede no tiene espacios diferenciados.');
        return;
      }
      if (salones.some((x) => errorDeSalon(x))) {
        setErroresSalones(true);
        showError('Revisa los salones', 'Cada salón necesita nombre y capacidad máxima.');
        return;
      }
    }
    setErroresSalones(false);

    const video = formData.videoUrl.trim();
    if (video && !/^https?:\/\/\S+\.\S+/.test(video)) {
      showError('El enlace del video no parece válido', 'Debe empezar por http:// o https://');
      return;
    }

    if (!formData.responsibleContactId) {
      showError('Elige la persona responsable de la sede');
      return;
    }

    // La capacidad es obligatoria. Se corta aqui y no se deja llegar al API,
    // que contestaria un 400 sin decir cual de los campos falla.
    const capacidad = Number(formData.maxCapacity);
    if (!formData.maxCapacity.trim() || !Number.isInteger(capacidad) || capacidad < 1) {
      showError('Indica la capacidad máxima de la sede (al menos 1 persona)');
      return;
    }

    try {
      setSaving(true);

      const locationData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isMain: formData.isMain,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
          // El pais ya no se elige: se guarda el unico que hay.
          country: PAIS_FIJO_CODIGO,
        },
        contactInfo: {
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
        },
        maxCapacity: capacidad,
        responsibleContactId: formData.responsibleContactId || null,
        photos: fotos,
        videoUrl: formData.videoUrl.trim() || null,
        hasRooms: tieneSalones === '' ? null : tieneSalones === 'si',
        // Si dice que no tiene, se manda la lista vacia: contestar "no"
        // despues de haber creado salones tiene que borrarlos, o quedarian
        // guardados y sin forma de verlos.
        rooms:
          tieneSalones === 'si'
            ? salones.map((x) => ({
                ...(x.id ? { id: x.id } : {}),
                name: x.name.trim(),
                description: x.description?.trim() || undefined,
                maxCapacity: Number(x.maxCapacity),
                photos: x.photos,
                isActive: x.isActive,
              }))
            : [],
        latitude: coordenadas?.lat ?? null,
        longitude: coordenadas?.lng ?? null,
        // Sin responder se manda null: "no lo he dicho" no es lo mismo que
        // "no esta abierta al publico".
        isPublic: formData.isPublic === '' ? null : formData.isPublic === 'si',
        isActive: formData.isActive,
      };

      let updatedLocations: Location[];

      if (location) {
        // Actualizar sede existente
        const updated = await updateLocationInSanity(location._id, locationData);
        updatedLocations = existingLocations.map(loc => 
          loc._id === location._id ? updated : loc
        );
        showSuccess('Sede actualizada exitosamente');
      } else {
        // Crear nueva sede
        const newLocation = await createLocationInSanity({
          ...locationData,
          companyId,
        });
        updatedLocations = [...existingLocations, newLocation as Location];
        showSuccess('Sede creada exitosamente');
      }

      onSave(updatedLocations);
    } catch (error) {
      showError('Error al guardar la sede');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#334C5D]">
              {location ? 'Editar Sede' : 'Nueva Sede'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <AiOutlineClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Se dice ANTES de pulsar que hay para copiar. Enterarse despues
                de que no habia nada es enterarse tarde: el boton parece roto
                cuando lo que falta es el dato en la empresa. */}
            {!location && (
              copiables.hayAlgo ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-3 text-left">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      ¿Misma información que tu empresa?
                    </p>
                    <p className="text-xs text-blue-700">
                      Se copiará: {copiables.disponibles.join(', ')}.
                    </p>
                    {copiables.faltantes.length > 0 && (
                      <p className="mt-1 text-xs text-blue-700/80">
                        Tu empresa no tiene {copiables.faltantes.join(', ')}; eso
                        tendrás que escribirlo aquí.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCompanyData}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Usar datos de mi empresa
                  </button>
                </div>
              ) : (
                // Nada que copiar. No se enseña un boton que no haria nada:
                // se explica por que y donde se arregla.
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-left">
                  <p className="text-sm font-medium text-gray-700">
                    Tu empresa no tiene datos que copiar
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    No hay dirección ni datos de contacto guardados en la
                    información de tu empresa. Complétalos allí y este atajo
                    aparecerá, o escribe los de esta sede abajo.
                  </p>
                </div>
              )
            )}

            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información Básica
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Nombre de la Sede *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: Sede Centro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Descripción de la sede..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isMain}
                      onChange={(e) => handleInputChange('isMain', e.target.checked)}
                      className="w-4 h-4 text-[#F26726] rounded focus:ring-[#F26726]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sede Principal
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="w-4 h-4 text-[#F26726] rounded focus:ring-[#F26726]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sede Activa
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Dirección
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Calle y Número *
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: Calle 50 #25-30"
                  />
                </div>

                <DepartamentoCiudad
                  departamento={formData.state}
                  ciudad={formData.city}
                  onDepartamentoChange={(v) => handleInputChange('state', v)}
                  onCiudadChange={(v) => handleInputChange('city', v)}
                  pais={PAIS_FIJO_CODIGO}
                  idDepartamento="sede-state"
                  idCiudad="sede-city"
                  requerido
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                      placeholder="Ej: 110111"
                    />
                  </div>
                  <div className="text-left">
                    <PaisFijo id="location-country" />
                  </div>
                </div>

                <div className="text-left">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Ubicación en el mapa
                  </label>
                  <MapaUbicacion
                    valor={coordenadas}
                    onChange={setCoordenadas}
                    direccion={{
                      street: formData.street,
                      city: formData.city,
                      state: formData.state,
                    }}
                    editable
                  />
                </div>
              </div>
            </div>

            {/* Contacto de la sede: el del local, no el de una persona. */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Contacto de la sede</h3>
              <p className="mb-4 text-sm text-gray-500 text-left">
                Los datos del local, los que se pueden publicar. Por ejemplo el
                fijo del restaurante o reservas@turestaurante.com.
              </p>
              <div className="space-y-4">
                <TelefonoInput label="Teléfono de la sede" value={formData.phone} onChange={(v) => handleInputChange('phone', v)} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Email de la sede
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: reservas@turestaurante.com"
                  />
                </div>
              </div>
            </div>

            {/* Persona responsable: se elige, no se teclea. Sus datos ya estan
                guardados una vez en los contactos de la empresa, y repetirlos
                aqui los condenaria a quedarse viejos. */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Persona responsable de la sede <span className="text-red-500">*</span>
              </h3>
              <p className="mb-4 text-sm text-gray-500 text-left">
                Quién responde por esta sede. Se elige entre los contactos de tu
                empresa.
              </p>

              {contactos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-left">
                  <p className="text-sm text-gray-600">
                    Todavía no tienes contactos registrados. Añádelos en los
                    datos de tu empresa y vuelve aquí para asignar el
                    responsable.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contactos.map((c) => (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        formData.responsibleContactId === c.id
                          ? 'border-[#F26726] bg-orange-50'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="responsable"
                        className="mt-1 accent-[#F26726]"
                        checked={formData.responsibleContactId === c.id}
                        onChange={() => handleInputChange('responsibleContactId', c.id ?? '')}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">
                          {c.name}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {c.type === 'otro' ? c.label : TITULOS[c.type]}
                          {c.position ? ` · ${c.position}` : ''}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Espacios / salones. Se pregunta primero: si la sede funciona
                como un solo espacio, no hay nada mas que enseñar y un bloque
                de salones vacio solo confundiria. */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Espacios o salones</h3>
              <label className="mb-3 block text-sm font-medium text-gray-700 text-left">
                ¿La sede tiene espacios o salones diferenciados?
              </label>
              <div className="flex gap-3">
                {([
                  { valor: 'no', texto: 'No' },
                  { valor: 'si', texto: 'Sí' },
                ] as const).map((o) => (
                  <label
                    key={o.valor}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                      tieneSalones === o.valor
                        ? 'border-[#F26726] bg-orange-50 text-[#F26726] font-medium'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tieneSalones"
                      value={o.valor}
                      checked={tieneSalones === o.valor}
                      onChange={(e) => setTieneSalones(e.target.value as 'si' | 'no')}
                      className="accent-[#F26726]"
                    />
                    {o.texto}
                  </label>
                ))}
              </div>

              {tieneSalones === 'no' && (
                <p className="mt-2 text-sm text-gray-500 text-left">
                  La sede completa funciona como espacio para las experiencias.
                </p>
              )}

              {tieneSalones === 'si' && (
                <div className="mt-4">
                  <SalonesDeSede
                    valor={salones}
                    onChange={setSalones}
                    mostrarErrores={erroresSalones}
                    disabled={saving}
                  />
                </div>
              )}
            </div>

            {/* Fotos y video */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Fotos y video</h3>
              <p className="mb-4 text-sm text-gray-500 text-left">
                Cómo se ve la sede. La primera foto es la que representa al
                lugar; puedes cambiar el orden y cuál va primero.
              </p>

              <GaleriaDeFotos valor={fotos} onChange={setFotos} disabled={saving} />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Video <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="mt-1 text-sm text-gray-500 text-left">
                  Pega el enlace; no subimos el archivo. Los de YouTube y Vimeo
                  se ven dentro de la página, cualquier otro se enlaza.
                </p>
              </div>
            </div>

            {/* Capacidad y acceso */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Capacidad y acceso</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    ¿Es un establecimiento abierto al público?
                  </label>
                  <div className="flex gap-3">
                    {([
                      { valor: 'si', texto: 'Sí' },
                      { valor: 'no', texto: 'No' },
                    ] as const).map((o) => (
                      <label
                        key={o.valor}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                          formData.isPublic === o.valor
                            ? 'border-[#F26726] bg-orange-50 text-[#F26726] font-medium'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="isPublic"
                          value={o.valor}
                          checked={formData.isPublic === o.valor}
                          onChange={(e) => handleInputChange('isPublic', e.target.value)}
                          className="accent-[#F26726]"
                        />
                        {o.texto}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Capacidad máxima de la sede <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.maxCapacity}
                    onChange={(e) => handleInputChange('maxCapacity', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: 100"
                    min="1"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500 text-left">
                    Número máximo de personas que puede recibir simultáneamente.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Guardando...' : (location ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;
