import { useForm } from "react-hook-form";
import { TextInput, Button, Checkbox, Label } from "flowbite-react";
import Link from "next/link";
import "react-international-phone/style.css";

interface formData {
  fname: string;
  lname: string;
  email: string;
  password: string;
  terms: boolean;
}

export default function FormRegisterGuest() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<formData>();

  const onSubmit = (data: formData) => {
    console.log(data);
  };

  return (
    <div className="w-full">
      <form className="w-full space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Nombres <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            placeholder="Nombres"
            {...register("fname", { required: true })}
          />
        </div>
        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Apellidos <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            placeholder="Apellidos"
            {...register("lname", { required: true })}
          />
        </div>
        
        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Email <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            type="email"
            placeholder="Email"
            {...register("email", { required: true })}
          />
        </div>
        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Contraseña <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            type="password"
            placeholder="Contraseña"
            {...register("password", { required: true })}
          />
        </div>
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="terms"
            color="white"
            {...register("terms", { required: true })}
          />
          <Label color="gray" htmlFor="terms" className="text-sm">
            Acepto los{" "}
            <Link
              href="/terms"
              target="_blank"
              className="underline hover:text-[#f26726] transition"
            >
              términos y condiciones
            </Link>{" "}
            <span className="text-red-500">*</span>
          </Label>
        </div>
        <Button type="submit" color="primary" className="w-full">
          Registrarse como Comensal
        </Button>
      </form>
    </div>
  );
}
