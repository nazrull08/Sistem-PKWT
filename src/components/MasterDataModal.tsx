import React, { useState } from 'react';
import { 
  X, 
  Settings2, 
  Hash, 
  Building2, 
  Check, 
  Sparkles, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { MasterDataSettings, Employee } from '../types';
import { 
  getMasterDataSettings, 
  saveMasterDataSettings, 
  getNextAvailableNoUrut, 
  formatAutoNoSurat 
} from '../utils/mailMerge';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSaved?: () => void;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({
  isOpen,
  onClose,
  employees,
  onSaved
}) => {
  const currentSettings = getMasterDataSettings();
  const calculatedNextSeq = getNextAvailableNoUrut(employees);

  const [lastSeq, setLastSeq] = useState<number>(currentSettings.lastSequenceNumber);
  const [kodeDivisi, setKodeDivisi] = useState<string>(currentSettings.kodeDivisi || 'AKY-HRD');
  const [namaPerusahaan, setNamaPerusahaan] = useState<string>(currentSettings.namaPerusahaan);
  const [namaDirektur, setNamaDirektur] = useState<string>(currentSettings.namaDirektur);
  const [jabatanDirektur, setJabatanDirektur] = useState<string>(currentSettings.jabatanDirektur);
  const [alamatPerusahaan, setAlamatPerusahaan] = useState<string>(currentSettings.alamatPerusahaan);
  const [teleponPerusahaan, setTeleponPerusahaan] = useState<string>(currentSettings.teleponPerusahaan);
  const [faxPerusahaan, setFaxPerusahaan] = useState<string>(currentSettings.faxPerusahaan);

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const nextSeq = lastSeq + 1;
  const sampleNextNumber = formatAutoNoSurat(nextSeq, 'K1');
  const sampleNextK2Number = formatAutoNoSurat(nextSeq + 1, 'K2');
  const sampleNextK3Number = formatAutoNoSurat(nextSeq + 2, 'K3');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MasterDataSettings = {
      lastSequenceNumber: lastSeq,
      kodeDivisi,
      namaPerusahaan,
      namaDirektur,
      jabatanDirektur,
      alamatPerusahaan,
      teleponPerusahaan,
      faxPerusahaan
    };

    saveMasterDataSettings(updated);
    setSavedSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleSyncFromDatabase = () => {
    setLastSeq(calculatedNextSeq - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-blue-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                Master Data Sistem & Penomoran Kontrak
              </h3>
              <p className="text-xs text-blue-300">
                Atur agenda nomor urut kontrak berurutan & data resmi perusahaan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Master Penomoran Kontrak */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                <Hash className="w-4 h-4 text-blue-600" />
                Master Penomoran Kontrak (Agenda Surat Keluar)
              </h4>
              <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded-md font-bold text-[10px]">
                Otomatis +1
              </span>
            </div>

            {/* Explanation box */}
            <div className="bg-white p-3 rounded-lg border border-blue-100 text-[11px] text-gray-700 space-y-1">
              <div className="flex items-start gap-1.5 font-semibold text-blue-900">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Konsep Alur Penomoran PT. ANDHANA KIRANA YASA:</span>
              </div>
              <p className="text-gray-600 leading-relaxed pl-5">
                Setiap kali membuat <strong>Kontrak Baru</strong> maupun <strong>Perpanjangan Kontrak (K2, K3, dst.)</strong>, 
                Nomor Urut surat <strong>selalu bertambah 1</strong> mengikuti nomor kontrak terakhir yang diterbitkan perusahaan. 
                Adapun klausul <em>referensi kontrak</em> pada dokumen tetap merujuk ke nomor kontrak karyawan sebelumnya.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Nomor Urut Terakhir yang Diterbitkan:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={lastSeq}
                    onChange={(e) => setLastSeq(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg font-mono font-extrabold text-blue-900 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSyncFromDatabase}
                    className="px-2.5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-semibold text-[10.5px] shrink-0 cursor-pointer"
                    title="Ambil nomor tertinggi dari database karyawan saat ini"
                  >
                    Sync DB ({calculatedNextSeq - 1})
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Nomor urut tersimpan: <strong>{lastSeq.toString().padStart(3, '0')}</strong>
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Kode Divisi / Format Surat:
                </label>
                <input
                  type="text"
                  value={kodeDivisi}
                  onChange={(e) => setKodeDivisi(e.target.value.toUpperCase())}
                  placeholder="AKY-HRD"
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg font-mono font-bold text-gray-900 bg-white uppercase"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Formula: <code>[No Urut]/{kodeDivisi}/PKWT-[Romawi]/[Bulan]/[Tahun]</code>
                </span>
              </div>
            </div>

            {/* Preview Next Numbers */}
            <div className="pt-2 border-t border-blue-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-gray-500 text-[10px] block">Kontrak Baru (K1):</span>
                <span className="font-mono font-extrabold text-blue-700 text-xs">{sampleNextNumber}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-gray-500 text-[10px] block">Perpanjangan ke-1 (K2):</span>
                <span className="font-mono font-extrabold text-indigo-700 text-xs">{sampleNextK2Number}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-gray-500 text-[10px] block">Perpanjangan ke-2 (K3):</span>
                <span className="font-mono font-extrabold text-violet-700 text-xs">{sampleNextK3Number}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Master Data Instansi & Pejabat Direktur */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
              <Building2 className="w-4 h-4 text-slate-600" />
              Master Pejabat & Instansi Perusahaan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                <input
                  type="text"
                  required
                  value={namaPerusahaan}
                  onChange={(e) => setNamaPerusahaan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Nama Direktur / Wakil Pihak I</label>
                <input
                  type="text"
                  required
                  value={namaDirektur}
                  onChange={(e) => setNamaDirektur(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white uppercase font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Jabatan Direktur</label>
                <input
                  type="text"
                  required
                  value={jabatanDirektur}
                  onChange={(e) => setJabatanDirektur(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Telepon Perusahaan</label>
                <input
                  type="text"
                  value={teleponPerusahaan}
                  onChange={(e) => setTeleponPerusahaan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Fax Perusahaan</label>
                <input
                  type="text"
                  value={faxPerusahaan}
                  onChange={(e) => setFaxPerusahaan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Alamat Lengkap Perusahaan (Kop & Legal)</label>
              <textarea
                rows={2}
                value={alamatPerusahaan}
                onChange={(e) => setAlamatPerusahaan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                Master Data berhasil disimpan!
              </span>
            ) : (
              <span className="text-gray-400 text-[11px]">
                Perubahan langsung berlaku ke seluruh modul pembuatan kontrak
              </span>
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Master Data</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
