"use client"

import { useState, useEffect, Suspense } from 'react'
import FormRegisterHost from '@/components/FormRegisterHost'
import FormRegisterGuest from '@/components/FormRegisterGuest'
import FiloLogo from '@/components/FiloLogo'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { RiInformationLine } from "react-icons/ri";
import { Tooltip } from 'flowbite-react'

function RegisterContent() {
  const [isHost, setIsHost] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!searchParams.get('type')) {
      setIsHost(true)
    } else if (searchParams.get('type') === 'host') {
      setIsHost(true)
    } else if (searchParams.get('type') === 'guest') {
      setIsHost(false)
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 w-full max-w-md mx-auto">
        <FiloLogo className='w-full max-w-[200px]' />
        <div className="flex items-center border-b border-gray-200 w-full space-x-4">
            <button className={`flex items-center gap-2 text-sm p-4 hover:text-[#f26726] transition border-b ${isHost ? 'border-[#f26726] text-[#f26726]' : 'border-transparent text-gray-500'} cursor-pointer`} onClick={() => setIsHost(true)}>
                Anfitrión
                <Tooltip content="Con este tipo de cuenta podrás crear eventos y gestionarlos.">
                    <RiInformationLine className='w-4 h-4' />
                </Tooltip>
            </button>
            <button className={`flex items-center gap-2 text-sm p-4 hover:text-[#f26726] transition border-b ${isHost ? 'border-transparent text-gray-500' : 'border-[#f26726] text-[#f26726]'} cursor-pointer`} onClick={() => setIsHost(false)}>
                Comensal
                <Tooltip content="Con este tipo de cuenta podrás consultar eventos y reservar.">
                    <RiInformationLine className='w-4 h-4' />
                </Tooltip>
            </button>
        </div>
        {isHost ? <FormRegisterHost /> : <FormRegisterGuest />}

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
