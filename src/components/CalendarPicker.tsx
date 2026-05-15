"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale/es';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';

interface CalendarPickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function buildCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

export default function CalendarPicker({
  value,
  onChange,
  minDate,
  placeholder = 'Selecciona una fecha',
  required,
  className = '',
}: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value ?? new Date());
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mount portal target
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Update view month when value changes externally
  useEffect(() => {
    if (value) setViewMonth(value);
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > panelHeight
      ? rect.bottom + 6
      : rect.top - panelHeight - 6;
    setPosition({ top, left: rect.left, width: rect.width });
  }, []);

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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const days = buildCalendarDays(viewMonth);
  const today = startOfDay(new Date());
  const minDay = minDate ? startOfDay(minDate) : today;

  const handleSelect = (day: Date) => {
    if (isBefore(day, minDay)) return;
    onChange(day);
    setOpen(false);
  };

  const displayValue = value
    ? format(value, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    : '';

  const panel = open && portalTarget ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        minWidth: Math.max(position.width, 280),
        zIndex: 9999,
      }}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#F26726] to-[#E23694]">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1 rounded-lg text-white hover:bg-white/20 transition-colors"
        >
          <HiChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold text-sm capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1 rounded-lg text-white hover:bg-white/20 transition-colors"
        >
          <HiChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1 p-2">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isSelected = value ? isSameDay(day, value) : false;
          const isToday = isSameDay(day, today);
          const isDisabled = isBefore(day, minDay);

          let cellClass =
            'flex items-center justify-center h-9 w-full rounded-lg text-sm font-medium transition-colors ';

          if (!isCurrentMonth) {
            cellClass += 'text-gray-300 ';
          } else if (isDisabled) {
            cellClass += 'text-gray-300 cursor-not-allowed ';
          } else if (isSelected) {
            cellClass += 'bg-gradient-to-br from-[#F26726] to-[#E23694] text-white shadow-sm cursor-pointer ';
          } else if (isToday) {
            cellClass += 'bg-[#EBD52C] text-[#334C5D] font-bold cursor-pointer hover:bg-[#d4be1a] ';
          } else {
            cellClass += 'text-[#334C5D] cursor-pointer hover:bg-orange-50 hover:text-[#F26726] ';
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => !isDisabled && isCurrentMonth && handleSelect(day)}
              disabled={isDisabled || !isCurrentMonth}
              className={cellClass}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
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
        <HiCalendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 capitalize truncate">
          {displayValue || placeholder}
        </span>
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
