"use client";

import React from "react";
import { Button, TextInput, Label } from "flowbite-react";
import FiloLogo from "@/components/FiloLogo";
import Link from "next/link";
// react hook form
import { useForm } from "react-hook-form";

export default function Login() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <FiloLogo className="w-full max-w-[200px] mb-10" />
      <form
        className="flex flex-col items-center justify-center max-w-md w-full space-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col items-center justify-center w-full space-y-2">
          <Label color="gray" className="w-full">
            Correo electrónico
          </Label>
          <TextInput
            {...register("email")}
            color="white"
            placeholder="Correo electrónico"
            className="w-full"
          />
        </div>
        <div className="flex flex-col items-center justify-center w-full space-y-2">
          <Label color="gray" className="w-full">
            Contraseña
          </Label>
          <TextInput
            {...register("password")}
            color="white"
            placeholder="Contraseña"
            className="w-full"
            type="password"
          />
        </div>
        <div className="flex flex-col items-center justify-center w-full">
          <Button fullSized className="w-full" color="primary">
            Iniciar sesión
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="underline hover:text-[#f26726] transition"
          >
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
