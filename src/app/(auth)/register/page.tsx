"use client"

import { useState, useEffect, Suspense } from 'react'
import RegistrationForm from '@/components/RegistrationForm'
import FiloLogo from '@/components/FiloLogo'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { RiInformationLine } from "react-icons/ri";
import { Tooltip } from 'flowbite-react'

type RoleType = 'host' | 'guest' | 'reseller'

const ROLE_TABS: Array<{
  value: RoleType
  label: string
  tooltip: string
  description: string
}> = [
  {
    value: 'host',
    label: 'Anfitrión',
    tooltip: 'Con este tipo de cuenta podrás crear experiencias y gestionarlas.',
    description: 'Regístrate como anfitrión para gestionar tus experiencias.',
  },
  {
    value: 'guest',
    label: 'Comensal',
    tooltip: 'Con este tipo de cuenta podrás consultar experiencias y reservar.',
    description:
      'Regístrate como comensal para consultar experiencias, cotizar y reservar.',
  },
  {
    value: 'reseller',
    label: 'Revendedor',
    tooltip:
      'Con este tipo de cuenta podrás revender experiencias de anfitriones y ganar comisiones.',
    description:
      'Regístrate como revendedor para acceder al catálogo y compartir experiencias con tus clientes.',
  },
]

function RegisterContent() {
  const [role, setRole] = useState<RoleType>('host')
  const searchParams = useSearchParams()

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'host' || type === 'guest' || type === 'reseller') {
      setRole(type)
    } else {
      setRole('host')
    }
  }, [searchParams])

  const current = ROLE_TABS.find((r) => r.value === role) ?? ROLE_TABS[0]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 w-full max-w-md mx-auto py-10 px-4">
      <FiloLogo className="w-full max-w-[200px]" />

      <div className="flex flex-wrap items-center border-b border-gray-200 w-full">
        {ROLE_TABS.map((tab) => {
          const active = role === tab.value
          return (
            <button
              key={tab.value}
              className={`flex items-center gap-2 text-sm p-4 hover:text-[#f26726] transition border-b ${
                active
                  ? 'border-[#f26726] text-[#f26726]'
                  : 'border-transparent text-gray-500'
              } cursor-pointer`}
              onClick={() => setRole(tab.value)}
            >
              {tab.label}
              <Tooltip content={tab.tooltip}>
                <RiInformationLine className="w-4 h-4" />
              </Tooltip>
            </button>
          )
        })}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 text-center">{current.description}</p>
      </div>
      <RegistrationForm role={role} />

      <p className="text-sm text-gray-500">
        ¿Ya tienes una cuenta?{' '}
        <Link href="/login" className="hover:text-[#f26726] transition underline">
          Inicia sesión
        </Link>
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
