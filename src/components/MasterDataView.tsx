import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Hash, 
  Building2, 
  Check, 
  Sparkles, 
  RotateCcw, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, MasterDataSettings, ContractPhase } from '../types';
import { 
  getMasterDataSettings, 
  saveMasterDataSettings, 
  getNextAvailableNoUrut, 
  formatAutoNoSurat, 
  extractNoUrutFromSurat 
} from '../utils/mailMerge';
import { formatTanggalIndonesia } from '../utils/date';

interface MasterDataViewProps {
  employees: Employee[];
  onOpenContract?: (emp: Employee) => void;
  onRefreshData?: () => void;
}

interface RegisteredContractItem {
  noUrut: number;
  formattedNoUrut: string;
  nomorSurat: string;
  employeeName: string;
  employeeNik: string;
  phase: ContractPhase;
  phaseLabel: string;
  periodeAwal: string;
  periodeAkhir: string;
  tanggalTtd: string;
  referenceSuratSebelumnya?: string;
  employee: Employee;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  employees,
  onOpenContract,
  onRefreshData
}) => {
  const currentSettings = getMasterDataSettings();
  const calculatedNextSeq = getNextAvailableNoUrut(employees);
  const autoSyncedLast = calculatedNextSeq - 1;

  const [lastSeq, setLastSeq] = useState<number>(Math.max(currentSettings.lastSequenceNumber, autoSyncedLast));
  const [kodeDivisi, setKodeDivisi] = useState<string>(currentSettings.kodeDivisi || 'AKY-HRD');
  const [namaPerusahaan, setNamaPerusahaan] = useState<string>(currentSettings.namaPerusahaan);
  const [namaDirektur, setNamaDirektur] = useState<string>(currentSettings.namaDirektur);
  const [jabatanDirektur, setJabatanDirektur] = useState<string>(currentSettings.jabatanDirektur);
  const [alamatPerusahaan, setAlamatPerusahaan] = useState<string>(currentSettings.alamatPerusahaan);
  const [teleponPerusahaan, setTeleponPerusahaan] = useState<string>(currentSettings.teleponPerusahaan);
  const [faxPerusahaan, setFaxPerusahaan] = useState<string>(currentSettings.faxPerusahaan);

  // Auto-sync sequence number in background without manual button click
  useEffect(() => {
    const calculated = getNextAvailableNoUrut(employees);
    const newLast = calculated - 1;
    if (newLast > lastSeq) {
      setLastSeq(newLast);
      const updated: MasterDataSettings = {
        lastSequenceNumber: newLast,
        kodeDivisi: kodeDivisi.trim() || 'AKY-HRD',
        namaPerusahaan: namaPerusahaan.trim(),
        namaDirektur: namaDirektur.trim(),
        jabatanDirektur: jabatanDirektur.trim(),
        alamatPerusahaan: alamatPerusahaan.trim(),
        teleponPerusahaan: teleponPerusahaan.trim(),
        faxPerusahaan: faxPerusahaan.trim()
      };
      saveMasterDataSettings(updated);
    }
  }, [employees]);

  const [activeTab, setActiveTab] = useState<'penomoran' | 'agenda' | 'perusahaan'>('penomoran');
  const [agendaSearch, setAgendaSearch] = useState('');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Compile all issued contracts from employees database for the Agenda Book
  const registeredContracts: RegisteredContractItem[] = [];

  employees.forEach(emp => {
    // Check K1
    if (emp.noSurat1) {
      const num = parseInt(extractNoUrutFromSurat(emp.noSurat1) || '0', 10);
      registeredContracts.push({
        noUrut: num || emp.no || 0,
        formattedNoUrut: (num || emp.no || 1).toString().padStart(3, '0'),
        nomorSurat: emp.noSurat1,
        employeeName: emp.nama,
        employeeNik: emp.noKtp,
        phase: 'K1',
        phaseLabel: 'PKWT-I (Kontrak Baru)',
        periodeAwal: emp.awalK1 || '-',
        periodeAkhir: emp.akhirK1 || '-',
        tanggalTtd: emp.ttd1 || emp.awalK1 || '-',
        referenceSuratSebelumnya: '-',
        employee: emp
      });
    }

    // Check K2
    if (emp.noSurat2) {
      const num = parseInt(extractNoUrutFromSurat(emp.noSurat2) || '0', 10);
      registeredContracts.push({
        noUrut: num || (emp.no + 5),
        formattedNoUrut: (num || emp.no + 5).toString().padStart(3, '0'),
        nomorSurat: emp.noSurat2,
        employeeName: emp.nama,
        employeeNik: emp.noKtp,
        phase: 'K2',
        phaseLabel: 'PKWT-II (Perpanjangan ke-1)',
        periodeAwal: emp.awalK2 || '-',
        periodeAkhir: emp.akhirK2 || '-',
        tanggalTtd: emp.ttd2 || emp.awalK2 || '-',
        referenceSuratSebelumnya: emp.noSurat1 || 'Rujukan K1',
        employee: emp
      });
    }

    // Check K3
    if (emp.noSurat3) {
      const num = parseInt(extractNoUrutFromSurat(emp.noSurat3) || '0', 10);
      registeredContracts.push({
        noUrut: num || (emp.no + 10),
        formattedNoUrut: (num || emp.no + 10).toString().padStart(3, '0'),
        nomorSurat: emp.noSurat3,
        employeeName: emp.nama,
        employeeNik: emp.noKtp,
        phase: 'K3',
        phaseLabel: 'PKWT-III (Perpanjangan ke-2)',
        periodeAwal: emp.awalK3 || '-',
        periodeAkhir: emp.akhirK3 || '-',
        tanggalTtd: emp.ttd3 || emp.awalK3 || '-',
        referenceSuratSebelumnya: emp.noSurat2 || emp.noSurat1 || 'Rujukan K2',
        employee: emp
      });
    }

    // Check K4
    if (emp.noSurat4) {
      const num = parseInt(extractNoUrutFromSurat(emp.noSurat4) || '0', 10);
      registeredContracts.push({
        noUrut: num || 0,
        formattedNoUrut: (num || 1).toString().padStart(3, '0'),
        nomorSurat: emp.noSurat4,
        employeeName: emp.nama,
        employeeNik: emp.noKtp,
        phase: 'K4',
        phaseLabel: 'PKWT-IV (Perpanjangan ke-3)',
        periodeAwal: emp.awalK4 || '-',
        periodeAkhir: emp.akhirK4 || '-',
        tanggalTtd: emp.ttd4 || emp.awalK4 || '-',
        referenceSuratSebelumnya: emp.noSurat3 || 'Rujukan K3',
        employee: emp
      });
    }

    // Check K5
    if (emp.noSurat5) {
      const num = parseInt(extractNoUrutFromSurat(emp.noSurat5) || '0', 10);
      registeredContracts.push({
        noUrut: num || 0,
        formattedNoUrut: (num || 1).toString().padStart(3, '0'),
        nomorSurat: emp.noSurat5,
        employeeName: emp.nama,
        employeeNik: emp.noKtp,
        phase: 'K5',
        phaseLabel: 'PKWT-V (Perpanjangan ke-4)',
        periodeAwal: emp.awalK5 || '-',
        periodeAkhir: emp.akhirK5 || '-',
        tanggalTtd: emp.ttd5 || emp.awalK5 || '-',
        referenceSuratSebelumnya: emp.noSurat4 || 'Rujukan K4',
        employee: emp
      });
    }

    // Check K6
    if (emp.noSurat6) {
      const num = parseInt(extractNoUrutFromSurat(emp.noSurat6) || '0', 10);
      registeredContracts.push({
        noUrut: num || 0,
        formattedNoUrut: (num || 1).toString().padStart(3, '0'),
        nomorSurat: emp.noSurat6,
        employeeName: emp.nama,
        employeeNik: emp.noKtp,
        phase: 'K6',
        phaseLabel: 'PKWT-VI (Perpanjangan ke-5)',
        periodeAwal: emp.awalK6 || '-',
        periodeAkhir: emp.akhirK6 || '-',
        tanggalTtd: emp.ttd6 || emp.awalK6 || '-',
        referenceSuratSebelumnya: emp.noSurat5 || 'Rujukan K5',
        employee: emp
      });
    }
  });

  // Sort contracts by sequence number
  registeredContracts.sort((a, b) => a.noUrut - b.noUrut);

  // Filter agenda
  const filteredAgenda = registeredContracts.filter(c => {
    const q = agendaSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.formattedNoUrut.includes(q) ||
      c.nomorSurat.toLowerCase().includes(q) ||
      c.employeeName.toLowerCase().includes(q) ||
      c.employeeNik.includes(q) ||
      (c.referenceSuratSebelumnya && c.referenceSuratSebelumnya.toLowerCase().includes(q))
    );
  });

  const nextSeq = lastSeq + 1;
  const sampleNextK1 = formatAutoNoSurat(nextSeq, 'K1');
  const sampleNextK2 = formatAutoNoSurat(nextSeq + 1, 'K2');
  const sampleNextK3 = formatAutoNoSurat(nextSeq + 2, 'K3');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MasterDataSettings = {
      lastSequenceNumber: lastSeq,
      kodeDivisi: kodeDivisi.trim() || 'AKY-HRD',
      namaPerusahaan: namaPerusahaan.trim(),
      namaDirektur: namaDirektur.trim(),
      jabatanDirektur: jabatanDirektur.trim(),
      alamatPerusahaan: alamatPerusahaan.trim(),
      teleponPerusahaan: teleponPerusahaan.trim(),
      faxPerusahaan: faxPerusahaan.trim()
    };

    saveMasterDataSettings(updated);
    setSavedToast('Pengaturan Master Data & Penomoran berhasil disimpan!');
    if (onRefreshData) onRefreshData();
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleSyncWithDatabase = () => {
    const calculated = getNextAvailableNoUrut(employees);
    const newLast = calculated - 1;
    setLastSeq(newLast);
    setSavedToast(`Nomor urut disinkronkan ke nomor terakhir database: ${newLast.toString().padStart(3, '0')} (Nomor berikutnya: ${calculated.toString().padStart(3, '0')})`);
    setTimeout(() => setSavedToast(null), 4000);
  };

  const exportAgendaToExcel = () => {
    const headers = [
      'No Urut',
      'Nomor Surat Kontrak',
      'Nama Karyawan',
      'NIK / No KTP',
      'Tahap Kontrak',
      'Periode Awal',
      'Periode Akhir',
      'Tanggal TTD',
      'Rujukan Kontrak Sebelumnya'
    ];

    const rows = filteredAgenda.map(item => [
      item.formattedNoUrut,
      item.nomorSurat,
      item.employeeName,
      item.employeeNik,
      item.phaseLabel,
      item.periodeAwal,
      item.periodeAkhir,
      item.tanggalTtd,
      item.referenceSuratSebelumnya || '-'
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Agenda Kontrak');
    XLSX.writeFile(wb, `Buku_Agenda_Nomor_Kontrak_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Banner */}
      {savedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{savedToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSavedToast(null)}
            className="text-xs text-emerald-700 hover:underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-blue-600/90 text-white rounded-2xl shadow-sm border border-blue-400/30">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  Master Data & Agenda Penomoran Kontrak
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  PT. ANDHANA KIRANA YASA
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1">
                Atur formula nomor urut berurutan (+1), buku agenda surat keluar, dan profil legal perusahaan
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className="px-3.5 py-2 bg-emerald-950/60 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-700/50 flex items-center space-x-1.5 shadow-xs"
              title="Nomor urut surat disinkronkan secara otomatis (Auto-Sync Active)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Auto-Sync No. Urut Aktif</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-slate-50/70 px-5 flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('penomoran')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center space-x-2 border-b-2 ${
              activeTab === 'penomoran'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100/70'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Master Penomoran Kontrak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center space-x-2 border-b-2 ${
              activeTab === 'agenda'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100/70'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Buku Agenda Nomor Surat ({registeredContracts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('perusahaan')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center space-x-2 border-b-2 ${
              activeTab === 'perusahaan'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100/70'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Legal Perusahaan & Direktur</span>
          </button>
        </div>

        {/* Tab 1: Master Penomoran Kontrak */}
        {activeTab === 'penomoran' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
            {/* Concept explanation card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-center space-x-2.5 text-blue-950 font-extrabold text-sm">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Konsep Penomoran Kontrak PT. Andhana Kirana Yasa</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                <strong>Prinsip Penomoran:</strong> Setiap kali membuat surat perjanjian kerja baru (PKWT-I) maupun perpanjangan kontrak (PKWT-II s/d VI), 
                <strong> No Urut selalu bertambah 1 (+1)</strong> mengikuti nomor registrasi terakhir di perusahaan. 
                Untuk klausul perpanjangan kontrak, rujukan surat perjanjian sebelumnya tetap mencantumkan Nomor Surat Kontrak sebelumnya secara akurat.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
                <div className="bg-white p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-900 block mb-1">Kontrak Baru (Tahap K1):</span>
                  <code className="text-blue-700 font-mono font-bold">{sampleNextK1}</code>
                  <p className="text-gray-500 mt-1">Diterbitkan untuk karyawan baru (+1 dari nomor terakhir).</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-indigo-900 block mb-1">Perpanjangan ke-1 (Tahap K2):</span>
                  <code className="text-indigo-700 font-mono font-bold">{sampleNextK2}</code>
                  <p className="text-gray-500 mt-1">No Urut selalu +1, rujukan klausul merujuk ke No Surat K1.</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-violet-900 block mb-1">Perpanjangan ke-2 (Tahap K3):</span>
                  <code className="text-violet-700 font-mono font-bold">{sampleNextK3}</code>
                  <p className="text-gray-500 mt-1">No Urut selalu +1, rujukan klausul merujuk ke No Surat K2.</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
                  <Hash className="w-4 h-4 text-blue-600" />
                  <span>Pengaturan Agenda Nomor Urut</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Nomor Urut Terakhir yang Terbit:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      value={lastSeq}
                      onChange={(e) => setLastSeq(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-32 px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500 font-mono">
                      (Format 3 Digit: <strong>{lastSeq.toString().padStart(3, '0')}</strong>)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Nomor yang terbit berikutnya otomatis dimulai dari: <strong>{(lastSeq + 1).toString().padStart(3, '0')}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Kode Divisi / Unit Surat:
                  </label>
                  <input
                    type="text"
                    value={kodeDivisi}
                    onChange={(e) => setKodeDivisi(e.target.value.toUpperCase())}
                    placeholder="AKY-HRD"
                    className="w-full max-w-xs px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-xs uppercase font-bold focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Standar default divisi: <code>AKY-HRD</code> (Divisi Human Resources & Legal)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Pola Formula Format Surat:
                  </label>
                  <div className="p-2.5 bg-gray-100 rounded-xl border border-gray-200 font-mono text-xs text-gray-700">
                    [No Urut (3 digit)]/{kodeDivisi || 'AKY-HRD'}/PKWT-[Romawi Tahap]/[Bulan Romawi]/[Tahun]
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-gray-200 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Pratinjau Nomor Surat Kontrak Berikutnya</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Simulasi nomor yang akan otomatis dihasilkan saat menambah atau memperpanjang kontrak:
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Kontrak Baru (Tahap K1):</span>
                      <code className="text-xs font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                        {sampleNextK1}
                      </code>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Perpanjangan ke-1 (Tahap K2):</span>
                      <code className="text-xs font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                        {sampleNextK2}
                      </code>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Perpanjangan ke-2 (Tahap K3):</span>
                      <code className="text-xs font-mono font-extrabold text-violet-700 bg-violet-50 px-2 py-1 rounded-md">
                        {sampleNextK3}
                      </code>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 mt-3 flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Aturan Penomoran:</strong> Nomor urut bertambah <strong>+1</strong> setiap kali ada penomoran surat (kontrak baru maupun perpanjangan).</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex items-center justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Pengaturan Master Penomoran</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Buku Agenda Nomor Surat (All issued contracts) */}
        {activeTab === 'agenda' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nomor surat, nama karyawan, NIK, atau rujukan..."
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={exportAgendaToExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh seluruh buku agenda nomor surat ke Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Buku Agenda (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[60vh]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-16">No Urut</th>
                    <th className="py-2.5 px-3">Nomor Surat Kontrak</th>
                    <th className="py-2.5 px-3">Nama Karyawan</th>
                    <th className="py-2.5 px-3">Tahap</th>
                    <th className="py-2.5 px-3">Masa Berlaku</th>
                    <th className="py-2.5 px-3">Rujukan Kontrak Sebelumnya</th>
                    <th className="py-2.5 px-3">Tanggal TTD</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAgenda.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                        Tidak ada nomor surat yang cocok dengan pencarian "{agendaSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredAgenda.map((item, idx) => (
                      <tr key={`${item.nomorSurat}-${idx}`} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                          {item.formattedNoUrut}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                          {item.nomorSurat}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-gray-800 block">{item.employeeName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">NIK: {item.employeeNik}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.phase === 'K1' 
                              ? 'bg-blue-100 text-blue-800' 
                              : item.phase === 'K2'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-violet-100 text-violet-800'
                          }`}>
                            {item.phase}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-600">
                          {item.periodeAwal} s/d {item.periodeAkhir}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {item.referenceSuratSebelumnya && item.referenceSuratSebelumnya !== '-' ? (
                            <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {item.referenceSuratSebelumnya}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Kontrak Pertama</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-600">
                          {item.tanggalTtd}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {onOpenContract && (
                            <button
                              type="button"
                              onClick={() => onOpenContract(item.employee)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] flex items-center space-x-1 mx-auto cursor-pointer"
                              title="Buka pratinjau cetak surat kontrak ini"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Cetak</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Legal Perusahaan & Penandatangan Direktur */}
        {activeTab === 'perusahaan' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Identitas Pihak Pertama (Perusahaan & Pejabat Penandatangan)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nama Badan Usaha / Perusahaan:
                  </label>
                  <input
                    type="text"
                    value={namaPerusahaan}
                    onChange={(e) => setNamaPerusahaan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nama Direktur / Penandatangan Pihak Pertama:
                  </label>
                  <input
                    type="text"
                    value={namaDirektur}
                    onChange={(e) => setNamaDirektur(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Jabatan Pejabat Penandatangan:
                  </label>
                  <input
                    type="text"
                    value={jabatanDirektur}
                    onChange={(e) => setJabatanDirektur(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nomor Telepon Kantor:
                  </label>
                  <input
                    type="text"
                    value={teleponPerusahaan}
                    onChange={(e) => setTeleponPerusahaan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Alamat Lengkap Kantor Perusahaan:
                  </label>
                  <textarea
                    rows={2}
                    value={alamatPerusahaan}
                    onChange={(e) => setAlamatPerusahaan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nomor Fax Kantor:
                  </label>
                  <input
                    type="text"
                    value={faxPerusahaan}
                    onChange={(e) => setFaxPerusahaan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Data Perusahaan</span>
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
