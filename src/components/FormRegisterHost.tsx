import { useForm } from 'react-hook-form'
import { TextInput, Button, Checkbox, Label } from 'flowbite-react'

export default function FormRegisterHost() {
  return (
    <div className='w-full'>
        <form className='w-full space-y-2'>
            <TextInput color='white' placeholder="Nombres" />
            <TextInput color='white' placeholder="Apellidos" />
            <TextInput color='white' type='tel' placeholder="Teléfono" />
            <TextInput color='white' type='email' placeholder="Email" />
            <TextInput color='white' type='password' placeholder="Contraseña" />
            <div className="flex items-center gap-2 py-2">
              <Checkbox color='white' />
              <Label color="gray" className="text-sm">Acepto los términos y condiciones</Label>
            </div>
            <Button color='primary' className='w-full'>Registrarse</Button>
        </form>
    </div>
  )
}
