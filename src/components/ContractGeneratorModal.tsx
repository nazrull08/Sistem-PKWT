import React, { useState } from 'react';
import { Employee, ContractDocumentData, ContractPhase } from '../types';
import { terbilang } from '../utils/terbilang';
import { formatTanggalIndonesia } from '../utils/date';
import { X, FileText, Check, Shield, Sparkles } from 'lucide-react';
import { saveContract, saveEmployee } from '../services/db';

import { formatAutoNoSurat, extractNoUrutFromSurat, getNextAvailableNoUrut, recordIssuedSequence } from '../utils/mailMerge';
import { DatePickerInput } from './DatePickerInput';

interface ContractGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onContractCreated: (contract: ContractDocumentData) => void;
}

export const ContractGeneratorModal: React.FC<ContractGeneratorModalProps> = ({
  isOpen,
  onClose,
  employee,
  onContractCreated
}) => {
  // Next phase calculation
  const nextPhase: ContractPhase = 
    employee?.currentContractPhase === 'K1' ? 'K2' :
    employee?.currentContractPhase === 'K2' ? 'K3' :
    employee?.currentContractPhase === 'K3' ? 'K4' :
    employee?.currentContractPhase === 'K4' ? 'K5' :
    employee?.currentContractPhase === 'K5' ? 'K6' : 'PKWTT';

  // State defaults - unconditionally called
  const [jenisPerjanjian, setJenisPerjanjian] = useState<'PKWT' | 'PKWTT'>('PKWT');
  const [phase, setPhase] = useState<ContractPhase>(nextPhase);
  const prevNo = employee?.noSurat5 || employee?.noSurat4 || employee?.noSurat3 || employee?.noSurat2 || employee?.noSurat1;
  const nextSeq = getNextAvailableNoUrut();
  const [nomorSurat, setNomorSurat] = useState(
    employee ? formatAutoNoSurat(nextSeq, nextPhase, undefined, prevNo) : ''
  );
  const [nomorSuratSebelumnya, setNomorSuratSebelumnya] = useState(
    prevNo || (employee ? formatAutoNoSurat(employee.no || 1, 'K1') : '001/AKY-HRD/PKWT-I/VI/2025')
  );
  const [tanggalSuratSebelumnya, setTanggalSuratSebelumnya] = useState(
    employee?.ttd2 || employee?.ttd1 || '01 April 2026'
  );
  const [periodeAwalSebelumnya, setPeriodeAwalSebelumnya] = useState(
    employee?.awalK2 || employee?.awalK1 || '01 April 2026'
  );
  const [periodeAkhirSebelumnya, setPeriodeAkhirSebelumnya] = useState(
    employee?.akhirK2 || employee?.akhirK1 || '30 September 2026'
  );
  
  const [jabatan, setJabatan] = useState(employee?.jabatan || 'Operator');
  const [golongan, setGolongan] = useState(employee?.golongan || '0A');
  const [tanggalMulai, setTanggalMulai] = useState('01 Oktober 2026');
  const [tanggalSelesai, setTanggalSelesai] = useState('30 Juni 2027');
  const [masaKontrak, setMasaKontrak] = useState(employee?.masaKontrak || '9 Bulan');
  
  const [upah, setUpah] = useState<number>(employee?.upah || 5910371);
  const [ketUpah, setKetUpah] = useState(employee?.ketUpah || terbilang(employee?.upah || 5910371));

  const [bank, setBank] = useState(employee?.bank || 'BCA');
  const [noRekening, setNoRekening] = useState(employee?.noRekening || '5745940924');
  const [namaRekening, setNamaRekening] = useState(employee?.nama || '');

  const [tempatTtd, setTempatTtd] = useState('Jakarta');
  const [tanggalTtd, setTanggalTtd] = useState('28 September 2026');

  const handleUpahChange = (val: number) => {
    setUpah(val);
    setKetUpah(terbilang(val));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    const newContract: ContractDocumentData = {
      id: `contract-${employee.id}-${Date.now()}`,
      employeeId: employee.id,
      nomorSurat,
      nomorSuratSebelumnya: phase !== 'K1' ? nomorSuratSebelumnya : undefined,
      tanggalSuratSebelumnya: phase !== 'K1' ? tanggalSuratSebelumnya : undefined,
      periodeAwalSebelumnya: phase !== 'K1' ? periodeAwalSebelumnya : undefined,
      periodeAkhirSebelumnya: phase !== 'K1' ? periodeAkhirSebelumnya : undefined,
      jenisPerjanjian,
      phase,
      
      namaPihakPertama: 'PT. ANDHANA KIRANA YASA',
      wakilPihakPertama: 'GIMMY KURNIAWAN IMANTO',
      jabatanPihakPertama: 'Direktur',
      alamatPihakPertama: 'Bukit Gading Raya Blok N No. 11, Kelapa Gading Barat – Kelapa Gading, Jakarta Utara - 14240',
      telpPihakPertama: '021 - 4516027',
      faxPihakPertama: '021 - 45852414',

      namaKaryawan: employee.nama,
      nikKaryawan: employee.noKtp,
      tempatTanggalLahir: `${employee.tempatLahir} , ${employee.tanggalLahir}`,
      jenisKelamin: employee.jenisKelamin,
      alamatKaryawan: employee.alamat,

      jabatanKaryawan: jabatan,
      golonganJabatan: golongan,
      tanggalMulai,
      tanggalSelesai,
      masaKontrak,
      upah,
      ketUpah,
      namaBank: bank,
      noRekening,
      atasNamaRekening: namaRekening,

      tempatTtd,
      tanggalTtd,
      statusTtd: 'DRAFT',
      docHash: `AKY-${phase}-${Math.floor(1000 + Math.random() * 9000)}-LEGAL`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save contract
    await saveContract(newContract);
    recordIssuedSequence(nomorSurat);

    // Update employee current phase
    const updatedEmployee: Employee = {
      ...employee,
      currentContractPhase: phase,
      jabatan,
      golongan,
      upah,
      ketUpah,
      masaKontrak,
      bank,
      noRekening,
      noSurat2: nomorSurat,
      awalK3: phase === 'K3' ? tanggalMulai : employee.awalK3,
      akhirK3: phase === 'K3' ? tanggalSelesai : employee.akhirK3,
      ttd3: phase === 'K3' ? tanggalTtd : employee.ttd3,
    };
    await saveEmployee(updatedEmployee);

    onContractCreated(newContract);
    onClose();
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Buat Dokumen Kontrak Kerja Resmi</h3>
              <p className="text-xs text-gray-500">
                Penerbitan PKWT/PKWTT untuk: <span className="font-semibold text-gray-800">{employee.nama}</span> ({employee.noKtp})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Section: Klasifikasi Kontrak */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Klasifikasi & Nomor Perjanjian
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Kontrak</label>
                <select
                  value={jenisPerjanjian}
                  onChange={(e) => setJenisPerjanjian(e.target.value as 'PKWT' | 'PKWTT')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PKWT">PKWT (Waktu Tertentu)</option>
                  <option value="PKWTT">PKWTT (Tetap)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tahap Kontrak</label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as ContractPhase)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="K1">K1 (Kontrak Pertama)</option>
                  <option value="K2">K2 (Perpanjangan 1)</option>
                  <option value="K3">K3 (Perpanjangan 2)</option>
                  <option value="K4">K4 (Perpanjangan 3)</option>
                  <option value="K5">K5 (Perpanjangan 4)</option>
                  <option value="PKWTT">PKWTT (Pengangkatan Tetap)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Surat Kontrak</label>
                <input
                  type="text"
                  required
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Reference to previous contract if extension */}
            {phase !== 'K1' && (
              <div className="pt-2 border-t border-slate-200 text-xs space-y-2">
                <span className="font-semibold text-slate-700">Referensi Kontrak Sebelumnya:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="No. Kontrak Sebelumnya"
                    value={nomorSuratSebelumnya}
                    onChange={(e) => setNomorSuratSebelumnya(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-mono"
                  />
                  <div>
                    <DatePickerInput
                      placeholder="Periode Mulai Sebelumnya"
                      value={periodeAwalSebelumnya}
                      onChange={setPeriodeAwalSebelumnya}
                    />
                  </div>
                  <div>
                    <DatePickerInput
                      placeholder="Periode Akhir Sebelumnya"
                      value={periodeAkhirSebelumnya}
                      onChange={setPeriodeAkhirSebelumnya}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Klausul Kerja */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Klausul Pekerjaan & Jangka Waktu
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jabatan</label>
                <input
                  type="text"
                  required
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Golongan</label>
                <input
                  type="text"
                  required
                  value={golongan}
                  onChange={(e) => setGolongan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span>Tanggal Mulai</span>
                  <span className="text-[10px] text-blue-600">Show 📅</span>
                </label>
                <DatePickerInput
                  required
                  value={tanggalMulai}
                  onChange={setTanggalMulai}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span>Tanggal Selesai</span>
                  <span className="text-[10px] text-blue-600">Show 📅</span>
                </label>
                <DatePickerInput
                  required
                  value={tanggalSelesai}
                  onChange={setTanggalSelesai}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Masa Kontrak</label>
                <input
                  type="text"
                  value={masaKontrak}
                  onChange={(e) => setMasaKontrak(e.target.value)}
                  placeholder="Contoh: 3 Bulan / 9 Bulan / 1 Tahun"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal & Tempat TTD</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={tempatTtd}
                    onChange={(e) => setTempatTtd(e.target.value)}
                    placeholder="Kota TTD"
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                  <DatePickerInput
                    value={tanggalTtd}
                    onChange={setTanggalTtd}
                    placeholder="Tanggal TTD"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Remunerasi & Rekening */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Gaji Pokok & Rekening Penggajian
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gaji Pokok Gross (Rp)</label>
                <input
                  type="number"
                  required
                  value={upah}
                  onChange={(e) => handleUpahChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bank</label>
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={noRekening}
                  onChange={(e) => setNoRekening(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                <span>Keterangan Upah (Terbilang Rupiah):</span>
                <span className="text-[10px] text-blue-600 font-normal">Otomatis Terkalkulasi</span>
              </label>
              <input
                type="text"
                value={ketUpah}
                onChange={(e) => setKetUpah(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 font-medium italic"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2 -mx-6 -mb-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center space-x-2 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Terbitkan Dokumen Kontrak</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
