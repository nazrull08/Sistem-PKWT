import React, { useState } from 'react';
import { Employee, ContractDocumentData, ContractPhase } from '../types';
import { 
  mergeEmployeeToContract, 
  CompanySettings, 
  getSavedCompanySettings, 
  saveCompanySettings,
  getAvailableContractPhases,
  getLatestFilledPhase
} from '../utils/mailMerge';
import { ContractDocument } from './ContractDocument';
import { downloadElementAsPdf, printDirectly } from '../utils/pdfExporter';
import { 
  Printer, 
  Download,
  Loader2,
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Users, 
  CheckSquare, 
  Square,
  Sparkles,
  Settings,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

interface MailMergeViewProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onSelectEmployee: (emp: Employee) => void;
  userRole?: string;
}

export const MailMergeView: React.FC<MailMergeViewProps> = ({
  employees,
  selectedEmployee,
  onSelectEmployee,
  userRole = 'admin'
}) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getSavedCompanySettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(employees.map(e => e.id));
  const [selectedPhase, setSelectedPhase] = useState<ContractPhase | 'AUTO'>('AUTO');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 140));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 70));
  const handleZoomReset = () => setZoomLevel(100);

  // Find index of selected employee
  const currentIndex = employees.findIndex(e => e.id === (selectedEmployee?.id || employees[0]?.id));
  const activeEmp = employees[currentIndex] || employees[0];

  // Available filled phases for current employee (e.g. ['K1', 'K2'])
  const availablePhases: ContractPhase[] = activeEmp ? getAvailableContractPhases(activeEmp) : ['K1'];
  const latestFilledPhase = activeEmp ? getLatestFilledPhase(activeEmp) : 'K1';

  // Resolved active phase for printing
  const activePhase: ContractPhase = selectedPhase === 'AUTO' 
    ? latestFilledPhase 
    : (availablePhases.includes(selectedPhase) ? selectedPhase : latestFilledPhase);

  // Strictly automatic template trigger: K1 = Kontrak Awal (Baru), K2..K6 = Kontrak Perpanjangan
  const isInitialContract = (activePhase === 'K1');

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectEmployee(employees[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < employees.length - 1) {
      onSelectEmployee(employees[currentIndex + 1]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map(e => e.id));
    }
  };

  const toggleSelectId = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Image Upload handler for Master Header & Master TTD
  const handleImageUpload = (
    field: 'logoPerusahaanUrl' | 'logoIsoUrl' | 'ttdDirekturUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...companySettings, [field]: dataUrl };
      setCompanySettings(updated);
      saveCompanySettings(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (field: 'logoPerusahaanUrl' | 'logoIsoUrl' | 'ttdDirekturUrl') => {
    const updated = { ...companySettings, [field]: undefined };
    setCompanySettings(updated);
    saveCompanySettings(updated);
  };

  const handleSaveSettings = () => {
    saveCompanySettings(companySettings);
    setIsSettingsOpen(false);
  };

  // Generate contract for single employee with automatic template detection
  const currentMergedContract: ContractDocumentData | null = activeEmp
    ? mergeEmployeeToContract(
        activeEmp, 
        companySettings, 
        activePhase,
        isInitialContract
      )
    : null;

  // Generate contracts for batch mode
  const batchMergedContracts: ContractDocumentData[] = employees
    .filter(e => selectedIds.includes(e.id))
    .map(e => {
      const ePhases = getAvailableContractPhases(e);
      const ePhase = selectedPhase === 'AUTO' 
        ? getLatestFilledPhase(e) 
        : (ePhases.includes(selectedPhase) ? selectedPhase : getLatestFilledPhase(e));
      return mergeEmployeeToContract(
        e, 
        companySettings, 
        ePhase,
        ePhase === 'K1'
      );
    });

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const empName = activeEmp?.nama ? activeEmp.nama.replace(/\s+/g, '_').toUpperCase() : 'KARYAWAN';
    const fileName = isBatchMode
      ? `Dokumen_Kontrak_Massal_${selectedIds.length}_Karyawan.pdf`
      : `Kontrak_PKWT_${empName}_${activePhase}.pdf`;

    await downloadElementAsPdf('mailmerge-printable-container', {
      filename: fileName,
      onError: () => setIsDownloadingPdf(false),
      onSuccess: () => setIsDownloadingPdf(false)
    });
    setIsDownloadingPdf(false);
  };

  const handlePrintDirect = () => {
    printDirectly();
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-1.5rem)] overflow-hidden space-y-2 print:h-auto print:overflow-visible print:space-y-0">
      {/* 1-Row Compact Frozen Top Bar (Freeze Panes: Stays fixed during document scroll) */}
      <div className="shrink-0 print:hidden bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between gap-2 z-30 overflow-x-auto select-none">
        {/* Left Section: Navigator, Employee Dropdown & Phase Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isBatchMode ? (
            <>
              {/* Record Navigator (< 1/5 >) */}
              <div className="flex items-center space-x-0.5 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex <= 0}
                  className="p-1 rounded hover:bg-white text-gray-700 disabled:opacity-25 transition-colors cursor-pointer"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono font-bold text-[11px] text-gray-800">
                  {currentIndex + 1}/{employees.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex >= employees.length - 1}
                  className="p-1 rounded hover:bg-white text-gray-700 disabled:opacity-25 transition-colors cursor-pointer"
                  title="Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Employee Quick Select Dropdown */}
              <select
                value={activeEmp?.id || ''}
                onChange={(e) => {
                  const found = employees.find(emp => emp.id === e.target.value);
                  if (found) onSelectEmployee(found);
                }}
                className="max-w-[170px] sm:max-w-[220px] px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 cursor-pointer truncate shadow-2xs"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.no}. {emp.nama} ({emp.currentContractPhase})
                  </option>
                ))}
              </select>

              {/* Phase Switcher Pills */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-xs">
                {availablePhases.map((phase: ContractPhase) => {
                  const isCurrentActive = activePhase === phase;
                  const isK1 = phase === 'K1';
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setSelectedPhase(phase)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        isCurrentActive
                          ? isK1
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title={isK1 ? 'Format Kontrak 1 (Awal Baru)' : `Format Perpanjangan Kontrak ${phase}`}
                    >
                      {phase}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedPhase('AUTO')}
                  className={`px-2 py-0.5 rounded text-[10.5px] transition-all cursor-pointer ${
                    selectedPhase === 'AUTO'
                      ? 'bg-slate-800 text-white font-bold shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Otomatis mengikuti kolom kontrak terakhir yang terisi"
                >
                  Auto ({latestFilledPhase})
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-gray-700 text-[11px]">Format:</span>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value as any)}
                className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white font-bold text-gray-800"
              >
                <option value="AUTO">Otomatis Tiap Karyawan</option>
                <option value="K1">Semua Kontrak 1</option>
                <option value="K2">Semua Kontrak 2</option>
                <option value="K3">Semua Kontrak 3</option>
                <option value="K4">Semua Kontrak 4</option>
                <option value="K5">Semua Kontrak 5</option>
                <option value="K6">Semua Kontrak 6</option>
              </select>
            </div>
          )}
        </div>

        {/* Right Section: Zoom Controls, Mode Switcher, Settings, Download PDF & Print Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Document Zoom Controls */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 70}
              className="p-1 rounded hover:bg-white text-gray-600 disabled:opacity-30 cursor-pointer"
              title="Perkecil Ukuran Tampilan (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="px-1.5 font-mono text-[11px] font-bold text-gray-700 hover:text-blue-600 cursor-pointer"
              title="Reset ke Ukuran Standar (100%)"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 140}
              className="p-1 rounded hover:bg-white text-gray-600 disabled:opacity-30 cursor-pointer"
              title="Perbesar Tampilan Dokumen (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setIsBatchMode(false)}
              className={`px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
                !isBatchMode ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Satuan
            </button>
            <button
              onClick={() => setIsBatchMode(true)}
              className={`px-2 py-1 rounded text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                isBatchMode ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Massal ({selectedIds.length})</span>
            </button>
          </div>

          {/* Master Kop & TTD */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 sm:px-2 sm:py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors border border-slate-200 cursor-pointer"
            title="Upload Logo Kop Perusahaan & TTD Master Direktur"
          >
            <Settings className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline text-[11px]">Kop &amp; TTD</span>
          </button>

          {/* Download PDF File Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Download file PDF langsung tanpa border web"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isDownloadingPdf ? 'Memproses...' : 'Download PDF'}</span>
          </button>

          {/* Print Langsung Button */}
          <button
            type="button"
            onClick={handlePrintDirect}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Buka jendela cetak langsung ke printer atau PDF sistem"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Langsung</span>
          </button>
        </div>
      </div>

      {/* Batch Select Drawer (Only when isBatchMode is true) */}
      {isBatchMode && (
        <div className="print:hidden bg-white p-3 rounded-xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800">
              Centang karyawan yang akan dicetak massal ({selectedIds.length} terpilih):
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-blue-600 hover:text-blue-700 font-semibold text-xs cursor-pointer"
            >
              {selectedIds.length === employees.length ? 'Batalkan Pilih Semua' : 'Pilih Semua Karyawan'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1">
            {employees.map(emp => {
              const isChecked = selectedIds.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  onClick={() => toggleSelectId(emp.id)}
                  className={`flex items-center space-x-2 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'border-blue-500 bg-blue-50/60 text-blue-950 font-bold'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="sr-only"
                  />
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  )}
                  <span className="truncate">{emp.nama}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Maximized Document Viewport with Dedicated Vertical Scroll (Freeze Panes document area) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-2 sm:p-4 bg-slate-200/60 rounded-2xl border border-slate-300/50 flex justify-center shadow-inner print:p-0 print:m-0 print:border-none print:bg-transparent print:shadow-none print:rounded-none print:overflow-visible print:h-auto">
        <div 
          id="mailmerge-printable-container"
          style={{ 
            zoom: zoomLevel !== 100 ? `${zoomLevel}%` : undefined,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
          className="transition-transform duration-100 origin-top"
        >
          {/* Render Single Contract Document */}
          {!isBatchMode && currentMergedContract && (
            <div className="w-full max-w-[210mm] print:w-full print:max-w-none print:m-0 print:p-0 print:block">
              <ContractDocument contract={currentMergedContract} />
            </div>
          )}

          {/* Render Batch Multiple Contract Documents */}
          {isBatchMode && (
            <div className="space-y-12 print:space-y-0 w-full flex flex-col items-center print:block print:w-full">
              {batchMergedContracts.map((contract, idx) => (
                <div key={contract.id} className="relative w-full max-w-[210mm] print:w-full print:max-w-none print:m-0 print:p-0 print:block">
                  {/* Batch Banner label on screen */}
                  <div className="print:hidden w-full mb-2 text-xs font-bold text-gray-500 flex items-center justify-between">
                    <span>Dokumen #{idx + 1}: {contract.namaKaryawan}</span>
                    <span className="font-mono text-gray-400">{contract.nomorSurat}</span>
                  </div>

                  <ContractDocument contract={contract} />

                  {/* Ensure clean separation between different employees during print */}
                  {idx < batchMergedContracts.length - 1 && (
                    <div className="page-break" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Master Header & Master TTD (Points 6 & 8) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Master Header Logo &amp; Tanda Tangan Direktur
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* Upload Master Logo 1 (Perusahaan) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">Master Logo Kop (Logo Perusahaan):</span>
                  {companySettings.logoPerusahaanUrl && (
                    <button
                      onClick={() => handleRemoveImage('logoPerusahaanUrl')}
                      className="text-rose-600 text-[11px] font-semibold hover:underline"
                    >
                      Hapus / Pakai Default AKY
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {companySettings.logoPerusahaanUrl ? (
                    <img
                      src={companySettings.logoPerusahaanUrl}
                      alt="Logo Perusahaan"
                      className="h-12 w-28 object-contain bg-white border border-gray-200 rounded p-1"
                    />
                  ) : (
                    <div className="h-12 w-28 bg-white border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-[10px]">
                      Default AKY
                    </div>
                  )}
                  <label className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Baru</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('logoPerusahaanUrl', e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Upload Master Logo 2 (ISO / Akreditasi) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">Master Logo Sertifikasi (Logo ISO / TÜV):</span>
                  {companySettings.logoIsoUrl && (
                    <button
                      onClick={() => handleRemoveImage('logoIsoUrl')}
                      className="text-rose-600 text-[11px] font-semibold hover:underline"
                    >
                      Hapus / Pakai Default TÜV
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {companySettings.logoIsoUrl ? (
                    <img
                      src={companySettings.logoIsoUrl}
                      alt="Logo ISO"
                      className="h-12 w-24 object-contain bg-white border border-gray-200 rounded p-1"
                    />
                  ) : (
                    <div className="h-12 w-24 bg-white border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-[10px]">
                      Default TÜV SÜD
                    </div>
                  )}
                  <label className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo ISO</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('logoIsoUrl', e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Upload Master TTD Direktur (Point 6) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-800">Master TTD Direktur / Pihak Pertama:</span>
                    <p className="text-[10.5px] text-gray-500">
                      Jika ada gambar akan muncul, jika kosong maka area tanda tangan dibiarkan kosong untuk tanda tangan basah.
                    </p>
                  </div>
                  {companySettings.ttdDirekturUrl && (
                    <button
                      onClick={() => handleRemoveImage('ttdDirekturUrl')}
                      className="text-rose-600 text-[11px] font-semibold hover:underline shrink-0 ml-2"
                    >
                      Kosongkan TTD
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {companySettings.ttdDirekturUrl ? (
                    <img
                      src={companySettings.ttdDirekturUrl}
                      alt="TTD Direktur"
                      className="h-14 w-32 object-contain bg-white border border-gray-200 rounded p-1"
                    />
                  ) : (
                    <div className="h-14 w-32 bg-white border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-[10.5px] italic">
                      Kosong (Tanda Tangan Basah)
                    </div>
                  )}
                  <label className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Gambar TTD / Stempel</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('ttdDirekturUrl', e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Corporate Metadata Form */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nama Perusahaan (Pihak Pertama)</label>
                  <input
                    type="text"
                    value={companySettings.namaPerusahaan}
                    onChange={(e) => setCompanySettings({ ...companySettings, namaPerusahaan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Nama Direktur / Wakil</label>
                    <input
                      type="text"
                      value={companySettings.wakilPerusahaan}
                      onChange={(e) => setCompanySettings({ ...companySettings, wakilPerusahaan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Jabatan Wakil</label>
                    <input
                      type="text"
                      value={companySettings.jabatanWakil}
                      onChange={(e) => setCompanySettings({ ...companySettings, jabatanWakil: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Alamat Kantor Kop</label>
                  <input
                    type="text"
                    value={companySettings.alamatKop1}
                    onChange={(e) => setCompanySettings({ ...companySettings, alamatKop1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Telepon</label>
                    <input
                      type="text"
                      value={companySettings.telpKop}
                      onChange={(e) => setCompanySettings({ ...companySettings, telpKop: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Fax</label>
                    <input
                      type="text"
                      value={companySettings.faxKop}
                      onChange={(e) => setCompanySettings({ ...companySettings, faxKop: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
              >
                Tutup
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
