"use client";

import { forwardRef, useState } from "react";
import { TextInput, type TextInputProps } from "flowbite-react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

/**
 * Campo de contraseña con un botón para verla.
 *
 * Reenvía la ref y el resto de props al TextInput, así que sirve igual con
 * `register()` de react-hook-form que con `value`/`onChange`.
 */
const InputContrasena = forwardRef<HTMLInputElement, Omit<TextInputProps, "type" | "rightIcon">>(
  function InputContrasena(props, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative w-full">
        <TextInput {...props} ref={ref} type={visible ? "text" : "password"} />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
        >
          {visible ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
        </button>
      </div>
    );
  },
);

export default InputContrasena;
