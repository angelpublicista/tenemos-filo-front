"use client";

import React, { useState, useEffect, useRef } from 'react';
import TelefonoInput from './TelefonoInput';
import { useAuth } from '@/lib/auth/AuthContext';
import Avatar from './Avatar';
import { uploadImage } from '@/lib/api/uploads';
import { updateUserProfile } from '@/lib/sanity/userService';
import { Button, TextInput, Select } from 'flowbite-react';
import { 
  HiPencilAlt, 
  HiCheckCircle, 
  HiRefresh,
  HiUser,
  HiCamera,
  HiMail,
  HiPhone,
  HiIdentification,
  HiShieldCheck
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from './Loader';

export default function ProfileView() {
  const { user, sanityUser , refrescarPerfil} = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { showError, showSuccess, showDestructiveConfirmation } = useSweetAlert();

  // Estados para el formulario de edición
  const [formData, setFormData] = useState({
    name: sanityUser?.name || '',
    phone: sanityUser?.phone || '',
    typeDocument: sanityUser?.typeDocument || 'cedula',
    documentNumber: sanityUser?.documentNumber || '',
  });

  // Manejar el estado de carga inicial
  useEffect(() => {
    if (sanityUser) {
      setIsLoadingData(false);
      // Actualizar formData cuando sanityUser esté disponible
      setFormData({
        name: sanityUser.name || '',
        phone: sanityUser.phone || '',
        typeDocument: sanityUser.typeDocument || 'cedula',
        documentNumber: sanityUser.documentNumber || '',
      });
    }
  }, [sanityUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  /**
   * La foto se guarda al momento, no al pulsar "Guardar cambios".
   *
   * Es lo que espera quien la sube: se ve el cambio y ya esta. Y el fichero ya
   * viajo a S3, asi que dejarlo subido pero sin enlazar seria peor.
   */
  const cambiarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showError('Selecciona una imagen', 'Vale JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('La imagen es muy pesada', 'El límite son 5 MB.');
      return;
    }

    try {
      setSubiendoFoto(true);
      const url = await uploadImage(file, 'avatars');
      await updateUserProfile(user.uid, { image: url });
      await refrescarPerfil();
      showSuccess('Foto actualizada');
    } catch (error) {
      console.error('Error subiendo la foto:', error);
      showError('No se pudo subir la foto', 'Inténtalo de nuevo.');
    } finally {
      setSubiendoFoto(false);
      // Sin esto, volver a elegir el mismo fichero no dispara el evento.
      if (fotoInputRef.current) fotoInputRef.current.value = '';
    }
  };

  const quitarFoto = async () => {
    if (!user) return;
    const confirmado = await showDestructiveConfirmation(
      '¿Quitar tu foto?',
      'Volverán a aparecer tus iniciales.',
      'Sí, quitarla',
    );
    if (!confirmado) return;
    try {
      setSubiendoFoto(true);
      await updateUserProfile(user.uid, { image: '' });
      await refrescarPerfil();
      showSuccess('Foto eliminada');
    } catch (error) {
      console.error('Error quitando la foto:', error);
      showError('No se pudo quitar la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleSave = async () => {
    if (!user || !sanityUser) return;

    try {
      setIsLoading(true);

      // Validaciones básicas
      if (!formData.name.trim()) {
        showError('El nombre es requerido');
        return;
      }

      if (!formData.phone.trim()) {
        showError('El teléfono es requerido');
        return;
      }

      if (!formData.documentNumber.trim()) {
        showError('El número de documento es requerido');
        return;
      }

      // Actualizar en Sanity
      await updateUserProfile(user.uid, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        typeDocument: formData.typeDocument as 'nit' | 'cedula' | 'pasaporte' | 'other',
        documentNumber: formData.documentNumber.trim(),
      });

      showSuccess('Perfil actualizado exitosamente');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Restaurar datos originales
    setFormData({
      name: sanityUser?.name || '',
      phone: sanityUser?.phone || '',
      typeDocument: sanityUser?.typeDocument || 'cedula',
      documentNumber: sanityUser?.documentNumber || '',
    });
    setIsEditing(false);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'host': return 'Anfitrión';
      case 'admin': return 'Administrador';
      case 'guest': return 'Comensal';
      default: return role;
    }
  };

  const getDocumentTypeDisplayName = (type: string) => {
    switch (type) {
      case 'nit': return 'NIT';
      case 'cedula': return 'Cédula';
      case 'pasaporte': return 'Pasaporte';
      case 'other': return 'Otro';
      default: return type;
    }
  };

  if (isLoadingData) {
    return <Loader message="Cargando información del perfil..." />;
  }

  if (!sanityUser) {
    return <Loader message="Cargando información del perfil..." />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
        <div className="flex items-center min-w-0">
          <div className="relative mr-3 sm:mr-4 shrink-0">
            <Avatar
              imagen={sanityUser.image}
              nombre={sanityUser.name}
              email={sanityUser.email}
              tamaño="lg"
            />
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={cambiarFoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              disabled={subiendoFoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F26726] text-white flex items-center justify-center shadow-sm hover:bg-[#d9571f] transition-colors cursor-pointer disabled:opacity-60"
              aria-label={sanityUser.image ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
              title={sanityUser.image ? 'Cambiar foto' : 'Subir foto'}
            >
              {subiendoFoto ? (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <HiCamera className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-semibold text-[#334C5D] mb-1 truncate">
              {sanityUser.name}
            </h3>
            {/* Solo si hay algo que quitar: sin foto, el enlace no tendria
                sentido y ensuciaria la cabecera. */}
            {sanityUser.image && (
              <button
                type="button"
                onClick={quitarFoto}
                disabled={subiendoFoto}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors underline cursor-pointer disabled:opacity-60"
              >
                Quitar foto
              </button>
            )}
            <div className="flex items-center text-green-600">
              <HiShieldCheck className="w-4 h-4 mr-2 shrink-0" />
              <span className="text-sm font-medium">
                {getRoleDisplayName(sanityUser.role)}
              </span>
            </div>
          </div>
        </div>

        {!isEditing && (
          <Button
            color="gray"
            onClick={() => setIsEditing(true)}
            className="w-full sm:w-auto"
          >
            <HiPencilAlt className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Información Personal */}
        <div className="space-y-6">
          <h4 className="text-lg sm:text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
            Información Personal
          </h4>
          
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">
                <HiUser className="w-4 h-4 inline mr-1" />
                Nombre Completo
              </label>
              {isEditing ? (
                <TextInput
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ingresa tu nombre completo"
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900 font-medium text-lg">
                  {sanityUser.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">
                <HiMail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <p className="text-gray-900">{sanityUser.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                El email no se puede cambiar desde aquí
              </p>
            </div>

            {/* Teléfono */}
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">
                <HiPhone className="w-4 h-4 inline mr-1" />
                Teléfono
              </label>
              {isEditing ? (
                <TelefonoInput
                  value={formData.phone}
                  onChange={(v) => handleInputChange('phone', v)}
                />
              ) : (
                <p className="text-gray-900">{sanityUser.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Información de Documento */}
        <div className="space-y-6">
          <h4 className="text-lg sm:text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
            Información de Documento
          </h4>

          <div className="space-y-4">
            {/* Tipo de Documento */}
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">
                <HiIdentification className="w-4 h-4 inline mr-1" />
                Tipo de Documento
              </label>
              {isEditing ? (
                <Select
                  value={formData.typeDocument}
                  onChange={(e) => handleInputChange('typeDocument', e.target.value)}
                  className="w-full"
                >
                  <option value="cedula">Cédula</option>
                  <option value="nit">NIT</option>
                  <option value="pasaporte">Pasaporte</option>
                  <option value="other">Otro</option>
                </Select>
              ) : (
                <p className="text-gray-900 ">
                  {getDocumentTypeDisplayName(sanityUser.typeDocument)}
                </p>
              )}
            </div>

            {/* Número de Documento */}
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">
                Número de Documento
              </label>
              {isEditing ? (
                <TextInput
                  value={formData.documentNumber}
                  onChange={(e) => handleInputChange('documentNumber', e.target.value)}
                  placeholder="Ingresa tu número de documento"
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{sanityUser.documentNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Información de Cuenta */}
        <div className="space-y-6 lg:col-span-2">
          <h4 className="text-lg sm:text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
            Información de Cuenta
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500 block mb-2">
                Estado de la Cuenta
              </label>
              <div className="flex items-center">
                <HiCheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <p className="text-gray-900 font-semibold">
                  {sanityUser.isActive ? 'Activa' : 'Inactiva'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500 block mb-2">
                Fecha de Registro
              </label>
              <p className="text-gray-900 font-semibold">
                {new Date(sanityUser.createdAt).toLocaleDateString('es-ES')}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500 block mb-2">
                Última Actualización
              </label>
              <p className="text-gray-900 font-semibold">
                {new Date(sanityUser.updatedAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4">
          <Button
            color="gray"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <HiRefresh className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <HiCheckCircle className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs sm:text-sm text-gray-500 break-all">
          <p>
            ID de usuario: {sanityUser._id}
          </p>
          <p>
            ID: {(sanityUser.firebaseId ?? sanityUser._id).substring(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}
