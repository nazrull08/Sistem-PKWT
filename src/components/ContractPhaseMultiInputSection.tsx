import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, FileText, Sparkles, ChevronDown, ChevronUp, Layers, X } from 'lucide-react';
import { DatePickerInput } from './DatePickerInput';
import { formatAutoNoSurat } from '../utils/mailMerge';
import { ContractEntryItem, parseMultiContractEntries, serializeMultiContractEntries } from '../utils/contractMultiInput';

interface ContractPhaseMultiInputSectionProps {
  phase: 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6';
  label: string; // e.g. "Tahap K1 (Kontrak Awal)"
  employeeNo: number;
  noSurat: string;
  awal: string;
  akhir: string;
  ttd: string;
  onChange: (data: { noSurat: string; awal: string; akhir: string; ttd: string }) => void;
  onApplyDuration?: (months: number) => void;
  phaseColor?: string; // e.g. "blue", "indigo", "emerald"
}

export const ContractPhaseMultiInputSection: React.FC<ContractPhaseMultiInputSectionProps> = ({
  phase,
  label,
  employeeNo,
  noSurat,
  awal,
  akhir,
  ttd,
  onChange,
  onApplyDuration,
  phaseColor = 'blue'
}) => {
  const [entries, setEntries] = useState<ContractEntryItem[]>(() => {
    const parsed = parseMultiContractEntries(noSurat, awal, akhir, ttd);
    return parsed.length > 0 ? parsed : [{
      id: `entry-init-${phase}`,
      noSurat: noSurat || '',
      awal: awal || '',
      akhir: akhir || '',
      ttd: ttd || ''
    }];
  });

  const [isMultiMode, setIsMultiMode] = useState<boolean>(() => {
    const parsed = parseMultiContractEntries(noSurat, awal, akhir, ttd);
    return parsed.length > 1;
  });

  // Sync internal state when parent props change
  useEffect(() => {
    const parsed = parseMultiContractEntries(noSurat, awal, akhir, ttd);
    if (parsed.length > 1) {
      setIsMultiMode(true);
      setEntries(parsed);
    } else if (parsed.length === 1) {
      setEntries(parsed);
    } else {
      setEntries([{
        id: `entry-init-${phase}`,
        noSurat: noSurat || '',
        awal: awal || '',
        akhir: akhir || '',
        ttd: ttd || ''
      }]);
    }
  }, [noSurat, awal, akhir, ttd, phase]);

  const updateEntry = (index: number, field: keyof ContractEntryItem, value: string) => {
    const next = [...entries];
    next[index] = { ...next[index], [field]: value };
    setEntries(next);
    const serialized = serializeMultiContractEntries(next);
    onChange(serialized);
  };

  const addEntry = () => {
    const next = [
      ...entries,
      {
        id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        noSurat: formatAutoNoSurat(employeeNo, phase),
        awal: '',
        akhir: '',
        ttd: ''
      }
    ];
    setIsMultiMode(true);
    setEntries(next);
    onChange(serializeMultiContractEntries(next));
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) {
      const reset = [{
        id: `entry-reset-${phase}`,
        noSurat: '',
        awal: '',
        akhir: '',
        ttd: ''
      }];
      setEntries(reset);
      setIsMultiMode(false);
      onChange({ noSurat: '', awal: '', akhir: '', ttd: '' });
      return;
    }

    const next = entries.filter((_, i) => i !== index);
    setEntries(next);
    if (next.length <= 1) {
      setIsMultiMode(false);
    }
    onChange(serializeMultiContractEntries(next));
  };

  const [entryToDeleteIndex, setEntryToDeleteIndex] = useState<number | null>(null);
  const [showConfirmSingleMode, setShowConfirmSingleMode] = useState<boolean>(false);

  const toggleMultiMode = () => {
    if (!isMultiMode) {
      setIsMultiMode(true);
      if (entries.length <= 1) {
        addEntry();
      }
    } else {
      if (entries.length > 1) {
        setShowConfirmSingleMode(true);
      } else {
        setIsMultiMode(false);
      }
    }
  };

  const confirmSwitchToSingle = () => {
    const single = [entries[0]];
    setEntries(single);
    setIsMultiMode(false);
    setShowConfirmSingleMode(false);
    onChange(serializeMultiContractEntries(single));
  };

  return (
    <div className={`p-3 rounded-xl border transition-all ${
      isMultiMode || entries.length > 1
        ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-gray-800 text-xs tracking-tight">{label}</span>
          {entries.length > 1 ? (
            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.2 rounded-full font-bold flex items-center gap-1 shadow-2xs">
              <Layers className="w-2.5 h-2.5" />
              <span>Multi-Input ({entries.length} Entri)</span>
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 font-medium font-mono">1 Entri</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Duration Buttons */}
          {onApplyDuration && (
            <div className="flex items-center gap-1 mr-1">
              <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Durasi:</span>
              {[3, 6, 12].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onApplyDuration(m)}
                  className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                >
                  +{m} Bln
                </button>
              ))}
            </div>
          )}

          {/* Toggle / Add Multi-Input Button */}
          <button
            type="button"
            onClick={addEntry}
            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Tambah no surat dan tanggal kontrak tambahan (Multi-Input)"
          >
            <Plus className="w-3 h-3 text-blue-600" />
            <span>+ Multi-Input</span>
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-2.5">
        {entries.map((entry, idx) => (
          <div 
            key={entry.id || idx}
            className={`p-2.5 rounded-lg border transition-all ${
              entries.length > 1 
                ? idx === 0 
                  ? 'bg-blue-50/50 border-blue-200 shadow-2xs' 
                  : 'bg-white border-amber-200 shadow-2xs'
                : 'bg-slate-50/50 border-gray-100'
            }`}
          >
            {entries.length > 1 && (
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                    idx === 0 ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    Entri #{idx + 1} {idx === 0 && '(Utama)'}
                  </span>
                  <span className="text-[11px] font-bold text-gray-700 font-mono">
                    {entry.noSurat || '(Belum Ada No Surat)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setEntryToDeleteIndex(idx)}
                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-rose-200"
                  title="Hapus entri ini (misal duplikasi PKWT yang tidak terpakai)"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Entri #{idx + 1}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              {/* No Surat */}
              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-blue-600" />
                    <span>No Surat {phase}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => updateEntry(idx, 'noSurat', formatAutoNoSurat(employeeNo, phase))}
                    className="text-[9.5px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Auto
                  </button>
                </div>
                <input
                  type="text"
                  value={entry.noSurat}
                  onChange={(e) => updateEntry(idx, 'noSurat', e.target.value)}
                  placeholder={formatAutoNoSurat(employeeNo, phase)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-medium border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Tanggal Awal */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">AWAL {phase}</label>
                <DatePickerInput
                  placeholder={`AWAL ${phase}`}
                  value={entry.awal}
                  onChange={(val) => updateEntry(idx, 'awal', val)}
                />
              </div>

              {/* Tanggal Akhir */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">AKHIR {phase}</label>
                <DatePickerInput
                  placeholder={`AKHIR ${phase}`}
                  value={entry.akhir}
                  onChange={(val) => updateEntry(idx, 'akhir', val)}
                />
              </div>

              {/* Tanggal TTD */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">TTD {phase}</label>
                <DatePickerInput
                  placeholder={`TTD ${phase}`}
                  value={entry.ttd}
                  onChange={(val) => updateEntry(idx, 'ttd', val)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Konfirmasi Hapus Entri Kontrak (Yes / No) */}
      {entryToDeleteIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-gray-100 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">Hapus Entri #{entryToDeleteIndex + 1}?</h4>
                <p className="text-[11px] text-rose-600 font-semibold">Konfirmasi Hapus (Yes / No)</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data pada <strong>Entri #{entryToDeleteIndex + 1}</strong> untuk {label}?
              {entries[entryToDeleteIndex]?.noSurat && (
                <span className="block mt-1 font-mono text-[11px] bg-gray-100 p-1.5 rounded text-gray-800">
                  No Surat: {entries[entryToDeleteIndex].noSurat}
                </span>
              )}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDeleteIndex(null)}
                className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tidak, Batalkan (No)
              </button>
              <button
                type="button"
                onClick={() => {
                  removeEntry(entryToDeleteIndex);
                  setEntryToDeleteIndex(null);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus (Yes)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Beralih ke Mode Tunggal (Yes / No) */}
      {showConfirmSingleMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-gray-100 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">Jadikan 1 Entri Tunggal?</h4>
                <p className="text-[11px] text-amber-600 font-semibold">Konfirmasi Mode (Yes / No)</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Sistem akan menyimpan entri pertama (utama) dan menghapus {entries.length - 1} entri tambahan lainnya untuk {label}.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSingleMode(false)}
                className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tidak, Batalkan (No)
              </button>
              <button
                type="button"
                onClick={confirmSwitchToSingle}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1"
              >
                <span>Ya, Jadikan Tunggal (Yes)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
