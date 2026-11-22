'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // YYYY-MM-DDTHH:mm
  onChange: (next: string) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseValue(val: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(val);
  if (m) {
    return {
      year: Number(m[1]),
      month: Number(m[2]) - 1,
      day: Number(m[3]),
      hour: Number(m[4]),
      minute: Number(m[5]),
    };
  }
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
    hour: 18,
    minute: 0,
  };
}

function formatDisplay(val: string) {
  const p = parseValue(val);
  return `${pad(p.day)}/${pad(p.month + 1)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const initial = parseValue(value);

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [draftYear, setDraftYear] = useState(initial.year);
  const [draftMonth, setDraftMonth] = useState(initial.month);
  const [draftDay, setDraftDay] = useState(initial.day);
  const [draftHour, setDraftHour] = useState(initial.hour);
  const [draftMinute, setDraftMinute] = useState(initial.minute);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const p = parseValue(value);
    setViewYear(p.year);
    setViewMonth(p.month);
    setDraftYear(p.year);
    setDraftMonth(p.month);
    setDraftDay(p.day);
    setDraftHour(p.hour);
    setDraftMinute(p.minute);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setDraftYear(now.getFullYear());
    setDraftMonth(now.getMonth());
    setDraftDay(now.getDate());
  };

  const handleApply = () => {
    const formatted = `${draftYear}-${pad(draftMonth + 1)}-${pad(draftDay)}T${pad(
      draftHour
    )}:${pad(draftMinute)}`;
    onChange(formatted);
    setOpen(false);
  };

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#007ABB] cursor-pointer"
      >
        <span className="truncate font-medium">{formatDisplay(value)}</span>
        <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-[280px] sm:w-[300px] max-w-[calc(100vw-3rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3.5 z-[2200] space-y-3">
          {/* Month Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map((day, idx) => {
              if (!day) return <span key={`empty-${idx}`} />;
              const isSelected =
                day === draftDay && viewMonth === draftMonth && viewYear === draftYear;
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setDraftYear(viewYear);
                    setDraftMonth(viewMonth);
                    setDraftDay(day);
                  }}
                  className={`h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#007ABB] text-white shadow-sm'
                      : isToday
                        ? 'border border-[#007ABB] text-[#007ABB] dark:text-[#B8E7FF] hover:bg-slate-100 dark:hover:bg-slate-800'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Selectors */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-[#007ABB]" />
              Time
            </span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Hour"
                value={draftHour}
                onChange={(e) => setDraftHour(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB] cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {pad(h)}
                  </option>
                ))}
              </select>
              <span className="text-xs font-extrabold text-slate-400">:</span>
              <select
                aria-label="Minute"
                value={draftMinute}
                onChange={(e) => setDraftMinute(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB] cursor-pointer"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer: Today + Cancel + Apply */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-bold text-[#007ABB] dark:text-[#B8E7FF] hover:underline cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 py-1.5 rounded-lg bg-[#007ABB] hover:bg-[#00669E] text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm cursor-pointer active:scale-95 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
