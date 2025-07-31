"use client"

import { useState } from 'react'
import FormRegisterHost from '@/components/FormRegisterHost'
import FormRegisterGuest from '@/components/FormRegisterGuest'

export default function Register() {
  const [isHost, setIsHost] = useState(true)

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 w-full max-w-md mx-auto">
        <div className="flex items-center border-b border-gray-200 w-full space-x-4">
            <button className={`text-sm p-4  border-b ${isHost ? 'border-[#f26726] text-[#f26726]' : 'border-transparent text-gray-500'} cursor-pointer`} onClick={() => setIsHost(true)}>
                Anfitrión
            </button>
            <button className={`text-sm p-4 border-b ${isHost ? 'border-transparent text-gray-500' : 'border-[#f26726] text-[#f26726]'} cursor-pointer`} onClick={() => setIsHost(false)}>
                Comensal
            </button>
        </div>
        {isHost ? <FormRegisterHost /> : <FormRegisterGuest />}
    </div>
  )
}
