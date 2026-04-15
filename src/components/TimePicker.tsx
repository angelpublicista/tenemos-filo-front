"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HiClock } from 'react-icons/hi';

interface TimePickerProps {
  value: string;                  // "HH:mm"
  onChange: (time: string) => void;
  slots?: string[];               // si vienen slots predefinidos
  placeholder?: string;
  required?: boolean;
  className?: string;
}

// Genera horas de 06:00 a 23:30 en intervalos de 30 min
function buildDefaultSlots(): string[] {
  const times: string[] = [];
  for (let h = 6; h < 24; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}

const DEFAULT_SLOTS = buildDefaultSlots();

export default function TimePicker({
  value,
  onChange,
  slots,
  placeholder = 'Selecciona una hora',
  required,
  className = '',
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const displaySlots = slots && slots.length > 0 ? slots : DEFAULT_SLOTS;
  const useChips = !!(slots && slots.length > 0);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelHeight = useChips ? Math.min(displaySlots.length * 48 + 56, 280) : 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > panelHeight ? rect.bottom + 6 : rect.top - panelHeight - 6;
    setPosition({ top, left: rect.left, width: rect.width });
  }, [displaySlots.length, useChips]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Scroll al slot seleccionado al abrir
  useEffect(() => {
    if (open && selectedRef.current) {
      setTimeout(() => selectedRef.current?.scrollIntoView({ block: 'center' }), 50);
    }
  }, [open]);

  // Cerrar al click externo
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (t: string) => {
    onChange(t);
    setOpen(false);
  };

  const panel = open && portalTarget ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        minWidth: Math.max(position.width, useChips ? 240 : 200),
        zIndex: 9999,
      }}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#F26726] to-[#E23694] flex items-center gap-2">
        <HiClock className="w-4 h-4 text-white" />
        <span className="text-white font-semibold text-sm">
          {useChips ? 'Horarios disponibles' : 'Selecciona la hora'}
        </span>
      </div>

      {/* Slots */}
      {useChips ? (
        // Chips para slots predefinidos
        <div className="p-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {displaySlots.map((t) => (
            <button
              key={t}
              ref={t === value ? selectedRef : undefined}
              type="button"
              onClick={() => handleSelect(t)}
              className={`py-2 px-3 rounded-lg text-sm font-medium text-center transition-all
                ${t === value
                  ? 'bg-gradient-to-r from-[#F26726] to-[#E23694] text-white shadow-sm'
                  : 'bg-gray-50 text-[#334C5D] hover:bg-orange-50 hover:text-[#F26726] border border-gray-200 hover:border-[#F26726]'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      ) : (
        // Lista scrolleable para horas libres
        <div className="max-h-64 overflow-y-auto py-1">
          {displaySlots.map((t) => {
            const isSelected = t === value;
            return (
              <button
                key={t}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                onClick={() => handleSelect(t)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                  ${isSelected
                    ? 'bg-gradient-to-r from-[#F26726] to-[#E23694] text-white font-semibold'
                    : 'text-[#334C5D] hover:bg-orange-50 hover:text-[#F26726]'
                  }`}
              >
                <span>{t}</span>
                {isSelected && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>,
    portalTarget
  ) : null;

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 border rounded-lg text-sm text-left transition-colors
          ${open ? 'border-[#F26726] ring-2 ring-[#F26726]/20' : 'border-gray-300 hover:border-gray-400'}
          ${value ? 'text-gray-900' : 'text-gray-400'}
          bg-white focus:outline-none ${className}`}
      >
        <HiClock className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1">{value || placeholder}</span>
      </button>
      {required && !value && (
        <input
          tabIndex={-1}
          required
          className="absolute inset-0 opacity-0 pointer-events-none"
          value=""
          onChange={() => {}}
        />
      )}
      {panel}
    </div>
  );
}
