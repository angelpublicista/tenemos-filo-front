"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HiPlus, HiX } from "react-icons/hi";
import { AiOutlineCalendar, AiOutlineTeam } from "react-icons/ai";
import { useAuth } from "@/lib/auth/AuthContext";

interface MobileFABProps {
  hidden?: boolean;
}

export default function MobileFAB({ hidden = false }: MobileFABProps) {
  const { sanityUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (hidden && isOpen) setIsOpen(false);
  }, [hidden, isOpen]);

  if (sanityUser?.role !== "host") return null;

  const close = () => setIsOpen(false);

  const actions = [
    {
      label: "Crear Experiencia",
      href: "/dashboard/experiences/create",
      icon: AiOutlineCalendar,
      bg: "bg-[#F26726]",
    },
    {
      label: "Nueva Reserva",
      href: "/dashboard/reservations?new=true",
      icon: AiOutlineTeam,
      bg: "bg-[#19A3A2]",
    },
  ];

  return (
    <div className={`sm:hidden ${hidden ? "hidden" : ""}`}>
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú de acciones"
          onClick={close}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] animate-in fade-in"
        />
      )}

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-200 ${
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          {actions.map(({ label, href, icon: Icon, bg }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className="flex items-center gap-2"
            >
              <span className="px-3 py-1.5 rounded-full bg-white shadow-md text-sm font-medium text-[#334C5D] whitespace-nowrap">
                {label}
              </span>
              <span
                className={`w-12 h-12 rounded-full ${bg} shadow-lg flex items-center justify-center text-white`}
              >
                <Icon className="w-5 h-5" />
              </span>
            </Link>
          ))}
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú de acciones"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
          className="w-14 h-14 rounded-full bg-[#F26726] hover:bg-[#d9571f] active:scale-95 shadow-xl flex items-center justify-center text-white transition-all duration-200"
        >
          <span
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-45" : "rotate-0"
            }`}
          >
            {isOpen ? <HiX className="w-6 h-6" /> : <HiPlus className="w-6 h-6" />}
          </span>
        </button>
      </div>
    </div>
  );
}
