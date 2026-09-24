"use client";

import React, { useState, useEffect } from 'react';
import { Location } from '@/types';
import {
  createLocationInSanity,
  updateLocationInSanity
} from '@/lib/sanity/locationService';
import { getCompanyById } from '@/lib/sanity/companyService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { AiOutlineClose } from 'react-icons/ai';
import { COUNTRIES, COUNTRIES_MAP } from '@/lib/constants/countries';
import DepartamentoCiudad from './DepartamentoCiudad';
import TelefonoInput from './TelefonoInput';
import PaisFijo, { PAIS_FIJO_CODIGO } from './PaisFijo';
import MapaUbicacion, { type Coordenadas } from './MapaUbicacion';
import { TITULOS, type ContactoDeEmpresa } from '@/lib/company/contactos';

/**
 * El mapeo del API convierte los nulos en cadena vacia (`companyEmail ?? ''`),
 * asi que un `?? prev.x` nunca salta y acaba borrando lo que ya habia escrito
 * quien crea la sede. Aqui el vacio vuelve a ser "no hay dato".
 */
const conValor = (v?: string | null): string | undefined => {
  const s = v?.trim();
  return s ? s : undefined;
};

const sinTildes = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * La empresa guarda el pais como texto libre ("Colombia"); el select de la
 * sede trabaja con el codigo ISO ("CO"). Sin traducirlo el select se queda
 * en blanco aunque la empresa si tuviera pais.
 */
const aCodigoDePais = (valor?: string | null): string | undefined => {
  const v = conValor(valor);
  if (!v) return undefined;
  if (COUNTRIES_MAP[v.toUpperCase()]) return v.toUpperCase();
  return COUNTRIES.find(c => sinTildes(c.name) === sinTildes(v))?.code;
};

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
  /** Los contactos de la empresa, para elegir responsable entre ellos. */
  const [contactos, setContactos] = useState<ContactoDeEmpresa[]>([]);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);
  const { showSuccess, showError } = useSweetAlert();

  const handleUseCompanyData = async () => {
    try {
      setLoadingCompanyData(true);
      const company = await getCompanyById(companyId);
      if (!company) {
        showError('No se encontraron datos de la empresa');
        return;
      }

      // El pais no se copia: es Colombia siempre y no se elige.
      const copiado = {
        street: conValor(company.address?.street),
        city: conValor(company.address?.city),
        state: conValor(company.address?.state),
        postalCode: conValor(company.address?.postalCode),
        email: conValor(company.companyEmail),
        phone: conValor(company.companyPhone),
      };

      /**
       * Que se copio y que no.
       *
       * Antes se anunciaba "Datos de la empresa cargados" pasara lo que
       * pasara. Una empresa con correo pero sin direccion ni telefono daba el
       * mensaje de exito y dejaba los campos de direccion vacios: el boton
       * parecia roto cuando lo que faltaba era el dato en la empresa. Ahora se
       * dice cual vino y cual no, que es lo unico accionable.
       */
      const ETIQUETAS: Record<keyof typeof copiado, string> = {
        street: 'dirección',
        city: 'ciudad',
        state: 'departamento',
        postalCode: 'código postal',
        email: 'email',
        phone: 'teléfono',
      };
      const claves = Object.keys(copiado) as Array<keyof typeof copiado>;
      const vinieron = claves.filter((k) => copiado[k]).map((k) => ETIQUETAS[k]);
      // El codigo postal no se echa en falta: casi nadie lo tiene y listarlo
      // como ausente solo hace ruido.
      const faltaron = claves
        .filter((k) => !copiado[k] && k !== 'postalCode')
        .map((k) => ETIQUETAS[k]);

      if (vinieron.length === 0) {
        showError(
          'Tu empresa no tiene esos datos',
          'Completa la dirección y el contacto en la información de la empresa y vuelve a intentarlo.',
        );
        return;
      }

      setFormData(prev => ({
        ...prev,
        street: copiado.street ?? prev.street,
        city: copiado.city ?? prev.city,
        state: copiado.state ?? prev.state,
        postalCode: copiado.postalCode ?? prev.postalCode,
        email: copiado.email ?? prev.email,
        phone: copiado.phone ?? prev.phone,
      }));
      showSuccess(
        `Copiamos ${vinieron.join(', ')}`,
        faltaron.length
          ? `Tu empresa no tiene ${faltaron.join(', ')}. Complétalo aquí o en la información de la empresa.`
          : '',
      );
    } catch (error) {
      showError('Error al cargar los datos de la empresa');
      console.error(error);
    } finally {
      setLoadingCompanyData(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    let vigente = true;
    getCompanyById(companyId)
      .then((c) => {
        if (vigente) setContactos(c?.contacts ?? []);
      })
      // Sin contactos el bloque explica que hay que crearlos; no se rompe.
      .catch(() => {
        if (vigente) setContactos([]);
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
        isPublic: location.isPublic === true ? 'si' : location.isPublic === false ? 'no' : '',
        isActive: location.isActive !== false,
      });
      // Van juntas o no van: media coordenada no ubica nada.
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
            {!location && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    ¿Misma información que tu empresa?
                  </p>
                  <p className="text-xs text-blue-700">
                    Copia dirección, ciudad, email y teléfono de tu empresa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseCompanyData}
                  disabled={loadingCompanyData}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingCompanyData ? 'Cargando...' : 'Usar datos de mi empresa'}
                </button>
              </div>
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
