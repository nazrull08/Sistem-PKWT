import React, { useState, useEffect } from 'react';
import { Employee, ContractPhase, EmployeeStatus } from '../types';
import { terbilang } from '../utils/terbilang';
import { formatAutoNoSurat, extractNoUrutFromSurat } from '../utils/mailMerge';
import { X, User, Check, Building, Calendar, Sparkles, Clock, Hourglass, ShieldCheck, AlertCircle, RotateCcw } from 'lucide-react';
import { saveEmployee } from '../services/db';
import { DatePickerInput } from './DatePickerInput';
import { addDaysToDate, addMonthsToDate, formatTanggalIndonesia } from '../utils/date';
import { cleanNoKtp, cleanExcelTextNumber } from '../utils/cleanText';
import { useToast } from '../context/ToastContext';
import { ContractPhaseMultiInputSection } from './ContractPhaseMultiInputSection';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSaved: () => void;
  totalEmployees: number;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSaved,
  totalEmployees
}) => {
  const { showToast } = useToast();
  const currentNo = employee?.no || totalEmployees + 1;

  const [nama, setNama] = useState(employee?.nama || '');
  const [tempatLahir, setTempatLahir] = useState(employee?.tempatLahir || '');
  const [tanggalLahir, setTanggalLahir] = useState(employee?.tanggalLahir || '');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-Laki' | 'Perempuan'>(employee?.jenisKelamin || 'Laki-Laki');
  const [noKtp, setNoKtp] = useState(employee?.noKtp || '');
  const [alamat, setAlamat] = useState(employee?.alamat || '');
  const [project, setProject] = useState(employee?.project || '');
  const [lokasiKerja, setLokasiKerja] = useState(employee?.lokasiKerja || 'Jakarta');
  const [noRekening, setNoRekening] = useState(employee?.noRekening || '');
  const [bank, setBank] = useState(employee?.bank || 'BCA');
  const [jabatan, setJabatan] = useState(employee?.jabatan || 'Operator');
  const [golongan, setGolongan] = useState(employee?.golongan || '0A');
  const [upah, setUpah] = useState<number>(employee?.upah || 5625883);
  const [ketUpah, setKetUpah] = useState(employee?.ketUpah || '( Lima Juta Enam Ratus Dua Puluh Lima Ribu Delapan Ratus Delapan Puluh Tiga Rupiah )');
  const [masaKontrak, setMasaKontrak] = useState(employee?.masaKontrak || '3 Bulan');
  const [email, setEmail] = useState(employee?.email || '');
  const [noHp, setNoHp] = useState(employee?.noHp || '');
  const [statusKaryawan, setStatusKaryawan] = useState<EmployeeStatus>(employee?.statusKaryawan || 'PKWT');
  const [currentContractPhase, setCurrentContractPhase] = useState<ContractPhase>(employee?.currentContractPhase || 'K1');
  const [ttdKaryawanUrl, setTtdKaryawanUrl] = useState<string | undefined>(employee?.ttdKaryawanUrl);

  // No Surat 1 s/d No Surat 6
  const [noSurat1, setNoSurat1] = useState(employee?.noSurat1 || formatAutoNoSurat(currentNo, 'K1'));
  const [noSurat2, setNoSurat2] = useState(employee?.noSurat2 || '');
  const [noSurat3, setNoSurat3] = useState(employee?.noSurat3 || '');
  const [noSurat4, setNoSurat4] = useState(employee?.noSurat4 || '');
  const [noSurat5, setNoSurat5] = useState(employee?.noSurat5 || '');
  const [noSurat6, setNoSurat6] = useState(employee?.noSurat6 || '');

  // K1 s/d K6 dates
  const [awalK1, setAwalK1] = useState(employee?.awalK1 || '');
  const [akhirK1, setAkhirK1] = useState(employee?.akhirK1 || '');
  const [ttd1, setTtd1] = useState(employee?.ttd1 || '');

  const [awalK2, setAwalK2] = useState(employee?.awalK2 || '');
  const [akhirK2, setAkhirK2] = useState(employee?.akhirK2 || '');
  const [ttd2, setTtd2] = useState(employee?.ttd2 || '');

  const [awalK3, setAwalK3] = useState(employee?.awalK3 || '');
  const [akhirK3, setAkhirK3] = useState(employee?.akhirK3 || '');
  const [ttd3, setTtd3] = useState(employee?.ttd3 || '');

  const [awalK4, setAwalK4] = useState(employee?.awalK4 || '');
  const [akhirK4, setAkhirK4] = useState(employee?.akhirK4 || '');
  const [ttd4, setTtd4] = useState(employee?.ttd4 || '');

  const [awalK5, setAwalK5] = useState(employee?.awalK5 || '');
  const [akhirK5, setAkhirK5] = useState(employee?.akhirK5 || '');
  const [ttd5, setTtd5] = useState(employee?.ttd5 || '');

  const [awalK6, setAwalK6] = useState(employee?.awalK6 || '');
  const [akhirK6, setAkhirK6] = useState(employee?.akhirK6 || '');
  const [ttd6, setTtd6] = useState(employee?.ttd6 || '');

  // Re-synchronize all fields when employee or modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (employee) {
      setNama(employee.nama || '');
      setTempatLahir(employee.tempatLahir || '');
      setTanggalLahir(employee.tanggalLahir || '');
      setJenisKelamin(employee.jenisKelamin || 'Laki-Laki');
      setNoKtp(employee.noKtp || '');
      setAlamat(employee.alamat || '');
      setProject(employee.project || '');
      setLokasiKerja(employee.lokasiKerja || 'Jakarta');
      setNoRekening(employee.noRekening || '');
      setBank(employee.bank || 'BCA');
      setJabatan(employee.jabatan || 'Operator');
      setGolongan(employee.golongan || '0A');
      setUpah(employee.upah || 5625883);
      setKetUpah(employee.ketUpah || `( ${terbilang(employee.upah || 5625883)} Rupiah )`);
      setMasaKontrak(employee.masaKontrak || '3 Bulan');
      setEmail(employee.email || '');
      setNoHp(employee.noHp || '');
      setStatusKaryawan(employee.statusKaryawan || 'PKWT');
      setCurrentContractPhase(employee.currentContractPhase || 'K1');
      setTtdKaryawanUrl(employee.ttdKaryawanUrl);

      setNoSurat1(employee.noSurat1 || formatAutoNoSurat(employee.no || currentNo, 'K1', employee.awalK1));
      setNoSurat2(employee.noSurat2 || '');
      setNoSurat3(employee.noSurat3 || '');
      setNoSurat4(employee.noSurat4 || '');
      setNoSurat5(employee.noSurat5 || '');
      setNoSurat6(employee.noSurat6 || '');

      setAwalK1(employee.awalK1 || '');
      setAkhirK1(employee.akhirK1 || '');
      setTtd1(employee.ttd1 || '');
      setAwalK2(employee.awalK2 || '');
      setAkhirK2(employee.akhirK2 || '');
      setTtd2(employee.ttd2 || '');
      setAwalK3(employee.awalK3 || '');
      setAkhirK3(employee.akhirK3 || '');
      setTtd3(employee.ttd3 || '');
      setAwalK4(employee.awalK4 || '');
      setAkhirK4(employee.akhirK4 || '');
      setTtd4(employee.ttd4 || '');
      setAwalK5(employee.awalK5 || '');
      setAkhirK5(employee.akhirK5 || '');
      setTtd5(employee.ttd5 || '');
      setAwalK6(employee.awalK6 || '');
      setAkhirK6(employee.akhirK6 || '');
      setTtd6(employee.ttd6 || '');
    } else {
      // New employee clean state
      setNama('');
      setTempatLahir('');
      setTanggalLahir('');
      setJenisKelamin('Laki-Laki');
      setNoKtp('');
      setAlamat('');
      setProject('');
      setLokasiKerja('Jakarta');
      setNoRekening('');
      setBank('BCA');
      setJabatan('Operator');
      setGolongan('0A');
      setUpah(5625883);
      setKetUpah('( Lima Juta Enam Ratus Dua Puluh Lima Ribu Delapan Ratus Delapan Puluh Tiga Rupiah )');
      setMasaKontrak('3 Bulan');
      setEmail('');
      setNoHp('');
      setStatusKaryawan('PKWT');
      setCurrentContractPhase('K1');
      setTtdKaryawanUrl(undefined);

      setNoSurat1(formatAutoNoSurat(currentNo, 'K1'));
      setNoSurat2('');
      setNoSurat3('');
      setNoSurat4('');
      setNoSurat5('');
      setNoSurat6('');

      setAwalK1('');
      setAkhirK1('');
      setTtd1('');
      setAwalK2('');
      setAkhirK2('');
      setTtd2('');
      setAwalK3('');
      setAkhirK3('');
      setTtd3('');
      setAwalK4('');
      setAkhirK4('');
      setTtd4('');
      setAwalK5('');
      setAkhirK5('');
      setTtd5('');
      setAwalK6('');
      setAkhirK6('');
      setTtd6('');
    }
  }, [isOpen, employee, currentNo]);

  const handleUpahChange = (val: number) => {
    setUpah(val);
    setKetUpah(`( ${terbilang(val)} Rupiah )`);
  };

  const handleAutoGenerateAllNoSurat = () => {
    // Mau buat baru ataupun perpanjangan, No Urut selalu bertambah 1 (+1) mengikuti nomor terakhir
    const baseNo = parseInt(extractNoUrutFromSurat(noSurat1) || String(currentNo), 10) || currentNo;
    const s1 = formatAutoNoSurat(baseNo, 'K1', awalK1);
    setNoSurat1(s1);
    if (awalK2) setNoSurat2(formatAutoNoSurat(baseNo + 1, 'K2', awalK2));
    if (awalK3) setNoSurat3(formatAutoNoSurat(baseNo + 2, 'K3', awalK3));
    if (awalK4) setNoSurat4(formatAutoNoSurat(baseNo + 3, 'K4', awalK4));
    if (awalK5) setNoSurat5(formatAutoNoSurat(baseNo + 4, 'K5', awalK5));
    if (awalK6) setNoSurat6(formatAutoNoSurat(baseNo + 5, 'K6', awalK6));
  };

  // Automated duration calculation for contract phases (Requirement 5)
  const applyDuration = (phase: 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6', months: number) => {
    if (phase === 'K1') {
      const baseAwal = awalK1.trim() || formatTanggalIndonesia(new Date());
      setAwalK1(baseAwal);
      setAkhirK1(addMonthsToDate(baseAwal, months));
      setTtd1(addDaysToDate(baseAwal, -3) || baseAwal);
      setMasaKontrak(`${months} Bulan`);
    } else if (phase === 'K2') {
      const baseAwal = awalK2.trim() || (akhirK1.trim() ? addDaysToDate(akhirK1, 1) : formatTanggalIndonesia(new Date()));
      setAwalK2(baseAwal);
      setAkhirK2(addMonthsToDate(baseAwal, months));
      setTtd2(addDaysToDate(baseAwal, -3) || baseAwal);
      setMasaKontrak(`${months} Bulan`);
      if (!noSurat2) {
        const num = parseInt(extractNoUrutFromSurat(noSurat1) || String(currentNo), 10) || currentNo;
        setNoSurat2(formatAutoNoSurat(num + 1, 'K2', baseAwal));
      }
    } else if (phase === 'K3') {
      const baseAwal = awalK3.trim() || (akhirK2.trim() ? addDaysToDate(akhirK2, 1) : formatTanggalIndonesia(new Date()));
      setAwalK3(baseAwal);
      setAkhirK3(addMonthsToDate(baseAwal, months));
      setTtd3(addDaysToDate(baseAwal, -3) || baseAwal);
      setMasaKontrak(`${months} Bulan`);
      if (!noSurat3) {
        const num = parseInt(extractNoUrutFromSurat(noSurat2 || noSurat1) || String(currentNo), 10) || currentNo;
        setNoSurat3(formatAutoNoSurat(num + 1, 'K3', baseAwal));
      }
    } else if (phase === 'K4') {
      const baseAwal = awalK4.trim() || (akhirK3.trim() ? addDaysToDate(akhirK3, 1) : formatTanggalIndonesia(new Date()));
      setAwalK4(baseAwal);
      setAkhirK4(addMonthsToDate(baseAwal, months));
      setTtd4(addDaysToDate(baseAwal, -3) || baseAwal);
      setMasaKontrak(`${months} Bulan`);
      if (!noSurat4) {
        const num = parseInt(extractNoUrutFromSurat(noSurat3 || noSurat2 || noSurat1) || String(currentNo), 10) || currentNo;
        setNoSurat4(formatAutoNoSurat(num + 1, 'K4', baseAwal));
      }
    } else if (phase === 'K5') {
      const baseAwal = awalK5.trim() || (akhirK4.trim() ? addDaysToDate(akhirK4, 1) : formatTanggalIndonesia(new Date()));
      setAwalK5(baseAwal);
      setAkhirK5(addMonthsToDate(baseAwal, months));
      setTtd5(addDaysToDate(baseAwal, -3) || baseAwal);
      setMasaKontrak(`${months} Bulan`);
      if (!noSurat5) {
        const num = parseInt(extractNoUrutFromSurat(noSurat4 || noSurat3 || noSurat2 || noSurat1) || String(currentNo), 10) || currentNo;
        setNoSurat5(formatAutoNoSurat(num + 1, 'K5', baseAwal));
      }
    } else if (phase === 'K6') {
      const baseAwal = awalK6.trim() || (akhirK5.trim() ? addDaysToDate(akhirK5, 1) : formatTanggalIndonesia(new Date()));
      setAwalK6(baseAwal);
      setAkhirK6(addMonthsToDate(baseAwal, months));
      setTtd6(addDaysToDate(baseAwal, -3) || baseAwal);
      setMasaKontrak(`${months} Bulan`);
      if (!noSurat6) {
        const num = parseInt(extractNoUrutFromSurat(noSurat5 || noSurat4 || noSurat3 || noSurat2 || noSurat1) || String(currentNo), 10) || currentNo;
        setNoSurat6(formatAutoNoSurat(num + 1, 'K6', baseAwal));
      }
    }
  };

  const handleTtdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTtdKaryawanUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const derivedPhase: ContractPhase = awalK6 ? 'K6' : awalK5 ? 'K5' : awalK4 ? 'K4' : awalK3 ? 'K3' : awalK2 ? 'K2' : currentContractPhase || 'K1';

    const newEmp: Employee = {
      id: employee?.id || `emp-${Date.now()}`,
      no: currentNo,
      nama: nama.toUpperCase().trim(),
      tempatLahir: tempatLahir.toUpperCase().trim(),
      tanggalLahir: formatTanggalIndonesia(tanggalLahir) || tanggalLahir.trim(),
      jenisKelamin,
      noKtp: cleanNoKtp(noKtp),
      alamat: alamat.toUpperCase().trim(),
      project: project.trim(),
      lokasiKerja: lokasiKerja.trim(),
      noRekening: cleanExcelTextNumber(noRekening),
      bank: bank.trim(),
      jabatan: jabatan.trim(),
      golongan: golongan.trim(),
      upah,
      ketUpah,
      masaKontrak,
      email: email.trim() || `${nama.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      noHp: cleanExcelTextNumber(noHp) || '6281234567890',
      statusKaryawan,
      currentContractPhase: derivedPhase,
      ttdKaryawanUrl,
      noSurat1: noSurat1.trim() || formatAutoNoSurat(currentNo, 'K1', awalK1),
      noSurat2: noSurat2.trim(),
      noSurat3: noSurat3.trim(),
      noSurat4: noSurat4.trim(),
      noSurat5: noSurat5.trim(),
      noSurat6: noSurat6.trim(),
      awalK1: formatTanggalIndonesia(awalK1) || awalK1.trim(),
      akhirK1: formatTanggalIndonesia(akhirK1) || akhirK1.trim(),
      ttd1: formatTanggalIndonesia(ttd1) || ttd1.trim(),
      awalK2: formatTanggalIndonesia(awalK2) || awalK2.trim(),
      akhirK2: formatTanggalIndonesia(akhirK2) || akhirK2.trim(),
      ttd2: formatTanggalIndonesia(ttd2) || ttd2.trim(),
      awalK3: formatTanggalIndonesia(awalK3) || awalK3.trim(),
      akhirK3: formatTanggalIndonesia(akhirK3) || akhirK3.trim(),
      ttd3: formatTanggalIndonesia(ttd3) || ttd3.trim(),
      awalK4: formatTanggalIndonesia(awalK4) || awalK4.trim(),
      akhirK4: formatTanggalIndonesia(akhirK4) || akhirK4.trim(),
      ttd4: formatTanggalIndonesia(ttd4) || ttd4.trim(),
      awalK5: formatTanggalIndonesia(awalK5) || awalK5.trim(),
      akhirK5: formatTanggalIndonesia(akhirK5) || akhirK5.trim(),
      ttd5: formatTanggalIndonesia(ttd5) || ttd5.trim(),
      awalK6: formatTanggalIndonesia(awalK6) || awalK6.trim(),
      akhirK6: formatTanggalIndonesia(akhirK6) || akhirK6.trim(),
      ttd6: formatTanggalIndonesia(ttd6) || ttd6.trim(),
      updatedAt: new Date().toISOString()
    };

    const isEditing = !!employee;
    await saveEmployee(newEmp);
    if (isEditing) {
      showToast('edit', 'Data Berhasil Diperbarui', `Perubahan data karyawan "${newEmp.nama}" berhasil disimpan.`);
    } else {
      showToast('success', 'Data Berhasil Disimpan', `Data karyawan baru "${newEmp.nama}" berhasil disimpan ke database.`);
    }
    onSaved();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-slate-900/60 backdrop-blur-xs select-none overflow-hidden animate-in fade-in duration-150">
      <div className="bg-slate-100 w-full h-full flex flex-col overflow-hidden">
        {/* Full Screen Top Header */}
        <header className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 shadow-md">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-base tracking-tight">
                  {employee ? 'Edit Profil & Kontrak Karyawan' : 'Form Input Tambah Karyawan Baru'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {employee ? `NIK: ${employee.noKtp}` : `No. Urut #${currentNo}`}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Full Screen Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pengelolaan biodata identitas, data penggajian, durasi otomatis, dan penomoran resmi kontrak PKWT 1 s/d 6
              </p>
            </div>
          </div>

          {/* Action buttons on Top Header */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-700 flex items-center space-x-1.5"
            >
              <X className="w-4 h-4" />
              <span>Batal (Esc)</span>
            </button>
            <button
              type="submit"
              form="employee-modal-form"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Profil Karyawan</span>
            </button>
          </div>
        </header>

        {/* Scrollable Form Body with max comfort and spacious padding */}
        <form id="employee-modal-form" onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-xs max-w-7xl mx-auto w-full">
          {/* Biodata */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-xs">
              <User className="w-4 h-4 text-blue-600" />
              1. Biodata & Identitas Pribadi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-medium text-gray-700 mb-1">Nama Lengkap (KTP)</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: AHMAD DAMAN HURI"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">No. KTP / NIK (16 Digit)</label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={noKtp}
                  onChange={(e) => setNoKtp(e.target.value)}
                  placeholder="3172030611050004"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  required
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                  placeholder="JAKARTA"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span>Tanggal Lahir</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Show Tanggal 📅</span>
                </label>
                <DatePickerInput
                  value={tanggalLahir}
                  onChange={setTanggalLahir}
                  formatMode="dmy"
                  placeholder="06/06/2000"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                <select
                  value={jenisKelamin}
                  onChange={(e) => setJenisKelamin(e.target.value as 'Laki-Laki' | 'Perempuan')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="Laki-Laki">Laki-Laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Alamat Lengkap KTP</label>
              <textarea
                rows={2}
                required
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="JLN PLUMPANG SEMPER NO 6 RT 1 RW 12..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Nomor WhatsApp Aktif</label>
                <input
                  type="text"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="6281234567801"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Email Karyawan</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmad@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-gray-700">Gambar TTD Karyawan</label>
                  {ttdKaryawanUrl && (
                    <button
                      type="button"
                      onClick={() => setTtdKaryawanUrl(undefined)}
                      className="text-rose-600 text-[10px] hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {ttdKaryawanUrl ? (
                    <img src={ttdKaryawanUrl} alt="TTD" className="h-8 w-16 object-contain border bg-white rounded" />
                  ) : (
                    <span className="text-gray-400 text-[10px] italic">Kosong</span>
                  )}
                  <label className="px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded cursor-pointer text-[10.5px]">
                    Upload
                    <input type="file" accept="image/*" onChange={handleTtdUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Penempatan & Rekening */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-xs">
              <Building className="w-4 h-4 text-blue-600" />
              2. Penempatan & Penggajian
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Jabatan</label>
                <input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Operator"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Golongan</label>
                <input
                  type="text"
                  value={golongan}
                  onChange={(e) => setGolongan(e.target.value)}
                  placeholder="0A"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Lokasi Kerja</label>
                <input
                  type="text"
                  value={lokasiKerja}
                  onChange={(e) => setLokasiKerja(e.target.value)}
                  placeholder="Jakarta"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Project / Ref</label>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="001/AKY-HRD/..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Gaji Pokok (Upah)</label>
                <input
                  type="number"
                  value={upah}
                  onChange={(e) => handleUpahChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Bank Pembayaran</label>
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="BCA"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">No. Rekening</label>
                <input
                  type="text"
                  value={noRekening}
                  onChange={(e) => setNoRekening(e.target.value)}
                  placeholder="5745940924"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Keterangan Upah (Terbilang)</label>
              <input
                type="text"
                value={ketUpah}
                onChange={(e) => setKetUpah(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg italic text-gray-700"
              />
            </div>
          </div>

          {/* Status Kepegawaian & Fase Kontrak */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Status Kepegawaian &amp; Fase Kontrak
              </h4>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                statusKaryawan === 'SELESAI' ? 'bg-gray-200 text-gray-800' :
                statusKaryawan === 'PKWTT' ? 'bg-purple-100 text-purple-800' :
                statusKaryawan === 'NONAKTIF' ? 'bg-red-100 text-red-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                Status: {statusKaryawan}
              </span>
            </div>

            {statusKaryawan === 'SELESAI' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Karyawan ini berstatus SELESAI (Kontrak Berakhir).</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Anda dapat mengaktifkan kembali karyawan menjadi <strong>PKWT (Aktif)</strong> atau <strong>PKWTT (Tetap)</strong> cukup dengan mengganti pilihan <em>Status Karyawan</em> di bawah dan menekan <em>Simpan Profil Karyawan</em>, atau mengedit data/nomor surat kontrak kapan saja.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Status Karyawan</label>
                <select
                  value={statusKaryawan}
                  onChange={(e) => setStatusKaryawan(e.target.value as EmployeeStatus)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PKWT">PKWT (Kontrak Waktu Tertentu - Aktif)</option>
                  <option value="PKWTT">PKWTT (Perjanjian Kerja Waktu Tidak Tertentu - Tetap)</option>
                  <option value="SELESAI">SELESAI (Masa Kontrak Berakhir)</option>
                  <option value="NONAKTIF">NONAKTIF (Resign / Keluar)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Tahap Kontrak Aktif (Current Phase)</label>
                <select
                  value={currentContractPhase}
                  onChange={(e) => setCurrentContractPhase(e.target.value as ContractPhase)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-gray-900 bg-white font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="K1">K1 (Kontrak 1 Awal)</option>
                  <option value="K2">K2 (Perpanjangan 1)</option>
                  <option value="K3">K3 (Perpanjangan 2)</option>
                  <option value="K4">K4 (Perpanjangan 3)</option>
                  <option value="K5">K5 (Perpanjangan 4)</option>
                  <option value="K6">K6 (Perpanjangan 5)</option>
                  <option value="PKWTT">PKWTT (Tetap)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Riwayat Kontrak & No Surat K1 s/d K6 (Mendukung Multi-Input Data & Penghapusan Duplikat) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  3. Riwayat Kontrak, No Surat, Tanggal & TTD (K1 s/d K6)
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Mendukung multi-input per fase kontrak. Jika terdapat entri ganda (misal 2 No Surat di K3), Anda dapat menambah atau menghapus entri dengan 1 klik.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoGenerateAllNoSurat}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-blue-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Generate Otomatis Semua No Surat (+1)</span>
              </button>
            </div>

            <div className="space-y-3">
              <ContractPhaseMultiInputSection
                phase="K1"
                label="Tahap K1 (Kontrak Awal / Baru)"
                employeeNo={currentNo}
                noSurat={noSurat1}
                awal={awalK1}
                akhir={akhirK1}
                ttd={ttd1}
                onChange={(data) => {
                  setNoSurat1(data.noSurat);
                  setAwalK1(data.awal);
                  setAkhirK1(data.akhir);
                  setTtd1(data.ttd);
                }}
                onApplyDuration={(m) => applyDuration('K1', m)}
                phaseColor="blue"
              />

              <ContractPhaseMultiInputSection
                phase="K2"
                label="Tahap K2 (Perpanjangan 1)"
                employeeNo={currentNo}
                noSurat={noSurat2}
                awal={awalK2}
                akhir={akhirK2}
                ttd={ttd2}
                onChange={(data) => {
                  setNoSurat2(data.noSurat);
                  setAwalK2(data.awal);
                  setAkhirK2(data.akhir);
                  setTtd2(data.ttd);
                }}
                onApplyDuration={(m) => applyDuration('K2', m)}
                phaseColor="indigo"
              />

              <ContractPhaseMultiInputSection
                phase="K3"
                label="Tahap K3 (Perpanjangan 2)"
                employeeNo={currentNo}
                noSurat={noSurat3}
                awal={awalK3}
                akhir={akhirK3}
                ttd={ttd3}
                onChange={(data) => {
                  setNoSurat3(data.noSurat);
                  setAwalK3(data.awal);
                  setAkhirK3(data.akhir);
                  setTtd3(data.ttd);
                }}
                onApplyDuration={(m) => applyDuration('K3', m)}
                phaseColor="emerald"
              />

              <ContractPhaseMultiInputSection
                phase="K4"
                label="Tahap K4 (Perpanjangan 3)"
                employeeNo={currentNo}
                noSurat={noSurat4}
                awal={awalK4}
                akhir={akhirK4}
                ttd={ttd4}
                onChange={(data) => {
                  setNoSurat4(data.noSurat);
                  setAwalK4(data.awal);
                  setAkhirK4(data.akhir);
                  setTtd4(data.ttd);
                }}
                onApplyDuration={(m) => applyDuration('K4', m)}
                phaseColor="amber"
              />

              <ContractPhaseMultiInputSection
                phase="K5"
                label="Tahap K5 (Perpanjangan 4)"
                employeeNo={currentNo}
                noSurat={noSurat5}
                awal={awalK5}
                akhir={akhirK5}
                ttd={ttd5}
                onChange={(data) => {
                  setNoSurat5(data.noSurat);
                  setAwalK5(data.awal);
                  setAkhirK5(data.akhir);
                  setTtd5(data.ttd);
                }}
                onApplyDuration={(m) => applyDuration('K5', m)}
                phaseColor="slate"
              />

              <ContractPhaseMultiInputSection
                phase="K6"
                label="Tahap K6 (Perpanjangan 5)"
                employeeNo={currentNo}
                noSurat={noSurat6}
                awal={awalK6}
                akhir={akhirK6}
                ttd={ttd6}
                onChange={(data) => {
                  setNoSurat6(data.noSurat);
                  setAwalK6(data.awal);
                  setAkhirK6(data.akhir);
                  setTtd6(data.ttd);
                }}
                onApplyDuration={(m) => applyDuration('K6', m)}
                phaseColor="purple"
              />
            </div>
          </div>

        </form>

        {/* Sticky Bottom Actions Bar */}
        <footer className="px-6 py-3.5 bg-white border-t border-gray-200 flex items-center justify-between shrink-0 shadow-lg">
          <div className="text-xs text-gray-500 flex items-center space-x-2">
            <span>Nomor Urut Surat Aktif:</span>
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {(parseInt(extractNoUrutFromSurat(noSurat1) || String(currentNo), 10) || currentNo).toString().padStart(3, '0')}
            </span>
            <span className="text-gray-400">• Form Full Screen AKY HRD</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Batal (Esc)
            </button>
            <button
              type="submit"
              form="employee-modal-form"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center space-x-2 transition-all active:scale-95 cursor-pointer text-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Profil Karyawan</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
