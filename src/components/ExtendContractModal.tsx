import React, { useState, useEffect } from 'react';
import { Employee, ContractPhase } from '../types';
import { 
  getLatestFilledPhase, 
  getNextContractPhase, 
  formatAutoNoSurat,
  getNextAvailableNoUrut,
  recordIssuedSequence
} from '../utils/mailMerge';
import { addDaysToDate, addMonthsToDate, formatTanggalIndonesia } from '../utils/date';
import { saveEmployee, getLocalEmployees } from '../services/db';
import { DatePickerInput } from './DatePickerInput';
import { useToast } from '../context/ToastContext';
import { 
  X, 
  Calendar, 
  FileCheck2, 
  Sparkles, 
  Clock, 
  ArrowRight,
  Printer,
  Hourglass,
  Link
} from 'lucide-react';

interface ExtendContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccessAndPrint: (updatedEmployee: Employee, extendedPhase: ContractPhase) => void;
  allEmployees?: Employee[];
}

export const ExtendContractModal: React.FC<ExtendContractModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccessAndPrint,
  allEmployees = []
}) => {
  const { showToast } = useToast();
  const currentPhase = employee ? getLatestFilledPhase(employee) : 'K1';
  const defaultNextPhase = (employee ? getNextContractPhase(currentPhase) : 'K2') || 'K2';
  const [targetPhase, setTargetPhase] = useState<ContractPhase>(defaultNextPhase);

  const isSelesai = employee?.statusKaryawan === 'SELESAI';

  // Duration in months
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [customDuration, setCustomDuration] = useState<string>('3 Bulan');

  // State for extension dates
  const [awalKontrak, setAwalKontrak] = useState('');
  const [akhirKontrak, setAkhirKontrak] = useState('');
  const [tanggalTtd, setTanggalTtd] = useState('');
  const [noSurat, setNoSurat] = useState('');
  const [prevNoSuratRef, setPrevNoSuratRef] = useState('');

  const effectiveEmployees = (allEmployees && allEmployees.length > 0) ? allEmployees : getLocalEmployees();

  // Reset targetPhase when defaultNextPhase or employee changes
  useEffect(() => {
    if (defaultNextPhase) {
      setTargetPhase(defaultNextPhase);
    }
  }, [defaultNextPhase, employee?.id]);

  // Calculate default dates when modal opens or employee changes
  useEffect(() => {
    if (!isOpen || !employee) return;

    // Detect previous contract end date & previous No Surat
    let prevAkhir = '';
    let prevNoSurat = '';

    if (currentPhase === 'K1') {
      prevAkhir = employee.akhirK1 || '';
      prevNoSurat = employee.noSurat1 || '';
    } else if (currentPhase === 'K2') {
      prevAkhir = employee.akhirK2 || employee.akhirK1 || '';
      prevNoSurat = employee.noSurat2 || employee.noSurat1 || '';
    } else if (currentPhase === 'K3') {
      prevAkhir = employee.akhirK3 || employee.akhirK2 || '';
      prevNoSurat = employee.noSurat3 || employee.noSurat2 || '';
    } else if (currentPhase === 'K4') {
      prevAkhir = employee.akhirK4 || employee.akhirK3 || '';
      prevNoSurat = employee.noSurat4 || employee.noSurat3 || '';
    } else if (currentPhase === 'K5') {
      prevAkhir = employee.akhirK5 || employee.akhirK4 || '';
      prevNoSurat = employee.noSurat5 || employee.noSurat4 || '';
    }

    setPrevNoSuratRef(prevNoSurat);

    // Step 1: Start date is +1 day after previous contract ended
    let calculatedAwal = '';
    if (prevAkhir.trim()) {
      calculatedAwal = addDaysToDate(prevAkhir, 1);
    }
    if (!calculatedAwal) {
      calculatedAwal = formatTanggalIndonesia(new Date());
    }

    // Step 2: End date based on default duration (3 months)
    const calculatedAkhir = addMonthsToDate(calculatedAwal, durationMonths);

    // Step 3: TTD Date is 3 days before start date
    const calculatedTtd = addDaysToDate(calculatedAwal, -3) || calculatedAwal;

    setAwalKontrak(calculatedAwal);
    setAkhirKontrak(calculatedAkhir);
    setTanggalTtd(calculatedTtd);

    // Step 4: Auto-generate No Surat where No Urut always increments (+1 from last contract in company / master data)
    const empList = (allEmployees && allEmployees.length > 0) ? allEmployees : getLocalEmployees();
    const nextSeq = getNextAvailableNoUrut(empList);
    const autoNumber = formatAutoNoSurat(nextSeq, targetPhase, calculatedAwal);
    setNoSurat(autoNumber);
  }, [isOpen, employee, targetPhase, currentPhase, allEmployees]);

  if (!isOpen || !employee) return null;

  // Handler when duration selection changes
  const handleDurationChange = (months: number, label: string) => {
    setDurationMonths(months);
    setCustomDuration(label);
    if (awalKontrak.trim() && months > 0) {
      const newAkhir = addMonthsToDate(awalKontrak, months);
      setAkhirKontrak(newAkhir);
    }
  };

  // Handler when start date changes (via text or "Show Tanggal" calendar)
  const handleAwalChange = (val: string) => {
    setAwalKontrak(val);
    if (val.trim()) {
      // Recalculate end date with active duration
      if (durationMonths > 0) {
        const newAkhir = addMonthsToDate(val, durationMonths);
        setAkhirKontrak(newAkhir);
      }
      // Recalculate signature date (-3 days)
      const newTtd = addDaysToDate(val, -3) || val;
      setTanggalTtd(newTtd);

      // Recalculate No Surat with next sequence and updated month/year
      const empList = (allEmployees && allEmployees.length > 0) ? allEmployees : getLocalEmployees();
      const nextSeq = getNextAvailableNoUrut(empList);
      const autoNumber = formatAutoNoSurat(nextSeq, targetPhase, val);
      setNoSurat(autoNumber);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awalKontrak || !akhirKontrak) {
      alert('Mohon lengkapi Tanggal Awal dan Akhir Kontrak.');
      return;
    }

    const updated: Employee = {
      ...employee,
      currentContractPhase: targetPhase,
      masaKontrak: customDuration || `${durationMonths} Bulan`,
      statusKaryawan: 'PKWT',
      updatedAt: new Date().toISOString()
    };

    // Store in the correct column based on targetPhase
    if (targetPhase === 'K2') {
      updated.noSurat2 = noSurat;
      updated.awalK2 = awalKontrak;
      updated.akhirK2 = akhirKontrak;
      updated.ttd2 = tanggalTtd || awalKontrak;
    } else if (targetPhase === 'K3') {
      updated.noSurat3 = noSurat;
      updated.awalK3 = awalKontrak;
      updated.akhirK3 = akhirKontrak;
      updated.ttd3 = tanggalTtd || awalKontrak;
    } else if (targetPhase === 'K4') {
      updated.noSurat4 = noSurat;
      updated.awalK4 = awalKontrak;
      updated.akhirK4 = akhirKontrak;
      updated.ttd4 = tanggalTtd || awalKontrak;
    } else if (targetPhase === 'K5') {
      updated.noSurat5 = noSurat;
      updated.awalK5 = awalKontrak;
      updated.akhirK5 = akhirKontrak;
      updated.ttd5 = tanggalTtd || awalKontrak;
    } else if (targetPhase === 'K6') {
      updated.noSurat6 = noSurat;
      updated.awalK6 = awalKontrak;
      updated.akhirK6 = akhirKontrak;
      updated.ttd6 = tanggalTtd || awalKontrak;
    }

    recordIssuedSequence(noSurat);
    await saveEmployee(updated);
    showToast(
      'info',
      'Perpanjangan Kontrak Berhasil',
      `Perpanjangan kontrak ${targetPhase} untuk "${updated.nama}" berhasil disimpan dan status kembali aktif (PKWT).`
    );
    onClose();
    onSuccessAndPrint(updated, targetPhase);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">
                Perpanjang Kontrak Karyawan
              </h3>
              <p className="text-xs text-gray-500">
                Pembaruan masa PKWT, durasi otomatis &amp; penomoran surat berurutan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Selesai Status Alert */}
          {isSelesai && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-950">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-emerald-900">Perpanjang &amp; Aktifkan Kembali Kontrak</span>
                <p className="text-[11px] text-emerald-800 leading-snug mt-0.5">
                  Karyawan saat ini berstatus <strong>SELESAI</strong>. Dengan menyimpan perpanjangan ini, status karyawan akan otomatis diaktifkan kembali menjadi <strong>PKWT ({targetPhase})</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Employee Info Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-500 font-medium">Nama Karyawan:</span>
                <h4 className="text-sm font-extrabold text-gray-900 uppercase">{employee.nama}</h4>
              </div>
              <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-mono text-[11px] font-bold text-gray-700">
                No Urut: {employee.no.toString().padStart(3, '0')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Tahap Saat Ini: <strong className="text-gray-900">{currentPhase}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-blue-700">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Tahap Baru:</span>
                <div className="flex items-center gap-1">
                  {(['K2', 'K3', 'K4', 'K5', 'K6'] as ContractPhase[]).map((phase) => (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setTargetPhase(phase)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        targetPhase === phase
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Durasi Kontrak Selector (Requirement 5) */}
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-indigo-950 font-bold flex items-center gap-1">
                <Hourglass className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilih Durasi Kontrak (Otomatisasi Periode):</span>
              </label>
              <span className="text-[10px] font-semibold text-indigo-700">
                Otomatis hitung tanggal akhir
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-0.5">
              {[
                { label: '1 Bulan', m: 1 },
                { label: '2 Bulan', m: 2 },
                { label: '3 Bulan', m: 3 },
                { label: '6 Bulan', m: 6 },
                { label: '9 Bulan', m: 9 },
                { label: '12 Bulan', m: 12 },
                { label: '24 Bulan', m: 24 },
              ].map(opt => (
                <button
                  key={opt.m}
                  type="button"
                  onClick={() => handleDurationChange(opt.m, opt.label)}
                  className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all cursor-pointer text-[11px] ${
                    durationMonths === opt.m
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="pt-1 flex items-center justify-between text-[11px] text-indigo-900 font-medium">
              <span>Periode otomatis: <strong>{awalKontrak || '-'}</strong> s/d <strong>{akhirKontrak || '-'}</strong></span>
              <span className="bg-indigo-100 px-2 py-0.5 rounded text-indigo-800 font-bold">{customDuration}</span>
            </div>
          </div>

          {/* Form Inputs: Tanggal Awal, Tanggal Akhir, Tanggal TTD with "Show Tanggal" */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Tanggal Awal Kontrak:
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Show Tanggal 📅</span>
                </label>
                <DatePickerInput
                  value={awalKontrak}
                  onChange={handleAwalChange}
                  placeholder="Contoh: 01 Oktober 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Tanggal Akhir Kontrak:
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Show Tanggal 📅</span>
                </label>
                <DatePickerInput
                  value={akhirKontrak}
                  onChange={setAkhirKontrak}
                  placeholder="Contoh: 30 Juni 2027"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>Tanggal Penandatanganan Kontrak (TTD):</span>
                <span className="text-[10px] text-gray-400 font-normal">Show Tanggal 📅</span>
              </label>
              <DatePickerInput
                value={tanggalTtd}
                onChange={setTanggalTtd}
                placeholder="Contoh: 28 September 2026"
                required
              />
            </div>

            {/* Nomor Surat Terbuat Otomatis Berurutan & Referensi Kontrak Lama */}
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Nomor Surat {targetPhase} Baru (No Urut Bertambah +1):
                </span>
                <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold font-mono">
                  Agenda Surat Keluar
                </span>
              </div>
              <input
                type="text"
                required
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 bg-white border border-blue-300 rounded-lg font-mono font-bold text-gray-900 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between text-[10.5px] text-gray-500 px-0.5">
                <span>No urut master agenda: <strong className="text-blue-900 font-mono font-bold">{getNextAvailableNoUrut(effectiveEmployees).toString().padStart(3, '0')}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    const seq = getNextAvailableNoUrut(effectiveEmployees);
                    setNoSurat(formatAutoNoSurat(seq, targetPhase, awalKontrak));
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold text-[10.5px]"
                >
                  Pakai No Master ({getNextAvailableNoUrut(effectiveEmployees).toString().padStart(3, '0')})
                </button>
              </div>

              {/* Previous Contract Reference */}
              <div className="p-2 bg-white/90 rounded-lg border border-blue-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Link className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Referensi Kontrak Sebelumnya:</span>
                </div>
                <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded">
                  {prevNoSuratRef || 'Belum ada surat sebelumnya'}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Simpan &amp; Cetak Kontrak {targetPhase}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
