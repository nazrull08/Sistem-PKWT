import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, FileText, Check, AlertCircle, Sparkles } from 'lucide-react';
import { ContractEntryItem, parseMultiContractEntries, serializeMultiContractEntries } from '../utils/contractMultiInput';
import { DatePickerInput } from './DatePickerInput';
import { formatAutoNoSurat } from '../utils/mailMerge';

interface ContractMultiInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  phaseLabel: string; // e.g. "Kontrak 3 (K3)"
  phaseKey: 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6';
  employeeName?: string;
  employeeNo?: number;
  initialNoSurat?: string;
  initialAwal?: string;
  initialAkhir?: string;
  initialTtd?: string;
  onSave: (data: { noSurat: string; awal: string; akhir: string; ttd: string }) => void;
}

export const ContractMultiInputModal: React.FC<ContractMultiInputModalProps> = ({
  isOpen,
  onClose,
  phaseLabel,
  phaseKey,
  employeeName,
  employeeNo = 1,
  initialNoSurat = '',
  initialAwal = '',
  initialAkhir = '',
  initialTtd = '',
  onSave
}) => {
  const [entries, setEntries] = useState<ContractEntryItem[]>(() => {
    const parsed = parseMultiContractEntries(initialNoSurat, initialAwal, initialAkhir, initialTtd);
    if (parsed.length === 0) {
      return [{
        id: `entry-new-1`,
        noSurat: initialNoSurat || '',
        awal: initialAwal || '',
        akhir: initialAkhir || '',
        ttd: initialTtd || ''
      }];
    }
    return parsed;
  });

  // Re-sync when opened
  React.useEffect(() => {
    if (isOpen) {
      const parsed = parseMultiContractEntries(initialNoSurat, initialAwal, initialAkhir, initialTtd);
      if (parsed.length === 0) {
        setEntries([{
          id: `entry-new-1`,
          noSurat: initialNoSurat || '',
          awal: initialAwal || '',
          akhir: initialAkhir || '',
          ttd: initialTtd || ''
        }]);
      } else {
        setEntries(parsed);
      }
    }
  }, [isOpen, initialNoSurat, initialAwal, initialAkhir, initialTtd]);

  if (!isOpen) return null;

  const handleUpdateEntry = (index: number, field: keyof ContractEntryItem, val: string) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddEntry = () => {
    setEntries(prev => [
      ...prev,
      {
        id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        noSurat: formatAutoNoSurat(employeeNo, phaseKey),
        awal: '',
        akhir: '',
        ttd: ''
      }
    ]);
  };

  const [entryToDeleteIndex, setEntryToDeleteIndex] = useState<number | null>(null);

  const handleDeleteEntry = (index: number) => {
    if (entries.length <= 1) {
      // If only 1 entry left, empty it rather than removing completely
      setEntries([{
        id: `entry-${Date.now()}`,
        noSurat: '',
        awal: '',
        akhir: '',
        ttd: ''
      }]);
      setEntryToDeleteIndex(null);
      return;
    }
    setEntries(prev => prev.filter((_, i) => i !== index));
    setEntryToDeleteIndex(null);
  };

  const handleSave = () => {
    const serialized = serializeMultiContractEntries(entries);
    onSave(serialized);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                <span>Multi-Input Kontrak: {phaseLabel}</span>
                <span className="bg-amber-400 text-gray-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
                  {entries.length} Entri
                </span>
              </h3>
              <p className="text-xs text-blue-100">
                {employeeName ? `Karyawan: ${employeeName}` : 'Kelola nomor surat, tanggal kontrak, dan tanda tangan ganda'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Jika terdapat nomor kontrak ganda (misal 2 no surat di tahap {phaseKey}), Anda dapat mengoreksi atau menghapus salah satu entri di sini.
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddEntry}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Entri</span>
          </button>
        </div>

        {/* Entries List Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {entries.map((entry, idx) => (
            <div 
              key={entry.id || idx} 
              className={`p-4 rounded-xl border transition-all ${
                idx === 0 
                  ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-100' 
                  : 'bg-slate-50/70 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3 border-b border-gray-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                    idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    Entri #{idx + 1} {idx === 0 && '(Utama)'}
                  </span>
                  <span className="text-xs font-bold text-gray-700">
                    {entry.noSurat ? entry.noSurat : '(Nomor Surat Kosong)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEntryToDeleteIndex(idx)}
                    className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Hapus entri #${idx + 1} ini`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Entri #{idx + 1}</span>
                  </button>
                </div>
              </div>

              {/* Form Fields for this Entry */}
              <div className="space-y-3">
                {/* No Surat */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Nomor Surat PKWT</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUpdateEntry(idx, 'noSurat', formatAutoNoSurat(employeeNo, phaseKey))}
                      className="text-[10.5px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Auto No Surat
                    </button>
                  </div>
                  <input
                    type="text"
                    value={entry.noSurat}
                    onChange={(e) => handleUpdateEntry(idx, 'noSurat', e.target.value)}
                    placeholder={formatAutoNoSurat(employeeNo, phaseKey)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  />
                </div>

                {/* Dates: Awal, Akhir, TTD */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tanggal Awal</span>
                    </label>
                    <DatePickerInput
                      placeholder="DD/MM/YYYY"
                      value={entry.awal}
                      onChange={(val) => handleUpdateEntry(idx, 'awal', val)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tanggal Akhir</span>
                    </label>
                    <DatePickerInput
                      placeholder="DD/MM/YYYY"
                      value={entry.akhir}
                      onChange={(val) => handleUpdateEntry(idx, 'akhir', val)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tanggal TTD</span>
                    </label>
                    <DatePickerInput
                      placeholder="DD/MM/YYYY"
                      value={entry.ttd}
                      onChange={(val) => handleUpdateEntry(idx, 'ttd', val)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Entry Button at Bottom */}
          <button
            type="button"
            onClick={handleAddEntry}
            className="w-full py-2.5 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Entri Surat / Kontrak Baru untuk {phaseLabel}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Total entri: <span className="font-bold text-gray-800">{entries.length} entri</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>

        {/* Modal Konfirmasi Hapus Entri (Yes / No) */}
        {entryToDeleteIndex !== null && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-gray-100 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">Hapus Entri Kontrak?</h4>
                  <p className="text-[11px] text-rose-600 font-semibold">Konfirmasi Hapus (Yes / No)</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data pada <strong>Entri #{entryToDeleteIndex + 1}</strong> ini?
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
                  onClick={() => handleDeleteEntry(entryToDeleteIndex)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus (Yes)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
