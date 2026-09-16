"use client"

import { useState, useEffect, Suspense } from 'react'
import RegistrationForm from '@/components/RegistrationForm'
import FiloLogo from '@/components/FiloLogo'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { RiInformationLine } from "react-icons/ri";
import { Tooltip } from 'flowbite-react'

/**
 * Si el registro de comensal esta abierto al publico.
 *
 * Apagado a proposito por ahora. Se deja como interruptor y no se borra el
 * codigo porque volver a abrirlo es cambiar este `false`, no rehacer la
 * pantalla.
 *
 * Ojo si se reabre por otra via: el alta con Google crea la cuenta con rol
 * GUEST (ver loginWithGoogle en el API), asi que exponer ese boton volveria a
 * abrir la puerta aunque esto siga en false.
 */
const REGISTRO_COMENSAL_ABIERTO = false

function RegisterContent() {
  const [isHost, setIsHost] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Con el registro de comensal cerrado, `?type=guest` se ignora: si no,
    // ocultar la pestaña seria decorativo y bastaria con saberse la URL.
    if (!REGISTRO_COMENSAL_ABIERTO) {
      setIsHost(true)
      return
    }
    if (!searchParams.get('type')) {
      setIsHost(true)
    } else if (searchParams.get('type') === 'host') {
      setIsHost(true)
    } else if (searchParams.get('type') === 'guest') {
      setIsHost(false)
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 w-full max-w-md mx-auto py-10 px-4">
        <FiloLogo className='w-full max-w-[200px]' />

        {/* Sin comensal solo queda una opcion, y una pestaña sola no es una
            eleccion: se cambia por el titulo de lo que se va a rellenar. */}
        {REGISTRO_COMENSAL_ABIERTO ? (
          <div className="flex items-center border-b border-gray-200 w-full space-x-4">
              <button className={`flex items-center gap-2 text-sm p-4 hover:text-[#f26726] transition border-b ${isHost ? 'border-[#f26726] text-[#f26726]' : 'border-transparent text-gray-500'} cursor-pointer`} onClick={() => setIsHost(true)}>
                  Anfitrión
                  <Tooltip content="Con este tipo de cuenta podrás crear experiencias y gestionarlas.">
                      <RiInformationLine className='w-4 h-4' />
                  </Tooltip>
              </button>
              <button className={`flex items-center gap-2 text-sm p-4 hover:text-[#f26726] transition border-b ${isHost ? 'border-transparent text-gray-500' : 'border-[#f26726] text-[#f26726]'} cursor-pointer`} onClick={() => setIsHost(false)}>
                  Comensal
                  <Tooltip content="Con este tipo de cuenta podrás consultar experiencias y reservar.">
                      <RiInformationLine className='w-4 h-4' />
                  </Tooltip>
              </button>
          </div>
        ) : (
          <h1 className="text-lg font-semibold text-[#334C5D] w-full text-center border-b border-gray-200 pb-4">
            Crear cuenta de anfitrión
          </h1>
        )}

        {isHost ?
        <>
          <div className='mb-4'>
            <p className='text-sm text-gray-500 text-center'>
              Registrate como anfitrión para gestionar tus experiencias.
            </p>
          </div>
          <RegistrationForm role="host" />
        </>
        :
        <>
        <div className='mb-4'>
          <p className='text-sm text-gray-500 text-center'>
            Registrate como comensal para consultar experiencias, cotizar y reservar.
          </p>
        </div>
        <RegistrationForm role="guest" />
        </>}

        {!REGISTRO_COMENSAL_ABIERTO && (
          <p className='text-sm text-gray-500 text-center'>
            Para reservar no hace falta cuenta: puedes hacerlo desde el
            catálogo de cada anfitrión.
          </p>
        )}

        <p className='text-sm text-gray-500'>
          ¿Ya tienes una cuenta? <Link href="/login" className='hover:text-[#f26726] transition underline'>Inicia sesión</Link>
        </p>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
