import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { dateToISODate, formatTanggalIndonesia } from '../utils/date';

interface DatePickerInputProps {
  value: string;
  onChange: (formattedDate: string) => void;
  placeholder?: string;
  className?: string;
  formatMode?: 'formal' | 'dmy';
  required?: boolean;
  disabled?: boolean;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  placeholder = 'Contoh: 01 Oktober 2026',
  className = '',
  formatMode = 'formal',
  required = false,
  disabled = false
}) => {
  const nativePickerRef = useRef<HTMLInputElement>(null);
  const isoValue = dateToISODate(value);

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value; // "YYYY-MM-DD"
    if (!rawVal) return;

    const [year, month, day] = rawVal.split('-');
    if (formatMode === 'dmy') {
      onChange(`${day}/${month}/${year}`);
    } else {
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      onChange(formatTanggalIndonesia(d));
    }
  };

  const triggerPicker = () => {
    if (disabled || !nativePickerRef.current) return;
    try {
      if (typeof nativePickerRef.current.showPicker === 'function') {
        nativePickerRef.current.showPicker();
        return;
      }
    } catch {
      // fallback
    }
    nativePickerRef.current.focus();
    nativePickerRef.current.click();
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Visible Formatted Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (value && formatMode !== 'dmy') {
            const formatted = formatTanggalIndonesia(value);
            if (formatted) onChange(formatted);
          }
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full pl-2.5 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium disabled:bg-gray-100 disabled:text-gray-400"
      />

      {/* Invisible HTML5 date input positioned over calendar button for robust touch/click */}
      <input
        ref={nativePickerRef}
        type="date"
        value={isoValue}
        onChange={handleNativeChange}
        disabled={disabled}
        tabIndex={-1}
        aria-label="Pilih Tanggal dari Kalender"
        className="absolute right-0 top-0 bottom-0 w-8 opacity-0 cursor-pointer z-10"
      />

      {/* Calendar Icon Button with Tooltip */}
      <button
        type="button"
        onClick={triggerPicker}
        disabled={disabled}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors pointer-events-none cursor-pointer"
        title="Show Tanggal - Klik untuk memilih dari kalender"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
