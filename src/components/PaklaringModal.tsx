import React, { useState, useEffect } from 'react';
import { Employee, PaklaringDocumentData } from '../types';
import { generatePaklaringData, getSavedCompanySettings } from '../utils/mailMerge';
import { saveEmployee } from '../services/db';
import { downloadElementAsPdf, printDirectly } from '../utils/pdfExporter';
import { 
  X, 
  Printer, 
  Download,
  Loader2,
  CheckCircle, 
  Award,
  AlertTriangle,
  Building,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { DatePickerInput } from './DatePickerInput';
import { useToast } from '../context/ToastContext';

interface PaklaringModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

export const PaklaringModal: React.FC<PaklaringModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<'CONFIRM' | 'PREVIEW'>(
    employee?.statusKaryawan === 'SELESAI' ? 'PREVIEW' : 'CONFIRM'
  );
  const [alasan, setAlasan] = useState('Masa Kontrak Kerja Berakhir (Selesai PKWT)');
  const [tanggalSelesai, setTanggalSelesai] = useState(
    employee?.akhirK6 || employee?.akhirK5 || employee?.akhirK4 || employee?.akhirK3 || employee?.akhirK2 || employee?.akhirK1 || '30 September 2026'
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Synchronize view when employee or modal opens
  useEffect(() => {
    if (!isOpen || !employee) return;
    if (employee.statusKaryawan === 'SELESAI') {
      setActiveView('PREVIEW');
    } else {
      setActiveView('CONFIRM');
    }
  }, [isOpen, employee?.id, employee?.statusKaryawan]);

  if (!isOpen || !employee) return null;

  const companySettings = getSavedCompanySettings();
  const paklaringData: PaklaringDocumentData = generatePaklaringData(employee, companySettings, alasan);

  const handlePrintPaklaringDirect = () => {
    printDirectly('paklaring-printable-document');
  };

  const handleConfirmTerminate = async () => {
    const updated: Employee = {
      ...employee,
      statusKaryawan: 'SELESAI',
      updatedAt: new Date().toISOString()
    };
    await saveEmployee(updated);
    showToast(
      'delete',
      'Status Kontrak Diakhiri',
      `Masa kontrak karyawan "${employee.nama}" telah diakhiri. Membuka dialog cetak Surat Paklaring...`
    );
    setActiveView('PREVIEW');
    onSuccess();

    // Auto-trigger browser print dialog for the Paklaring document
    setTimeout(() => {
      handlePrintPaklaringDirect();
    }, 300);
  };

  const handleDownloadPaklaringPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const empName = employee?.nama ? employee.nama.replace(/\s+/g, '_').toUpperCase() : 'KARYAWAN';
    await downloadElementAsPdf('paklaring-printable-document', {
      filename: `Paklaring_${empName}.pdf`,
      onError: () => setIsDownloadingPdf(false),
      onSuccess: () => setIsDownloadingPdf(false)
    });
    setIsDownloadingPdf(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:p-0 print:m-0 print:overflow-visible ${
        activeView === 'PREVIEW' ? 'max-w-4xl' : 'max-w-lg'
      }`}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-amber-50 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-gray-900 text-base">
                  {activeView === 'CONFIRM' ? 'Akhiri Masa Kontrak Karyawan' : 'Surat Keterangan Kerja (Paklaring)'}
                </h3>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10.5px] font-bold">
                  Format Menyusul
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {activeView === 'CONFIRM' 
                  ? 'Konfirmasi penyelesaian hubungan kerja dan penerbitan paklaring resmi' 
                  : 'Pratinjau dokumen Paklaring siap cetak (Format resmi perusahaan menyusul)'}
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

        {/* VIEW 1: CONFIRMATION STEP */}
        {activeView === 'CONFIRM' && (
          <div className="p-6 space-y-5 text-xs">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Konfirmasi Akhiri Kontrak:</span>
              </div>
              <p className="leading-relaxed">
                Anda akan mengakhiri masa kontrak kerja untuk karyawan <strong>{employee.nama}</strong>. Status karyawan akan diperbarui menjadi <strong>SELESAI</strong> dan Anda dapat langsung menerbitkan Surat Keterangan Kerja (Paklaring).
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <span className="text-[11px] text-gray-500">Nama Lengkap Karyawan:</span>
                <p className="text-sm font-extrabold text-gray-900 uppercase">{employee.nama}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-gray-500">NIK:</span>
                  <p className="font-mono font-bold text-gray-800">{employee.noKtp}</p>
                </div>
                <div>
                  <span className="text-gray-500">Jabatan Terakhir:</span>
                  <p className="font-bold text-gray-800">{employee.jabatan || 'Operator'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>Tanggal Berakhir Kerja:</span>
                  <span className="text-[10px] text-rose-600 font-semibold">Show Tanggal 📅</span>
                </label>
                <DatePickerInput
                  value={tanggalSelesai}
                  onChange={setTanggalSelesai}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Keterangan / Alasan Berakhir:
                </label>
                <input
                  type="text"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white font-medium text-gray-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmTerminate}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Akhiri Kontrak &amp; Cetak Paklaring</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: PAKLARING DOCUMENT PREVIEW & PRINT */}
        {activeView === 'PREVIEW' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 print:p-0 print:m-0 print:bg-white print:overflow-visible">
            {/* Top Toolbar in preview */}
            <div className="print:hidden bg-slate-900 text-white p-4 rounded-2xl shadow-md mb-6 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Surat Pengalaman Kerja (Paklaring)</span>
                  <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded text-[10.5px]">
                    Format Menyusul
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Karyawan: <span className="font-semibold text-emerald-400">{employee.nama}</span> • No. Surat: <span className="font-mono text-slate-200">{paklaringData.nomorSurat}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadPaklaringPdf}
                  disabled={isDownloadingPdf}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                  title="Download Surat Paklaring langsung sebagai file PDF tanpa border web"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isDownloadingPdf ? 'Memproses...' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPaklaringDirect}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                  title="Buka dialog cetak langsung ke printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Langsung</span>
                </button>
              </div>
            </div>

            {/* Printable Paklaring A4 Document */}
            <div id="paklaring-printable-document" className="contract-page-a4 bg-white text-black leading-relaxed shadow-xl max-w-[210mm] mx-auto p-[2.54cm] pt-[1cm] pb-[1.75cm] font-sans text-[10pt]">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-6 select-none">
                <div className="flex items-center space-x-4">
                  {companySettings.logoPerusahaanUrl ? (
                    <img
                      src={companySettings.logoPerusahaanUrl}
                      alt="Logo Perusahaan"
                      className="h-[72px] max-w-[180px] object-contain"
                    />
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-24 h-18" viewBox="0 0 140 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="70" cy="40" rx="65" ry="34" stroke="#0072CE" strokeWidth="4" />
                        <path d="M42 40C42 28 55 20 70 20C85 20 98 28 98 40C98 52 85 60 70 60C55 60 42 52 42 40Z" stroke="#00A859" strokeWidth="3" />
                        <text x="70" y="47" textAnchor="middle" fill="#003B70" fontFamily="sans-serif" fontWeight="900" fontSize="24" letterSpacing="1">AKY</text>
                        <text x="70" y="68" textAnchor="middle" fill="#003B70" fontFamily="sans-serif" fontWeight="700" fontSize="7">PT. ANDHANA KIRANA YASA</text>
                      </svg>
                    </div>
                  )}

                  {companySettings.logoIsoUrl ? (
                    <img
                      src={companySettings.logoIsoUrl}
                      alt="Logo ISO"
                      className="h-[72px] max-w-[135px] object-contain"
                    />
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-16 h-18" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="35,2 67,18 67,62 35,78 3,62 3,18" fill="#0F4C81" />
                        <polygon points="35,6 63,20 63,60 35,74 7,60 7,20" fill="#FFFFFF" />
                        <polygon points="35,10 59,22 59,58 35,70 11,58 11,22" fill="#0F4C81" />
                        <text x="35" y="38" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontSize="13">TÜV</text>
                        <text x="35" y="48" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="700" fontSize="8">SÜD</text>
                        <text x="35" y="58" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontSize="5">ISO 9001</text>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="text-left text-[10pt] leading-tight text-black font-sans shrink-0 pl-4">
                  <p className="font-semibold">{companySettings.alamatKop1 || 'Bukit Gading Raya Blok N No. 11'}</p>
                  <p>{companySettings.alamatKop2 || 'Kelapa Gading Barat – Kelapa Gading'}</p>
                  <p>{companySettings.alamatKop3 || 'Jakarta Utara - 14240'}</p>
                  <p>Telp : {companySettings.telpKop || '021 - 4516027'}</p>
                  <p>Fax : {companySettings.faxKop || '021 - 45852414'}</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center my-6">
                <h1 className="font-extrabold text-[12pt] uppercase underline tracking-wider">
                  SURAT KETERANGAN PENGALAMAN KERJA
                </h1>
                <p className="text-[10pt] font-semibold mt-1">
                  No. : {paklaringData.nomorSurat}
                </p>
                <div className="print:hidden inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-300">
                  ⚠️ Draft Standar Paklaring AKY (Format Resmi Menyusul)
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 text-justify mt-6 leading-relaxed">
                <p>
                  Yang bertanda tangan di bawah ini Direksi <strong>{companySettings.namaPerusahaan}</strong> dengan ini menerangkan bahwa :
                </p>

                <div className="space-y-2 pl-6 my-4">
                  <div className="grid grid-cols-[140px_15px_1fr]">
                    <span className="font-medium">N a m a</span>
                    <span>:</span>
                    <span className="font-bold uppercase">{employee.nama}</span>
                  </div>
                  <div className="grid grid-cols-[140px_15px_1fr]">
                    <span className="font-medium">NIK (No. KTP)</span>
                    <span>:</span>
                    <span className="font-mono">{employee.noKtp}</span>
                  </div>
                  <div className="grid grid-cols-[140px_15px_1fr]">
                    <span className="font-medium">Alamat</span>
                    <span>:</span>
                    <span>{employee.alamat}</span>
                  </div>
                  <div className="grid grid-cols-[140px_15px_1fr]">
                    <span className="font-medium">Jabatan Terakhir</span>
                    <span>:</span>
                    <span className="font-semibold">{employee.jabatan || 'Operator'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_15px_1fr]">
                    <span className="font-medium">Masa Kerja</span>
                    <span>:</span>
                    <span className="font-semibold">{paklaringData.periodeAwal} s/d {tanggalSelesai}</span>
                  </div>
                </div>

                <p>
                  Benar adalah karyawan <strong>{companySettings.namaPerusahaan}</strong> yang telah bekerja pada posisi tersebut di atas dalam kurun waktu yang telah ditentukan, dengan alasan berakhirnya hubungan kerja: <em>{alasan}</em>.
                </p>

                <p>
                  Selama bekerja di Perusahaan kami, yang bersangkutan telah menunjukkan loyalitas, integritas, dan dedikasi yang baik.
                </p>

                <p>
                  Kami mengucapkan terima kasih atas segala jasa, kontribusi, dan pengabdian yang telah diberikan selama masa kerja di <strong>{companySettings.namaPerusahaan}</strong>, serta mendoakan kesuksesan yang bersangkutan di masa depan.
                </p>

                <p>
                  Demikian surat keterangan kerja ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.
                </p>
              </div>

              {/* Signatures */}
              <div className="mt-12 flex justify-end">
                <div className="text-center w-64 space-y-1">
                  <p className="text-[10pt]">
                    {paklaringData.tempatCetak}, {paklaringData.tanggalCetak}
                  </p>
                  <p className="font-bold text-[10pt] tracking-wider">
                    {companySettings.namaPerusahaan}
                  </p>

                  <div className="h-24 flex items-center justify-center my-2">
                    {companySettings.ttdDirekturUrl ? (
                      <img
                        src={companySettings.ttdDirekturUrl}
                        alt="TTD Direktur"
                        className="max-h-24 max-w-[170px] object-contain"
                      />
                    ) : (
                      <div className="h-20 w-44" />
                    )}
                  </div>

                  <div>
                    <p className="font-bold uppercase underline tracking-wide">
                      {companySettings.wakilPerusahaan || 'GIMMY KURNIAWAN IMANTO'}
                    </p>
                    <p className="text-[9.5pt] text-gray-800">
                      {companySettings.jabatanWakil || 'Direktur Perusahaan'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
