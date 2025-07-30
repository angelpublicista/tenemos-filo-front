import React from 'react'
import { Button, TextInput, Label } from 'flowbite-react'
import FiloLogo from '@/components/FiloLogo'
import Link from 'next/link'

export default function Login() {
  return (
    <div className='flex flex-col items-center justify-center h-screen space-y-4'>
        <FiloLogo
            className='w-full max-w-[200px] mb-10'
        />
        <div className='flex flex-col items-center justify-center max-w-md w-full space-y-4'>
            <div className='flex flex-col items-center justify-center w-full space-y-2'>
                <Label color='gray' className='w-full'>Correo electrónico</Label>
                <TextInput color='white' placeholder='Correo electrónico' className='w-full' />
            </div>
            <div className='flex flex-col items-center justify-center w-full space-y-2'>
                <Label color='gray' className='w-full'>Contraseña</Label>
                <TextInput 
                    color='white' 
                    placeholder='Contraseña' 
                    className='w-full'
                    type='password'
                />
            </div>
            <div className='flex flex-col items-center justify-center w-full'>
                <Button fullSized className='w-full' color='primary'>Iniciar sesión</Button>
            </div>

            <p className='text-sm text-gray-500'>
                No tienes una cuenta? <Link href='/register' className='underline hover:text-[#f26726] transition'>Regístrate</Link>
            </p>
        </div>
    </div>
  )
}
