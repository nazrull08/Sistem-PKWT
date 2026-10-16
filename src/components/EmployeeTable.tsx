import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Employee, ContractDocumentData, ContractPhase } from '../types';
import { formatRupiah } from '../utils/terbilang';
import { getDaysRemaining, getExpirationStatus, formatTanggalIndonesia, parseAnyDate } from '../utils/date';
import { formatAutoNoSurat } from '../utils/mailMerge';
import { 
  Search, 
  FileDown, 
  Plus, 
  FileText, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  Upload,
  CheckSquare,
  Square,
  Printer,
  RefreshCw,
  Award,
  UserCheck,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  Clock,
  LayoutList
} from 'lucide-react';
import { deleteEmployeeRecord, saveEmployee } from '../services/db';
import { ExtendContractModal } from './ExtendContractModal';
import { PaklaringModal } from './PaklaringModal';
import { 
  ExcelImportPreviewModal, 
  ParsedExcelEmployee, 
  validateParsedItem 
} from './ExcelImportPreviewModal';
import { cleanNoKtp, cleanExcelTextNumber } from '../utils/cleanText';
import { useToast } from '../context/ToastContext';

// Helper function to generate clean pagination items with ellipses
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

interface EmployeeTableProps {
  employees: Employee[];
  contracts: ContractDocumentData[];
  onSelectEmployee: (employee: Employee) => void;
  onOpenContract: (employee: Employee) => void;
  onOpenNotification: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onAddEmployee: () => void;
  onBatchMailMerge?: (selectedEmployees: Employee[]) => void;
  userRole?: string;
  initialSearch?: string;
  onResetSearch?: () => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  contracts,
  onSelectEmployee,
  onOpenContract,
  onOpenNotification,
  onEditEmployee,
  onAddEmployee,
  onBatchMailMerge,
  userRole = 'admin',
  initialSearch = '',
  onResetSearch
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filterPhase, setFilterPhase] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const isFilterActive = searchQuery.trim() !== '' || filterPhase !== 'ALL' || filterStatus !== 'ALL' || filterUrgency !== 'ALL';

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setFilterPhase('ALL');
    setFilterStatus('ALL');
    setFilterUrgency('ALL');
    setSelectedIds([]);
    if (onResetSearch) {
      onResetSearch();
    }
  };

  // Modals for Perpanjang & Akhiri Kontrak (Paklaring)
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isPaklaringModalOpen, setIsPaklaringModalOpen] = useState(false);
  const [targetEmployeeForAction, setTargetEmployeeForAction] = useState<Employee | null>(null);

  // Modals for Excel Import Preview & Validation
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [parsedExcelItems, setParsedExcelItems] = useState<ParsedExcelEmployee[]>([]);
  const [importFileName, setImportFileName] = useState('');

  // Batch Deletion State
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Mode tampilan pada mobile: 'card' (kartu responsif ramah layar HP) atau 'table' (spreadsheet excel utuh)
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');

  // Karyawan dengan masa kontrak lewat tanggal dan belum SELESAI (Status Migrasi)
  const expiredMigrationEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (emp.statusKaryawan === 'SELESAI' || emp.statusKaryawan === 'NONAKTIF') return false;
      const contractEndDate = emp.akhirK6 || emp.akhirK5 || emp.akhirK4 || emp.akhirK3 || emp.akhirK2 || emp.akhirK1;
      if (!contractEndDate) return false;
      const days = getDaysRemaining(contractEndDate);
      return days !== null && days < 0;
    });
  }, [employees]);

  // Modal State untuk Akhiri Kontrak Massal Lewat Tanggal
  const [isBulkTerminateModalOpen, setIsBulkTerminateModalOpen] = useState(false);
  const [isTerminatingBulk, setIsTerminatingBulk] = useState(false);
  const [selectedBulkTerminateIds, setSelectedBulkTerminateIds] = useState<string[]>([]);
  const [bulkTerminateSearch, setBulkTerminateSearch] = useState('');

  useEffect(() => {
    if (isBulkTerminateModalOpen) {
      setSelectedBulkTerminateIds(expiredMigrationEmployees.map(e => e.id));
      setBulkTerminateSearch('');
    }
  }, [isBulkTerminateModalOpen, expiredMigrationEmployees]);

  const handleConfirmBulkTerminate = async () => {
    if (selectedBulkTerminateIds.length === 0) return;
    setIsTerminatingBulk(true);
    const count = selectedBulkTerminateIds.length;
    for (const id of selectedBulkTerminateIds) {
      const target = employees.find(e => e.id === id);
      if (target) {
        await saveEmployee({
          ...target,
          statusKaryawan: 'SELESAI',
          updatedAt: new Date().toISOString()
        });
      }
    }
    setIsTerminatingBulk(false);
    setIsBulkTerminateModalOpen(false);
    showToast(
      'success',
      'Kontrak Berhasil Diakhiri',
      `Berhasil mengakhiri masa kontrak untuk ${count} karyawan yang telah lewat tanggal (Migrasi).`
    );
  };

  // Pagination State: 10, 25, 50, 100, All
  type PageSizeOption = 10 | 25 | 50 | 100 | 'ALL';
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleOpenExtendModal = (emp: Employee) => {
    setTargetEmployeeForAction(emp);
    setIsExtendModalOpen(true);
  };

  const handleOpenPaklaringModal = (emp: Employee) => {
    setTargetEmployeeForAction(emp);
    setIsPaklaringModalOpen(true);
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.noKtp.includes(searchQuery) ||
      emp.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.lokasiKerja.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPhase = filterPhase === 'ALL' || emp.currentContractPhase === filterPhase;
    const matchesStatus = filterStatus === 'ALL' || emp.statusKaryawan === filterStatus;

    if (!matchesSearch || !matchesPhase || !matchesStatus) return false;

    if (filterUrgency !== 'ALL') {
      const contractEndDate = emp.akhirK6 || emp.akhirK5 || emp.akhirK4 || emp.akhirK3 || emp.akhirK2 || emp.akhirK1;
      const days = getDaysRemaining(contractEndDate);
      const urgency = getExpirationStatus(days).urgency;
      if (filterUrgency === 'EXPIRING' && urgency !== 'critical' && urgency !== 'warning') return false;
      if (filterUrgency === 'EXPIRED' && urgency !== 'expired') return false;
    }

    return true;
  });

  // Reset page when filter or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPhase, filterStatus, filterUrgency, pageSize]);

  const totalItems = filteredEmployees.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedEmployees = useMemo(() => {
    if (pageSize === 'ALL') return filteredEmployees;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployees, safeCurrentPage, pageSize]);

  // Check if all employees on the CURRENT pagination page are selected
  const isCurrentPageAllSelected = useMemo(() => {
    if (paginatedEmployees.length === 0) return false;
    return paginatedEmployees.every(emp => selectedIds.includes(emp.id));
  }, [paginatedEmployees, selectedIds]);

  // List of selected employees on the CURRENT pagination page
  const selectedOnCurrentPage = useMemo(() => {
    return paginatedEmployees.filter(emp => selectedIds.includes(emp.id));
  }, [paginatedEmployees, selectedIds]);

  // Toggle selection strictly for the CURRENT pagination page (not across all pages)
  const toggleSelectCurrentPage = () => {
    const currentPageIds = paginatedEmployees.map(e => e.id);
    if (isCurrentPageAllSelected) {
      // Uncheck only employees on this current page
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Check only employees on this current page
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Loading progress modal untuk proses penghapusan data karyawan (sama seperti saat import excel)
  const [deleteProgress, setDeleteProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    currentName: string;
  } | null>(null);

  // In-app Delete Confirmation (no blocked window.confirm)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const handleDeleteClick = (emp: Employee) => {
    setEmployeeToDelete(emp);
  };

  // Konfirmasi single delete dengan loading progress bar
  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    const target = employeeToDelete;
    const targetName = target.nama;
    const targetNik = target.noKtp;
    
    // Tutup dialog konfirmasi, buka loading progress modal
    setEmployeeToDelete(null);
    setDeleteProgress({
      current: 0,
      total: 1,
      percent: 25,
      currentName: `${targetName} (NIK: ${targetNik})`
    });

    try {
      await new Promise(r => setTimeout(r, 200));
      setDeleteProgress({
        current: 1,
        total: 1,
        percent: 65,
        currentName: `${targetName} (NIK: ${targetNik})`
      });

      await deleteEmployeeRecord(target.id);

      setDeleteProgress({
        current: 1,
        total: 1,
        percent: 100,
        currentName: `Selesai: ${targetName}`
      });
      await new Promise(r => setTimeout(r, 350));

      setSelectedIds(prev => prev.filter(i => i !== target.id));
      showToast(
        'delete',
        'Data Berhasil Dihapus',
        `Data karyawan "${targetName}" berhasil dihapus dari database.`
      );
    } catch (err) {
      console.error('Failed to delete employee:', err);
      showToast('error', 'Gagal Menghapus Data', 'Terjadi kesalahan saat menghapus data karyawan.');
    } finally {
      setDeleteProgress(null);
    }
  };

  // Delete specifically for selected employees on this pagination page dengan progress bar
  const handleConfirmBatchDelete = async () => {
    const targetsToDelete = selectedOnCurrentPage.length > 0 
      ? selectedOnCurrentPage 
      : employees.filter(e => selectedIds.includes(e.id));
    
    if (targetsToDelete.length === 0) return;
    
    setIsBatchDeleteModalOpen(false);
    const count = targetsToDelete.length;

    // Buka loading progress modal seperti import
    setDeleteProgress({
      current: 0,
      total: count,
      percent: 0,
      currentName: `Menyiapkan penghapusan ${count} data karyawan...`
    });

    try {
      for (let i = 0; i < targetsToDelete.length; i++) {
        const emp = targetsToDelete[i];
        const percent = Math.round(((i + 1) / count) * 100);
        setDeleteProgress({
          current: i + 1,
          total: count,
          percent,
          currentName: `${emp.nama} (NIK: ${emp.noKtp})`
        });

        await deleteEmployeeRecord(emp.id);

        if (count > 1 && i < targetsToDelete.length - 1) {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      await new Promise(r => setTimeout(r, 300));
      const deletedIds = targetsToDelete.map(t => t.id);
      setSelectedIds(prev => prev.filter(id => !deletedIds.includes(id)));
      showToast(
        'delete',
        'Data Berhasil Dihapus',
        `Berhasil menghapus ${count} data karyawan pada halaman ini secara permanen.`
      );
    } catch (err) {
      console.error('Error during batch delete:', err);
      showToast('error', 'Gagal Menghapus Data', 'Sebagian atau seluruh data karyawan gagal dihapus.');
    } finally {
      setDeleteProgress(null);
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Full Excel Export (.xlsx) with all columns & No Surat 1 s/d 6
  const exportToExcel = () => {
    const headers = [
      'NO', 
      'No Surat 1', 'No Surat 2', 'No Surat 3', 'No Surat 4', 'No Surat 5', 'No Surat 6',
      'AWAL K1', 'AKHIR K1', 'TTD1',
      'AWAL K2', 'AKHIR K2', 'TTD2',
      'AWAL K3', 'AKHIR K3', 'TTD3',
      'AWAL K4', 'AKHIR K4', 'TTD4',
      'AWAL K5', 'AKHIR K5', 'TTD5',
      'AWAL K6', 'AKHIR K6', 'TTD6',
      'MASA KONTRAK', 'KET upah', 'upah', 'LOKASI KERJA', 'NAMA',
      'TEMPAT', 'TANGGAL LAHIR', 'NO. KTP', 'ALAMAT', 'PROJECT', 'NO REKENING'
    ];

    const dataRows = filteredEmployees.map((emp, index) => [
      emp.no || index + 1,
      emp.noSurat1 || formatAutoNoSurat(emp.no || index + 1, 'K1', emp.awalK1),
      emp.noSurat2 || (emp.awalK2 ? formatAutoNoSurat(emp.no || index + 1, 'K2', emp.awalK2) : ''),
      emp.noSurat3 || (emp.awalK3 ? formatAutoNoSurat(emp.no || index + 1, 'K3', emp.awalK3) : ''),
      emp.noSurat4 || (emp.awalK4 ? formatAutoNoSurat(emp.no || index + 1, 'K4', emp.awalK4) : ''),
      emp.noSurat5 || (emp.awalK5 ? formatAutoNoSurat(emp.no || index + 1, 'K5', emp.awalK5) : ''),
      emp.noSurat6 || (emp.awalK6 ? formatAutoNoSurat(emp.no || index + 1, 'K6', emp.awalK6) : ''),
      formatTanggalIndonesia(emp.awalK1) || '',
      formatTanggalIndonesia(emp.akhirK1) || '',
      formatTanggalIndonesia(emp.ttd1) || '',
      formatTanggalIndonesia(emp.awalK2) || '',
      formatTanggalIndonesia(emp.akhirK2) || '',
      formatTanggalIndonesia(emp.ttd2) || '',
      formatTanggalIndonesia(emp.awalK3) || '',
      formatTanggalIndonesia(emp.akhirK3) || '',
      formatTanggalIndonesia(emp.ttd3) || '',
      formatTanggalIndonesia(emp.awalK4) || '',
      formatTanggalIndonesia(emp.akhirK4) || '',
      formatTanggalIndonesia(emp.ttd4) || '',
      formatTanggalIndonesia(emp.awalK5) || '',
      formatTanggalIndonesia(emp.akhirK5) || '',
      formatTanggalIndonesia(emp.ttd5) || '',
      formatTanggalIndonesia(emp.awalK6) || '',
      formatTanggalIndonesia(emp.akhirK6) || '',
      formatTanggalIndonesia(emp.ttd6) || '',
      emp.masaKontrak || '3 Bulan',
      emp.ketUpah || '',
      emp.upah || 0,
      emp.lokasiKerja || 'Jakarta',
      emp.nama,
      emp.tempatLahir || '',
      formatTanggalIndonesia(emp.tanggalLahir) || '',
      cleanNoKtp(emp.noKtp),
      emp.alamat || '',
      emp.project || '',
      cleanExcelTextNumber(emp.noRekening) || ''
    ]);

    const aoa = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Dynamic column widths
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      dataRows.forEach(row => {
        const valStr = String(row[colIdx] ?? '');
        if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 45);
      });
      return { wch: Math.max(maxLen + 3, 11) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Karyawan');
    XLSX.writeFile(wb, `Database_Karyawan_PKWT_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Unduh Template Excel Resmi (.xlsx) sesuai urutan header database yang fleksibel (K1 s/d K6)
  const downloadTemplate = () => {
    const headers = [
      'NO', 
      'No Surat 1', 'No Surat 2', 'No Surat 3', 'No Surat 4', 'No Surat 5', 'No Surat 6',
      'AWAL K1', 'AKHIR K1', 'TTD1',
      'AWAL K2', 'AKHIR K2', 'TTD2',
      'AWAL K3', 'AKHIR K3', 'TTD3',
      'AWAL K4', 'AKHIR K4', 'TTD4',
      'AWAL K5', 'AKHIR K5', 'TTD5',
      'AWAL K6', 'AKHIR K6', 'TTD6',
      'MASA KONTRAK', 'KET upah', 'upah', 'LOKASI KERJA', 'NAMA',
      'TEMPAT', 'TANGGAL LAHIR', 'NO. KTP', 'ALAMAT', 'PROJECT', 'NO REKENING'
    ];

    const sampleRows = [
      [
        1,
        '001/PKWT-1/AKY/I/2026', '', '', '', '', '',
        '01 Januari 2026', '31 Maret 2026', '31 Desember 2025',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '3 Bulan', 'Lima Juta Enam Ratus Dua Puluh Lima Ribu Delapan Ratus Delapan Puluh Tiga Rupiah', 5625883, 'Jakarta', 'BUDI SANTOSO',
        'JAKARTA', '15 Mei 1995', '3171012345678901', 'JL. MERDEKA NO. 10 JAKARTA PUSAT', 'PROJECT SITE A', '5745940924'
      ],
      [
        2,
        '002/PKWT-1/AKY/I/2026', '002/PKWT-2/AKY/IV/2026', '', '', '', '',
        '01 Januari 2026', '31 Maret 2026', '31 Desember 2025',
        '01 April 2026', '30 Juni 2026', '25 Maret 2026',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '3 Bulan', 'Lima Juta Enam Ratus Dua Puluh Lima Ribu Delapan Ratus Delapan Puluh Tiga Rupiah', 5625883, 'Jakarta', 'SITI RAHMAWATI',
        'BANDUNG', '20 Agustus 1997', '3273012345678902', 'JL. SUDIRMAN NO. 45 BANDUNG', 'PROJECT SITE B', '1234567890'
      ]
    ];

    const aoa = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 12) }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Karyawan');
    XLSX.writeFile(wb, `Template_Import_Database_Karyawan.xlsx`);
  };

  // Helper format tanggal dari Excel ke format resmi Indonesia "dd MMMM yyyy"
  const formatExcelDate = (val: any): string => {
    return formatTanggalIndonesia(val);
  };

  // Helper function to normalize column header string
  const normalizeHeaderString = (str: any): string => {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  interface ColumnIndexMap {
    noUrut?: number;
    nama?: number;
    noKtp?: number;
    project?: number;
    lokasiKerja?: number;
    masaKontrak?: number;
    ketUpah?: number;
    upah?: number;
    tempatLahir?: number;
    tanggalLahir?: number;
    alamat?: number;
    noRekening?: number;
    bank?: number;
    jabatan?: number;
    golongan?: number;
    jenisKelamin?: number;
    email?: number;
    noHp?: number;
    statusKaryawan?: number;
    noSurat1?: number;
    awalK1?: number;
    akhirK1?: number;
    ttd1?: number;
    noSurat2?: number;
    awalK2?: number;
    akhirK2?: number;
    ttd2?: number;
    noSurat3?: number;
    awalK3?: number;
    akhirK3?: number;
    ttd3?: number;
    noSurat4?: number;
    awalK4?: number;
    akhirK4?: number;
    ttd4?: number;
    noSurat5?: number;
    awalK5?: number;
    akhirK5?: number;
    ttd5?: number;
    noSurat6?: number;
    awalK6?: number;
    akhirK6?: number;
    ttd6?: number;
  }

  const findHeaderRowAndMap = (rawRows: any[][]): { 
    headerRowIdx: number; 
    colMap: ColumnIndexMap; 
    isValid: boolean; 
    missingFields: string[];
    matchedCount: number;
  } => {
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const colMap: ColumnIndexMap = {};
      let matchedCount = 0;

      row.forEach((cell, idx) => {
        const norm = normalizeHeaderString(cell);
        if (!norm) return;

        if (['nama', 'namakaryawan', 'namalengkap', 'namatenagakerja', 'pekerja', 'name', 'employeename'].includes(norm)) {
          colMap.nama = idx;
          matchedCount++;
        } else if (['noktp', 'ktp', 'nik', 'nomorktp', 'nomornik', 'idktp', 'identitynumber', 'noktppelamar'].includes(norm)) {
          colMap.noKtp = idx;
          matchedCount++;
        } else if (['no', 'nourut', 'nomor', 'num', 'id'].includes(norm) && colMap.noUrut === undefined) {
          colMap.noUrut = idx;
          matchedCount++;
        } else if (['project', 'proyek', 'unit', 'lokasiproject', 'client', 'projek', 'kodeproject'].includes(norm)) {
          colMap.project = idx;
          matchedCount++;
        } else if (['lokasikerja', 'lokasi', 'penempatan', 'cabang', 'kota', 'worklocation'].includes(norm)) {
          colMap.lokasiKerja = idx;
          matchedCount++;
        } else if (['upah', 'gaji', 'gajipokok', 'nominalupah', 'salary', 'basicwage', 'upahpokok'].includes(norm)) {
          colMap.upah = idx;
          matchedCount++;
        } else if (['ketupah', 'terbilangupah', 'keteranganupah', 'keterangangaji', 'terbilang'].includes(norm)) {
          colMap.ketUpah = idx;
          matchedCount++;
        } else if (['masakontrak', 'durasi', 'jangkawaktu', 'periodkontrak'].includes(norm)) {
          colMap.masaKontrak = idx;
          matchedCount++;
        } else if (['tempat', 'tempatlahir', 'tmplahir', 'pob', 'placeofbirth', 'tmplhr', 'tempatlhr'].includes(norm)) {
          colMap.tempatLahir = idx;
          matchedCount++;
        } else if (['tanggallahir', 'tgllahir', 'dob', 'dateofbirth', 'tglahir', 'birthdate', 'tgllhr', 'lahir', 'tanggallhr'].includes(norm)) {
          colMap.tanggalLahir = idx;
          matchedCount++;
        } else if (['alamat', 'domisili', 'alamattinggal', 'alamatktp', 'address', 'alamatlengkap'].includes(norm)) {
          colMap.alamat = idx;
          matchedCount++;
        } else if (['norekening', 'rekening', 'nobank', 'norek', 'accountnumber'].includes(norm)) {
          colMap.noRekening = idx;
          matchedCount++;
        } else if (['bank', 'namabank'].includes(norm)) {
          colMap.bank = idx;
          matchedCount++;
        } else if (['jabatan', 'posisi', 'pekerjaan', 'jobtitle'].includes(norm)) {
          colMap.jabatan = idx;
          matchedCount++;
        } else if (['golongan', 'gol', 'grade'].includes(norm)) {
          colMap.golongan = idx;
          matchedCount++;
        } else if (['jeniskelamin', 'gender', 'jk', 'sex'].includes(norm)) {
          colMap.jenisKelamin = idx;
          matchedCount++;
        } else if (['email', 'surel'].includes(norm)) {
          colMap.email = idx;
          matchedCount++;
        } else if (['nohp', 'hp', 'notelepon', 'notelp', 'telepon', 'phone'].includes(norm)) {
          colMap.noHp = idx;
          matchedCount++;
        } else if (['statuskaryawan', 'status'].includes(norm)) {
          colMap.statusKaryawan = idx;
          matchedCount++;
        } else if (['nosurat1', 'nosuratk1', 'suratk1', 'nosurat'].includes(norm)) {
          colMap.noSurat1 = idx;
          matchedCount++;
        } else if (['nosurat2', 'nosuratk2', 'suratk2'].includes(norm)) {
          colMap.noSurat2 = idx;
          matchedCount++;
        } else if (['nosurat3', 'nosuratk3', 'suratk3'].includes(norm)) {
          colMap.noSurat3 = idx;
          matchedCount++;
        } else if (['nosurat4', 'nosuratk4', 'suratk4'].includes(norm)) {
          colMap.noSurat4 = idx;
          matchedCount++;
        } else if (['nosurat5', 'nosuratk5', 'suratk5'].includes(norm)) {
          colMap.noSurat5 = idx;
          matchedCount++;
        } else if (['nosurat6', 'nosuratk6', 'suratk6'].includes(norm)) {
          colMap.noSurat6 = idx;
          matchedCount++;
        } else if (['awalk1', 'tglawalk1', 'mulai1', 'tglmulai1', 'awalkontrak1', 'awalkontrak', 'tglawal', 'tglmulai', 'mulai', 'awal', 'mulaikontrak', 'tglawalkontrak', 'tanggalawal'].includes(norm)) {
          if (colMap.awalK1 === undefined) {
            colMap.awalK1 = idx;
            matchedCount++;
          }
        } else if (['akhirk1', 'tglakhirk1', 'selesai1', 'tglselesai1', 'akhirkontrak1', 'akhirkontrak', 'tglakhir', 'tglselesai', 'selesai', 'akhir', 'habiskontrak', 'tglakhirkontrak', 'tanggalakhir'].includes(norm)) {
          if (colMap.akhirK1 === undefined) {
            colMap.akhirK1 = idx;
            matchedCount++;
          }
        } else if (['ttd1', 'tglttd1', 'tanggalttd1', 'ttdk1', 'ttd', 'tglttd', 'tanggalttd', 'tandatangan', 'tglkontrak'].includes(norm)) {
          if (colMap.ttd1 === undefined) {
            colMap.ttd1 = idx;
            matchedCount++;
          }
        } else if (['awalk2', 'tglawalk2', 'mulai2', 'tglmulai2', 'awalkontrak2'].includes(norm)) {
          colMap.awalK2 = idx;
        } else if (['akhirk2', 'tglakhirk2', 'selesai2', 'tglselesai2', 'akhirkontrak2'].includes(norm)) {
          colMap.akhirK2 = idx;
        } else if (['ttd2', 'tglttd2', 'tanggalttd2', 'ttdk2'].includes(norm)) {
          colMap.ttd2 = idx;
        } else if (['awalk3', 'tglawalk3', 'mulai3'].includes(norm)) {
          colMap.awalK3 = idx;
        } else if (['akhirk3', 'tglakhirk3', 'selesai3'].includes(norm)) {
          colMap.akhirK3 = idx;
        } else if (['ttd3', 'tglttd3'].includes(norm)) {
          colMap.ttd3 = idx;
        } else if (['awalk4', 'tglawalk4', 'mulai4'].includes(norm)) {
          colMap.awalK4 = idx;
        } else if (['akhirk4', 'tglakhirk4', 'selesai4'].includes(norm)) {
          colMap.akhirK4 = idx;
        } else if (['ttd4', 'tglttd4'].includes(norm)) {
          colMap.ttd4 = idx;
        } else if (['awalk5', 'tglawalk5', 'mulai5'].includes(norm)) {
          colMap.awalK5 = idx;
        } else if (['akhirk5', 'tglakhirk5', 'selesai5'].includes(norm)) {
          colMap.akhirK5 = idx;
        } else if (['ttd5', 'tglttd5'].includes(norm)) {
          colMap.ttd5 = idx;
        } else if (['awalk6', 'tglawalk6', 'mulai6'].includes(norm)) {
          colMap.awalK6 = idx;
        } else if (['akhirk6', 'tglakhirk6', 'selesai6'].includes(norm)) {
          colMap.akhirK6 = idx;
        } else if (['ttd6', 'tglttd6'].includes(norm)) {
          colMap.ttd6 = idx;
        }
      });

      const missingFields: string[] = [];
      if (colMap.nama === undefined) missingFields.push("NAMA / NAMA KARYAWAN");
      if (colMap.noKtp === undefined) missingFields.push("NO. KTP / NIK");

      // File must contain both NAMA and NO. KTP / NIK to be recognized as employee table
      if (colMap.nama !== undefined && colMap.noKtp !== undefined) {
        return { headerRowIdx: r, colMap, isValid: true, missingFields: [], matchedCount };
      }
    }

    return { 
      headerRowIdx: -1, 
      colMap: {}, 
      isValid: false, 
      missingFields: ["NAMA (atau NAMA KARYAWAN)", "NO. KTP (atau NIK)"],
      matchedCount: 0 
    };
  };

  // Full Excel Import (.xlsx / .xls) with Strict Header Matching & Error Checking
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error('Lembar kerja Excel kosong');
        }

        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (rawRows.length <= 1) {
          setToastMessage({
            text: 'File Excel tidak memiliki baris data karyawan.',
            type: 'error'
          });
          return;
        }

        // 1. Strict Header Matching: ensure file header matches Employee Database template
        const { headerRowIdx, colMap, isValid, missingFields } = findHeaderRowAndMap(rawRows);

        if (!isValid || headerRowIdx === -1) {
          setToastMessage({
            text: `Format file Excel ditolak! Kolom header tidak sesuai template Database Karyawan. Kolom wajib (${missingFields.join(' & ')}) tidak ditemukan. Pastikan header tabel sesuai agar data tidak salah masuk tabel.`,
            type: 'error'
          });
          setTimeout(() => setToastMessage(null), 7000);
          return;
        }

        const rawCandidates: Omit<ParsedExcelEmployee, 'status' | 'errors' | 'warnings'>[] = [];
        let parsedRowIdx = 0;

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const cols = rawRows[i];
          if (!Array.isArray(cols) || cols.length === 0 || cols.every(c => c === '' || c === null || c === undefined)) continue;

          // Helper to extract cell safely from matched column index
          const getCell = (colIdx?: number): string => {
            if (colIdx === undefined || colIdx >= cols.length) return '';
            const cell = cols[colIdx];
            if (cell === null || cell === undefined) return '';
            if (cell instanceof Date) return formatTanggalIndonesia(cell);
            return String(cell).trim();
          };

          // Helper to extract date cell and format as "dd MMMM yyyy"
          const getCellDate = (colIdx?: number): string => {
            if (colIdx === undefined || colIdx >= cols.length) return '';
            return formatExcelDate(cols[colIdx]);
          };

          const rawNama = getCell(colMap.nama);
          const rawKtp = cleanNoKtp(getCell(colMap.noKtp));

          // Skip completely blank rows
          if (!rawNama && !rawKtp) continue;

          parsedRowIdx++;
          const noUrut = parseInt(getCell(colMap.noUrut), 10) || (employees.length + parsedRowIdx);

          let noSurat1 = getCell(colMap.noSurat1);
          let noSurat2 = getCell(colMap.noSurat2);
          let noSurat3 = getCell(colMap.noSurat3);
          let noSurat4 = getCell(colMap.noSurat4);
          let noSurat5 = getCell(colMap.noSurat5);
          let noSurat6 = getCell(colMap.noSurat6);

          const awalK1 = getCellDate(colMap.awalK1);
          const akhirK1 = getCellDate(colMap.akhirK1);
          const ttd1 = getCellDate(colMap.ttd1);

          const awalK2 = getCellDate(colMap.awalK2);
          const akhirK2 = getCellDate(colMap.akhirK2);
          const ttd2 = getCellDate(colMap.ttd2);

          const awalK3 = getCellDate(colMap.awalK3);
          const akhirK3 = getCellDate(colMap.akhirK3);
          const ttd3 = getCellDate(colMap.ttd3);

          const awalK4 = getCellDate(colMap.awalK4);
          const akhirK4 = getCellDate(colMap.akhirK4);
          const ttd4 = getCellDate(colMap.ttd4);

          const awalK5 = getCellDate(colMap.awalK5);
          const akhirK5 = getCellDate(colMap.akhirK5);
          const ttd5 = getCellDate(colMap.ttd5);

          const awalK6 = getCellDate(colMap.awalK6);
          const akhirK6 = getCellDate(colMap.akhirK6);
          const ttd6 = getCellDate(colMap.ttd6);

          const masaKontrak = getCell(colMap.masaKontrak) || '3 Bulan';
          const ketUpah = getCell(colMap.ketUpah);
          const upahParsed = parseFloat(getCell(colMap.upah).replace(/[^0-9.]/g, ''));
          const upah = !isNaN(upahParsed) && upahParsed > 0 ? upahParsed : 5625883;

          const lokasiKerja = getCell(colMap.lokasiKerja) || 'Jakarta';
          const nama = rawNama.toUpperCase();
          const tempatLahir = (getCell(colMap.tempatLahir) || 'JAKARTA').toUpperCase();
          const tanggalLahir = getCellDate(colMap.tanggalLahir) || '01 Januari 2000';
          const noKtp = cleanNoKtp(rawKtp);
          const alamat = (getCell(colMap.alamat) || 'JAKARTA').toUpperCase();
          const project = getCell(colMap.project);
          const noRekening = cleanExcelTextNumber(getCell(colMap.noRekening)) || '5745940924';
          const bank = getCell(colMap.bank) || 'BCA';
          const jabatan = getCell(colMap.jabatan) || 'Operator';
          const golongan = getCell(colMap.golongan) || '0A';
          const jenisKelamin = getCell(colMap.jenisKelamin) === 'Perempuan' ? 'Perempuan' : 'Laki-Laki';
          const email = getCell(colMap.email) || `${nama.toLowerCase().replace(/\s+/g, '.')}@example.com`;
          const noHp = cleanExcelTextNumber(getCell(colMap.noHp)) || '6281234567890';
          const rawStatus = getCell(colMap.statusKaryawan).toUpperCase();
          const statusKaryawan = rawStatus === 'PKWTT' ? 'PKWTT' : 'PKWT';

          // Automatically generate No Surat if empty based on counting & phase!
          if (!noSurat1) noSurat1 = formatAutoNoSurat(noUrut, 'K1', awalK1);
          if (!noSurat2 && awalK2) noSurat2 = formatAutoNoSurat(noUrut, 'K2', awalK2);
          if (!noSurat3 && awalK3) noSurat3 = formatAutoNoSurat(noUrut, 'K3', awalK3);
          if (!noSurat4 && awalK4) noSurat4 = formatAutoNoSurat(noUrut, 'K4', awalK4);
          if (!noSurat5 && awalK5) noSurat5 = formatAutoNoSurat(noUrut, 'K5', awalK5);
          if (!noSurat6 && awalK6) noSurat6 = formatAutoNoSurat(noUrut, 'K6', awalK6);

          rawCandidates.push({
            tempId: `row-${Date.now()}-${i}`,
            noUrut,
            noSurat1,
            noSurat2,
            noSurat3,
            noSurat4,
            noSurat5,
            noSurat6,
            awalK1,
            akhirK1,
            ttd1,
            awalK2,
            akhirK2,
            ttd2,
            awalK3,
            akhirK3,
            ttd3,
            awalK4,
            akhirK4,
            ttd4,
            awalK5,
            akhirK5,
            ttd5,
            awalK6,
            akhirK6,
            ttd6,
            masaKontrak,
            ketUpah,
            upah,
            lokasiKerja,
            nama,
            tempatLahir,
            tanggalLahir,
            noKtp,
            alamat,
            project,
            noRekening,
            bank,
            jabatan,
            golongan,
            jenisKelamin,
            email,
            noHp,
            statusKaryawan,
            currentContractPhase: awalK6 ? 'K6' : awalK5 ? 'K5' : awalK4 ? 'K4' : awalK3 ? 'K3' : awalK2 ? 'K2' : 'K1',
            isSelected: true
          });
        }

        if (rawCandidates.length === 0) {
          setToastMessage({
            text: 'Tidak ada baris data karyawan yang terbaca dari file Excel.',
            type: 'error'
          });
          return;
        }

        // Validate each row
        const validatedItems: ParsedExcelEmployee[] = rawCandidates.map(c => {
          const { status, errors, warnings } = validateParsedItem(c, rawCandidates, employees);
          return {
            ...c,
            status,
            errors,
            warnings,
            isSelected: status !== 'error'
          };
        });

        setParsedExcelItems(validatedItems);
        setImportFileName(file.name);
        setIsImportPreviewOpen(true);
      } catch (err) {
        console.error(err);
        setToastMessage({
          text: 'Gagal membaca file Excel. Pastikan file berformat .xlsx atau .xls yang valid.',
          type: 'error'
        });
        setTimeout(() => setToastMessage(null), 5000);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmExcelImport = async (
    itemsToImport: Employee[],
    onProgress?: (progress: { current: number; total: number; percent: number; currentName: string }) => void
  ) => {
    let savedCount = 0;
    const total = itemsToImport.length;
    for (let idx = 0; idx < total; idx++) {
      const emp = itemsToImport[idx];
      const startPercent = Math.round((idx / total) * 100);
      if (onProgress) {
        onProgress({ current: idx + 1, total, percent: startPercent, currentName: emp.nama });
      }
      await saveEmployee(emp);
      savedCount++;
      const finishedPercent = Math.round(((idx + 1) / total) * 100);
      if (onProgress) {
        onProgress({ current: idx + 1, total, percent: finishedPercent, currentName: emp.nama });
      }
    }
    showToast(
      'success',
      'Impor Database Berhasil',
      `Berhasil mengimpor ${savedCount} data karyawan ke database! Nomor Surat terisi otomatis.`
    );
  };

  const handleBatchPrintClick = () => {
    if (onBatchMailMerge) {
      const selectedList = employees.filter(e => selectedIds.includes(e.id));
      onBatchMailMerge(selectedList);
    }
  };

  const renderSuratBadge = (val: string, colorClass: string) => {
    if (!val || val === '-') return <span className="text-gray-400">-</span>;
    if (val.includes(',')) {
      const parts = val.split(',').map(s => s.trim()).filter(Boolean);
      return (
        <div className="flex flex-col gap-1 py-0.5">
          {parts.map((p, idx) => (
            <span 
              key={idx} 
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono shadow-2xs"
              title={p}
            >
              <span className="font-black text-[9px] bg-amber-200 text-amber-950 px-1 rounded">#{idx + 1}</span>
              <span className="truncate max-w-[130px]">{p}</span>
            </span>
          ))}
        </div>
      );
    }
    return <span className={colorClass}>{val}</span>;
  };

  const renderDateBadge = (val?: string) => {
    if (!val) return <span className="text-gray-400">-</span>;
    if (val.includes(' / ') || val.includes(',')) {
      const parts = val.includes(' / ') ? val.split(' / ') : val.split(',');
      return (
        <div className="flex flex-col gap-0.5 py-0.5">
          {parts.map((p, idx) => (
            <span key={idx} className="text-[10px] text-gray-700 bg-slate-100 px-1 rounded border border-slate-200 whitespace-nowrap">
              #{idx + 1}: {p.trim()}
            </span>
          ))}
        </div>
      );
    }
    return <span>{val}</span>;
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`p-3 text-xs font-semibold flex items-center justify-between border-b ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{toastMessage.text}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-xs hover:underline cursor-pointer ml-3"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Table & Controls Area (Hidden when Paklaring Modal is printing) */}
      <div className={isPaklaringModalOpen ? 'print:hidden' : ''}>
        {/* Table Toolbar (Single Row Flexible Header) */}
        <div className="px-3.5 py-2.5 border-b border-gray-200 flex flex-nowrap items-center justify-between gap-2 bg-slate-50/90 overflow-x-auto select-none">
        {/* Left: Search & Filter Dropdowns */}
        <div className="flex flex-nowrap items-center gap-1.5 flex-1 min-w-0">
          {/* Search bar with clear X button */}
          <div className="relative min-w-[130px] max-w-[220px] flex-1 shrink">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, NIK, No Surat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (onResetSearch) onResetSearch();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer"
                title="Hapus teks pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Phase Filter */}
          <select
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 shrink-0 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            title="Filter Tahap Kontrak"
          >
            <option value="ALL">Semua Tahap</option>
            <option value="K1">Tahap K1</option>
            <option value="K2">Tahap K2</option>
            <option value="K3">Tahap K3</option>
            <option value="K4">Tahap K4</option>
            <option value="K5">Tahap K5</option>
            <option value="K6">Tahap K6</option>
            <option value="PKWTT">PKWTT (Tetap)</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 shrink-0 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            title="Filter Status Karyawan"
          >
            <option value="ALL">Semua Status</option>
            <option value="PKWT">PKWT Aktif</option>
            <option value="PKWTT">PKWTT</option>
            <option value="SELESAI">Selesai Masa</option>
          </select>

          {/* Expiration Filter */}
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 shrink-0 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            title="Filter Masa Berlaku Kontrak"
          >
            <option value="ALL">Semua Masa</option>
            <option value="EXPIRING">Segera Habis (&lt;30 Hari)</option>
            <option value="EXPIRED">Kedaluwarsa</option>
          </select>

          {/* Dedicated Reset Tabel Button */}
          <button
            type="button"
            onClick={handleResetAllFilters}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-all cursor-pointer ${
              isFilterActive
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-white hover:bg-gray-100 text-gray-500 border border-gray-200'
            }`}
            title="Reset semua filter pencarian"
          >
            <RotateCcw className={`w-3 h-3 ${isFilterActive ? 'text-amber-700' : 'text-gray-400'}`} />
            <span>Reset</span>
          </button>
        </div>

        {/* Right: Action Buttons in same 1 row */}
        <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
          {/* Tombol Akhiri Kontrak Lewat Tanggal (Migrasi) */}
          {expiredMigrationEmployees.length > 0 && (userRole === 'admin' || userRole === 'hr') && (
            <button
              type="button"
              onClick={() => setIsBulkTerminateModalOpen(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-xs transition-all active:scale-95 cursor-pointer animate-pulse"
              title="Akhiri seluruh status kontrak karyawan yang tanggalnya sudah lewat (Status Migrasi)"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Akhiri Kontrak Lewat Tanggal ({expiredMigrationEmployees.length})</span>
            </button>
          )}

          {selectedIds.length > 0 && onBatchMailMerge && (
            <button
              onClick={handleBatchPrintClick}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-all shadow-xs active:scale-95 animate-pulse"
              title="Cetak massal surat kontrak terpilih"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak ({selectedIds.length})</span>
            </button>
          )}

          {/* Tombol Hapus per Halaman Pagination */}
          {(selectedOnCurrentPage.length > 0 || selectedIds.length > 0) && (userRole === 'admin' || userRole === 'hr') && (
            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Hapus data karyawan terpilih pada halaman ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {selectedOnCurrentPage.length > 0
                  ? `Hapus di Halaman Ini (${selectedOnCurrentPage.length})`
                  : `Hapus (${selectedIds.length})`}
              </span>
            </button>
          )}

          {/* Import Excel (.xlsx / .xls) with Preview */}
          {(userRole === 'admin' || userRole === 'hr') && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
                title="Impor file Excel (.xlsx / .xls) dengan pratinjau & validasi error"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Impor Excel</span>
              </button>
            </>
          )}

          {/* Unduh Template Excel Resmi */}
          <button
            onClick={downloadTemplate}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
            title="Unduh format template resmi Excel (.xlsx) dengan kolom fleksibel K1 s/d K6"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Template Excel</span>
          </button>

          {/* Export to Excel (.xlsx) */}
          <button
            onClick={exportToExcel}
            className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
            title="Ekspor seluruh database ke file Excel (.xlsx)"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          {/* Add Employee */}
          {(userRole === 'admin' || userRole === 'hr') && (
            <button
              onClick={onAddEmployee}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors shadow-sm active:scale-95 cursor-pointer"
              title="Tambah Karyawan Baru"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Karyawan</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter & Reset Notice Banner */}
      {isFilterActive && (
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-amber-200 text-amber-800 rounded-md shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </span>
            <span>
              Menampilkan <strong>{filteredEmployees.length}</strong> dari total <strong>{employees.length}</strong> karyawan
              {searchQuery && <> untuk pencarian: <span className="bg-amber-200/90 text-amber-900 font-bold px-1.5 py-0.5 rounded">"{searchQuery}"</span></>}
              {filterPhase !== 'ALL' && <> • Tahap: <strong className="font-semibold">{filterPhase}</strong></>}
              {filterStatus !== 'ALL' && <> • Status: <strong className="font-semibold">{filterStatus}</strong></>}
              {filterUrgency !== 'ALL' && <> • Masa: <strong className="font-semibold">{filterUrgency}</strong></>}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetAllFilters}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tampilkan Semua Data (Reset Filter)</span>
          </button>
        </div>
      )}

      {/* Selection info strip */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-blue-900 font-medium">
          <div className="flex items-center space-x-2">
            <span>
              <span className="font-bold">{selectedIds.length}</span> karyawan dipilih
              {pageSize !== 'ALL' && (
                <span className="text-blue-700 font-semibold"> ({selectedOnCurrentPage.length} di halaman ini)</span>
              )}.
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {selectedOnCurrentPage.length > 0 && (userRole === 'admin' || userRole === 'hr') && (
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedOnCurrentPage.length} di Halaman Ini</span>
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="text-blue-700 hover:underline font-semibold cursor-pointer"
            >
              Batalkan Pilihan
            </button>
          </div>
        </div>
      )}

      {/* Quick Status Legend Bar & Expired Migration Alert */}
      <div className="px-4 py-2 bg-slate-100/90 border-b border-gray-200 text-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-gray-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Highlight Status:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-100/80 border border-red-300 text-red-900 font-bold text-[10.5px]">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            🔴 Lewat Tanggal / Kedaluwarsa
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100/80 border border-amber-300 text-amber-900 font-bold text-[10.5px]">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            🟠 Segera Habis (&lt;30 Hari)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100/80 border border-emerald-300 text-emerald-900 font-bold text-[10.5px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            🟢 Kontrak Aktif Normal
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-200 border border-slate-300 text-slate-700 font-semibold text-[10.5px]">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            ⚪ Selesai Masa Kontrak
          </span>
        </div>

        {expiredMigrationEmployees.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-red-700 font-bold text-xs flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>{expiredMigrationEmployees.length} Karyawan lewat tanggal</span>
            </span>
            {(userRole === 'admin' || userRole === 'hr') && (
              <button
                type="button"
                onClick={() => setIsBulkTerminateModalOpen(true)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-[11px] transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                Akhiri Kontrak Sekarang
              </button>
            )}
          </div>
        )}
      </div>

      {/* Structured Excel-like Table View: Points 1 & 2 No Surat 1 s/d No Surat 6 */}
      <div className="overflow-x-auto relative max-h-[70vh]">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="bg-[#00A2E8] text-white uppercase tracking-wider font-bold sticky top-0 z-20 select-none shadow-sm">
            <tr className="divide-x divide-[#0089C4]">
              {/* STICKY COLUMN 1: CHECKBOX */}
              <th className="py-2.5 px-3 text-center min-w-[40px] sticky left-0 bg-[#00A2E8] z-30">
                <input
                  type="checkbox"
                  checked={isCurrentPageAllSelected}
                  onChange={toggleSelectCurrentPage}
                  className="rounded cursor-pointer"
                  title="Pilih Semua di Halaman Ini"
                />
              </th>
              {/* STICKY COLUMN 2: NO */}
              <th className="py-2.5 px-3 text-center min-w-[50px] sticky left-[40px] bg-[#00A2E8] z-30">
                NO
              </th>
              {/* STICKY COLUMN 3: NAMA KARYAWAN (TAMPIL DI DEPAN TABEL) */}
              <th className="py-2.5 px-3 min-w-[220px] sticky left-[90px] bg-[#00A2E8] z-30 shadow-xs">
                NAMA KARYAWAN
              </th>
              {/* COLUMN 4: STATUS & MASA KONTRAK */}
              <th className="py-2.5 px-3 min-w-[175px]">
                STATUS & MASA KONTRAK
              </th>
              
              {/* Point 2: No Surat 1 s/d No Surat 6 */}
              <th className="py-2.5 px-3 min-w-[190px]">No Surat 1</th>
              <th className="py-2.5 px-3 min-w-[190px]">No Surat 2</th>
              <th className="py-2.5 px-3 min-w-[190px]">No Surat 3</th>
              <th className="py-2.5 px-3 min-w-[190px]">No Surat 4</th>
              <th className="py-2.5 px-3 min-w-[190px]">No Surat 5</th>
              <th className="py-2.5 px-3 min-w-[190px]">No Surat 6</th>
              
              {/* K1 */}
              <th className="py-2.5 px-3 min-w-[120px]">AWAL K1</th>
              <th className="py-2.5 px-3 min-w-[120px]">AKHIR K1</th>
              <th className="py-2.5 px-3 min-w-[120px]">TTD1</th>

              {/* K2 */}
              <th className="py-2.5 px-3 min-w-[120px]">AWAL K2</th>
              <th className="py-2.5 px-3 min-w-[120px]">AKHIR K2</th>
              <th className="py-2.5 px-3 min-w-[120px]">TTD2</th>

              {/* K3 */}
              <th className="py-2.5 px-3 min-w-[120px]">AWAL K3</th>
              <th className="py-2.5 px-3 min-w-[120px]">AKHIR K3</th>
              <th className="py-2.5 px-3 min-w-[120px]">TTD3</th>

              {/* K4 */}
              <th className="py-2.5 px-3 min-w-[120px]">AWAL K4</th>
              <th className="py-2.5 px-3 min-w-[120px]">AKHIR K4</th>
              <th className="py-2.5 px-3 min-w-[120px]">TTD4</th>

              {/* K5 */}
              <th className="py-2.5 px-3 min-w-[120px]">AWAL K5</th>
              <th className="py-2.5 px-3 min-w-[120px]">AKHIR K5</th>
              <th className="py-2.5 px-3 min-w-[120px]">TTD5</th>

              {/* K6 */}
              <th className="py-2.5 px-3 min-w-[120px] bg-[#0089C4]">AWAL K6</th>
              <th className="py-2.5 px-3 min-w-[120px] bg-[#0089C4]">AKHIR K6</th>
              <th className="py-2.5 px-3 min-w-[120px] bg-[#0089C4]">TTD6</th>

              <th className="py-2.5 px-3 min-w-[100px]">MASA KONTRAK</th>
              <th className="py-2.5 px-3 min-w-[280px]">KET upah</th>
              <th className="py-2.5 px-3 min-w-[120px]">upah</th>
              <th className="py-2.5 px-3 min-w-[100px]">LOKASI KERJA</th>
              <th className="py-2.5 px-3 min-w-[110px]">TEMPAT</th>
              <th className="py-2.5 px-3 min-w-[110px]">TANGGAL LAHIR</th>
              <th className="py-2.5 px-3 min-w-[150px]">NO. KTP</th>
              <th className="py-2.5 px-3 min-w-[320px]">ALAMAT</th>
              <th className="py-2.5 px-3 min-w-[200px]">PROJECT</th>
              <th className="py-2.5 px-3 min-w-[130px]">NO REKENING</th>
              <th className="py-2.5 px-4 min-w-[210px] text-center sticky right-0 bg-[#00A2E8] z-30">
                AKSI OPERASIONAL
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={38} className="py-12 text-center text-gray-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-semibold text-gray-600">Tidak ada data karyawan yang cocok dengan filter pencarian.</p>
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp, index) => {
                  const activeExpiry = emp.akhirK6 || emp.akhirK5 || emp.akhirK4 || emp.akhirK3 || emp.akhirK2 || emp.awalK1;
                  const daysLeft = getDaysRemaining(activeExpiry);
                  const expiryInfo = getExpirationStatus(daysLeft);
                  const isSelected = selectedIds.includes(emp.id);

                const isFinished = emp.statusKaryawan === 'SELESAI' || emp.statusKaryawan === 'NONAKTIF';
                const isExpired = !isFinished && daysLeft !== null && daysLeft < 0;
                const isCritical = !isFinished && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                const isWarning = !isFinished && daysLeft !== null && daysLeft > 7 && daysLeft <= 30;

                // Dynamic highlight class for whole row
                const rowBgClass = isSelected
                  ? 'bg-blue-50/95 font-medium border-l-4 border-l-blue-600'
                  : isExpired
                  ? 'bg-red-50/90 hover:bg-red-100/80 border-l-4 border-l-red-600'
                  : isCritical
                  ? 'bg-rose-50/90 hover:bg-rose-100/80 border-l-4 border-l-rose-500'
                  : isWarning
                  ? 'bg-amber-50/90 hover:bg-amber-100/80 border-l-4 border-l-amber-500'
                  : isFinished
                  ? 'bg-slate-100/70 hover:bg-slate-200/60 text-slate-500 border-l-4 border-l-slate-400'
                  : 'bg-white hover:bg-blue-50/40';

                // Sticky cell backgrounds matching highlight so freeze column displays color clearly
                const stickyBgClass = isSelected
                  ? 'bg-blue-50 group-hover:bg-blue-100/80'
                  : isExpired
                  ? 'bg-red-50 group-hover:bg-red-100/80'
                  : isCritical
                  ? 'bg-rose-50 group-hover:bg-rose-100/80'
                  : isWarning
                  ? 'bg-amber-50 group-hover:bg-amber-100/80'
                  : isFinished
                  ? 'bg-slate-100 group-hover:bg-slate-200/60'
                  : 'bg-white group-hover:bg-blue-50/40';

                // Auto-resolve No Surat if not explicitly stored
                const valNoSurat1 = emp.noSurat1 || formatAutoNoSurat(emp.no, 'K1', emp.awalK1);
                const valNoSurat2 = emp.noSurat2 || (emp.awalK2 ? formatAutoNoSurat(emp.no, 'K2', emp.awalK2) : '-');
                const valNoSurat3 = emp.noSurat3 || (emp.awalK3 ? formatAutoNoSurat(emp.no, 'K3', emp.awalK3) : '-');
                const valNoSurat4 = emp.noSurat4 || (emp.awalK4 ? formatAutoNoSurat(emp.no, 'K4', emp.awalK4) : '-');
                const valNoSurat5 = emp.noSurat5 || (emp.awalK5 ? formatAutoNoSurat(emp.no, 'K5', emp.awalK5) : '-');
                const valNoSurat6 = emp.noSurat6 || (emp.awalK6 ? formatAutoNoSurat(emp.no, 'K6', emp.awalK6) : '-');

                return (
                  <tr
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp)}
                    className={`transition-colors divide-x divide-gray-100 group cursor-pointer ${rowBgClass}`}
                  >
                    {/* Checkbox column (STICKY LEFT 0) */}
                    <td 
                      className={`py-2.5 px-3 text-center sticky left-0 ${stickyBgClass} z-10`}
                      onClick={(e) => toggleSelectRow(emp.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded cursor-pointer"
                      />
                    </td>

                    {/* NO (STICKY LEFT 40px) */}
                    <td className={`py-2.5 px-3 text-center font-bold sticky left-[40px] ${stickyBgClass} z-10 text-gray-700`}>
                      {emp.no || (pageSize === 'ALL' ? index + 1 : (safeCurrentPage - 1) * (pageSize as number) + index + 1)}
                    </td>

                    {/* NAMA KARYAWAN (STICKY FRONT COLUMN 90px) */}
                    <td className={`py-2 px-3 sticky left-[90px] ${stickyBgClass} z-10 whitespace-nowrap shadow-xs`}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-gray-950 uppercase text-[11.5px] tracking-tight">
                          {emp.nama}
                        </span>
                        {isExpired && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                            KEDALUWARSA
                          </span>
                        )}
                        {isCritical && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            KRITIS
                          </span>
                        )}
                        {isWarning && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            &lt;30 HARI
                          </span>
                        )}
                        {isFinished && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-200 text-gray-700">
                            SELESAI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                        <span>NIK: {cleanNoKtp(emp.noKtp) || '-'}</span>
                        <span>•</span>
                        <span className="text-gray-600 font-medium truncate max-w-[130px]">{emp.project || emp.jabatan || 'PKWT'}</span>
                      </div>
                    </td>

                    {/* STATUS & MASA KONTRAK */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isFinished ? 'bg-gray-100 text-gray-700' :
                          isExpired ? 'bg-red-100 text-red-800 font-extrabold' :
                          isCritical ? 'bg-rose-100 text-rose-800' :
                          isWarning ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isFinished ? 'SELESAI KONTRAK' : expiryInfo.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {emp.currentContractPhase || 'K1'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Akhir: <span className="font-semibold text-gray-700">{activeExpiry || '-'}</span>
                      </div>
                    </td>

                    {/* Point 2: No Surat 1 s/d 6 */}
                    <td className="py-2 px-3 font-mono text-[10.5px] whitespace-nowrap">
                      {renderSuratBadge(valNoSurat1, 'text-gray-800')}
                    </td>
                    <td className="py-2 px-3 font-mono text-[10.5px] whitespace-nowrap">
                      {renderSuratBadge(valNoSurat2, 'text-blue-700 font-medium')}
                    </td>
                    <td className="py-2 px-3 font-mono text-[10.5px] whitespace-nowrap">
                      {renderSuratBadge(valNoSurat3, 'text-emerald-700 font-medium')}
                    </td>
                    <td className="py-2 px-3 font-mono text-[10.5px] whitespace-nowrap">
                      {renderSuratBadge(valNoSurat4, 'text-indigo-700 font-medium')}
                    </td>
                    <td className="py-2 px-3 font-mono text-[10.5px] whitespace-nowrap">
                      {renderSuratBadge(valNoSurat5, 'text-amber-700 font-medium')}
                    </td>
                    <td className="py-2 px-3 font-mono text-[10.5px] whitespace-nowrap">
                      {renderSuratBadge(valNoSurat6, 'text-purple-700 font-medium')}
                    </td>

                    {/* K1 */}
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{renderDateBadge(emp.awalK1)}</td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{renderDateBadge(emp.akhirK1)}</td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{renderDateBadge(emp.ttd1)}</td>

                    {/* K2 */}
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{renderDateBadge(emp.awalK2)}</td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap font-medium">{renderDateBadge(emp.akhirK2)}</td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{renderDateBadge(emp.ttd2)}</td>

                    {/* K3 */}
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{renderDateBadge(emp.awalK3)}</td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap font-medium text-emerald-700">{renderDateBadge(emp.akhirK3)}</td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{renderDateBadge(emp.ttd3)}</td>

                    {/* K4 */}
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{renderDateBadge(emp.awalK4)}</td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap font-medium">{renderDateBadge(emp.akhirK4)}</td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{renderDateBadge(emp.ttd4)}</td>

                    {/* K5 */}
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{renderDateBadge(emp.awalK5)}</td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap font-medium">{renderDateBadge(emp.akhirK5)}</td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{renderDateBadge(emp.ttd5)}</td>

                    {/* K6 */}
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap bg-blue-50/20">{renderDateBadge(emp.awalK6)}</td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap font-medium bg-blue-50/20">{renderDateBadge(emp.akhirK6)}</td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap bg-blue-50/20">{renderDateBadge(emp.ttd6)}</td>

                    {/* MASA KONTRAK */}
                    <td className="py-2 px-3 font-semibold text-gray-800 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                        {emp.masaKontrak || '3 Bulan'}
                      </span>
                    </td>

                    {/* KET upah */}
                    <td className="py-2 px-3 text-gray-600 italic leading-snug">
                      {emp.ketUpah || '-'}
                    </td>

                    {/* upah */}
                    <td className="py-2 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {formatRupiah(emp.upah || 0)}
                    </td>

                    {/* LOKASI KERJA */}
                    <td className="py-2 px-3 text-gray-800 font-medium whitespace-nowrap">
                      {emp.lokasiKerja || 'Jakarta'}
                    </td>

                    {/* TEMPAT */}
                    <td className="py-2 px-3 text-gray-700 uppercase whitespace-nowrap">{emp.tempatLahir || '-'}</td>

                    {/* TANGGAL LAHIR */}
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{emp.tanggalLahir || '-'}</td>

                    {/* NO. KTP */}
                    <td className="py-2 px-3 font-mono text-gray-800 whitespace-nowrap">
                      {cleanNoKtp(emp.noKtp)}
                    </td>

                    {/* ALAMAT */}
                    <td className="py-2 px-3 text-gray-700 uppercase leading-snug">
                      {emp.alamat || '-'}
                    </td>

                    {/* PROJECT */}
                    <td className="py-2 px-3 font-mono text-[10.5px] text-gray-800 whitespace-nowrap">
                      {emp.project || '-'}
                    </td>

                    {/* NO REKENING */}
                    <td className="py-2 px-3 font-mono text-gray-800 whitespace-nowrap">
                      {emp.bank ? `${emp.bank} ` : ''}{emp.noRekening || '-'}
                    </td>

                    {/* AKSI OPERASIONAL */}
                    <td className={`py-2 px-3 text-center sticky right-0 ${stickyBgClass} z-10 whitespace-nowrap shadow-xs`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* 1. Tombol Perpanjang Kontrak */}
                        <button
                          onClick={() => handleOpenExtendModal(emp)}
                          className={`px-2.5 py-1 ${
                            isFinished 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          } rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer`}
                          title={isFinished ? "Aktifkan Kembali & Perpanjang Kontrak" : "Perpanjang Kontrak (Input Tanggal Awal, Akhir, TTD & No Surat Otomatis)"}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{isFinished ? 'Perpanjang Lagi' : 'Perpanjang'}</span>
                        </button>

                        {/* 2. Tombol Cetak Kontrak Otomatis */}
                        <button
                          onClick={() => onOpenContract(emp)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all border border-indigo-200 active:scale-95 cursor-pointer"
                          title="Cetak Kontrak (Otomatis Sesuai Kolom Terisi)"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Cetak Kontrak</span>
                        </button>

                        {/* 3. Tombol Akhiri Kontrak & Paklaring */}
                        <button
                          onClick={() => handleOpenPaklaringModal(emp)}
                          className={`px-2.5 py-1 ${
                            isFinished
                              ? 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border-rose-200'
                          } rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all border active:scale-95 cursor-pointer`}
                          title={isFinished ? "Cetak Surat Keterangan Kerja (Paklaring)" : "Akhiri Kontrak & Terbitkan Surat Paklaring"}
                        >
                          <Award className="w-3 h-3" />
                          <span>{isFinished ? 'Cetak Paklaring' : 'Akhiri Kontrak'}</span>
                        </button>

                        {/* Edit Employee */}
                        {(userRole === 'admin' || userRole === 'hr') && (
                          <button
                            onClick={() => onEditEmployee(emp)}
                            className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer text-[10.5px] font-bold flex items-center gap-1 border border-slate-200"
                            title="Edit Data Lengkap, Status & Kontrak"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Delete Employee */}
                        {userRole === 'admin' && (
                          <button
                            onClick={() => handleDeleteClick(emp)}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Hapus Karyawan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination & Footer Bar (10, 25, 50, 100, All) */}
      <div className="p-3 bg-slate-50 border-t border-gray-200 text-xs text-gray-600 flex flex-col md:flex-row items-center justify-between gap-3 px-4 sm:px-6 select-none">
        {/* Left: Summary Info & Items Per Page Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            Menampilkan{' '}
            <span className="font-extrabold text-gray-900">
              {totalItems === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === 'ALL' ? totalItems : pageSize) + 1}
            </span>
            {' - '}
            <span className="font-extrabold text-gray-900">
              {pageSize === 'ALL' ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems)}
            </span>
            {' dari '}
            <span className="font-extrabold text-gray-900">{totalItems}</span>
            {' karyawan'}
            {filteredEmployees.length !== employees.length && (
              <span className="text-gray-400"> (total {employees.length})</span>
            )}
          </div>

          <div className="h-4 w-[1px] bg-gray-300 hidden sm:block" />

          {/* Page Size Selector: 10, 25, 50, 100, All */}
          <div className="flex items-center space-x-1.5">
            <span className="text-gray-500 text-[11px] font-medium">Per Halaman:</span>
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-2xs">
              {([10, 25, 50, 100, 'ALL'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    pageSize === size
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {size === 'ALL' ? 'All' : size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center/Right: Page navigation buttons & Legend */}
        <div className="flex items-center space-x-2">
          {pageSize !== 'ALL' && totalPages > 1 && (
            <div className="flex items-center space-x-1">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1 px-1">
                {getPageNumbers(safeCurrentPage, totalPages).map((pNum, pIdx) => {
                  if (pNum === '...') {
                    return (
                      <span key={`dots-${pIdx}`} className="px-1.5 py-0.5 text-xs text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={`page-${pNum}`}
                      type="button"
                      onClick={() => setCurrentPage(pNum as number)}
                      className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        safeCurrentPage === pNum
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Status legend */}
          <div className="hidden lg:flex items-center space-x-3 text-[11px] text-gray-500 pl-3 border-l border-gray-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Aktif
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> &lt;30 Hari
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Kedaluwarsa
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* Extend Contract Modal */}
      {isExtendModalOpen && targetEmployeeForAction && (
        <ExtendContractModal
          isOpen={isExtendModalOpen}
          onClose={() => setIsExtendModalOpen(false)}
          employee={targetEmployeeForAction}
          allEmployees={employees}
          onSuccessAndPrint={(updatedEmp) => {
            onOpenContract(updatedEmp);
          }}
        />
      )}

      {isPaklaringModalOpen && targetEmployeeForAction && (
        <PaklaringModal
          isOpen={isPaklaringModalOpen}
          onClose={() => setIsPaklaringModalOpen(false)}
          employee={targetEmployeeForAction}
          onSuccess={() => {
            setToastMessage({
              text: `Kontrak karyawan ${targetEmployeeForAction?.nama} telah diakhiri. Status diperbarui menjadi Selesai.`,
              type: 'success'
            });
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* In-App Deletion Confirmation Modal (Reliable in iFrame with Yes/No Confirmation) */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Hapus Data Karyawan?</h3>
                  <p className="text-xs text-rose-600 font-semibold">Konfirmasi Penghapusan (Yes / No)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data karyawan berikut secara permanen dari database?
            </p>

            <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
              <p className="font-extrabold uppercase text-gray-950">{employeeToDelete.nama}</p>
              <p className="text-[11px] text-rose-800 font-mono">NIK / KTP: {employeeToDelete.noKtp}</p>
              <p className="text-[11px] text-gray-700">Project: {employeeToDelete.project || '-'}</p>
              <p className="text-[11px] text-gray-700">Tahap Kontrak: <span className="font-bold text-blue-700">{employeeToDelete.currentContractPhase || 'K1'}</span></p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tidak, Batalkan (No)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data (Yes)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Deletion Confirmation Modal - Per Page */}
      {isBatchDeleteModalOpen && (selectedOnCurrentPage.length > 0 || selectedIds.length > 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    Hapus {selectedOnCurrentPage.length > 0 ? selectedOnCurrentPage.length : selectedIds.length} Data Karyawan (Halaman Ini)?
                  </h3>
                  <p className="text-xs text-gray-500">
                    Penghapusan hanya berlaku untuk data pada halaman pagination ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isDeletingBatch}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-950 space-y-2">
              <p className="font-bold">
                Data karyawan pada halaman ini yang akan dihapus permanen:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 divide-y divide-rose-200/60">
                {(selectedOnCurrentPage.length > 0 ? selectedOnCurrentPage : employees.filter(e => selectedIds.includes(e.id))).slice(0, 10).map(emp => (
                  <div key={emp.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                    <span className="font-semibold truncate max-w-[200px]">{emp.nama}</span>
                    <span className="text-[11px] text-rose-800 font-mono">NIK: {emp.noKtp}</span>
                  </div>
                ))}
                {(selectedOnCurrentPage.length > 0 ? selectedOnCurrentPage.length : selectedIds.length) > 10 && (
                  <p className="pt-1.5 text-[11px] text-center text-rose-700 italic font-semibold">
                    ... dan {(selectedOnCurrentPage.length > 0 ? selectedOnCurrentPage.length : selectedIds.length) - 10} karyawan lainnya
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tidak, Batalkan (No)
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  Ya, Hapus ({selectedOnCurrentPage.length > 0 ? selectedOnCurrentPage.length : selectedIds.length}) Data (Yes)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Akhiri Kontrak Karyawan Lewat Tanggal (Migrasi Data) */}
      {isBulkTerminateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-100 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-2xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-gray-900 text-base">
                      Akhiri Kontrak Karyawan Lewat Tanggal
                    </h3>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-bold border border-amber-300">
                      Status Migrasi
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Perbarui status kepegawaian menjadi <strong>SELESAI</strong> secara massal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkTerminateModalOpen(false)}
                disabled={isTerminatingBulk}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Banner */}
            <div className="p-3 bg-red-50/80 rounded-xl border border-red-200 text-xs text-red-950 shrink-0 space-y-1">
              <p className="font-bold">
                ⚠️ Ditemukan {expiredMigrationEmployees.length} karyawan aktif yang masa kontraknya telah terlewati:
              </p>
              <p className="text-[11px] text-red-800 leading-relaxed">
                Karena data saat ini berstatus <strong>migrasi</strong>, Anda dapat mengakhiri masa kontrak seluruh karyawan yang tanggal kontraknya sudah lewat. Status karyawan akan diperbarui menjadi <strong>SELESAI</strong> dan tercatat rapi di database.
              </p>
            </div>

            {/* Quick Filter / Search within Modal */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIK di daftar ini..."
                  value={bulkTerminateSearch}
                  onChange={(e) => setBulkTerminateSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedBulkTerminateIds(expiredMigrationEmployees.map(e => e.id))}
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Pilih Semua ({expiredMigrationEmployees.length})
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedBulkTerminateIds([])}
                  className="text-gray-500 hover:underline cursor-pointer"
                >
                  Batal Pilih
                </button>
              </div>
            </div>

            {/* Table of Expired Employees */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64">
              {expiredMigrationEmployees
                .filter(emp => 
                  emp.nama.toLowerCase().includes(bulkTerminateSearch.toLowerCase()) ||
                  emp.noKtp.includes(bulkTerminateSearch)
                )
                .map((emp, idx) => {
                  const end = emp.akhirK6 || emp.akhirK5 || emp.akhirK4 || emp.akhirK3 || emp.akhirK2 || emp.akhirK1;
                  const days = getDaysRemaining(end);
                  const isChecked = selectedBulkTerminateIds.includes(emp.id);

                  return (
                    <div 
                      key={emp.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedBulkTerminateIds(prev => prev.filter(id => id !== emp.id));
                        } else {
                          setSelectedBulkTerminateIds(prev => [...prev, emp.id]);
                        }
                      }}
                      className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-red-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-red-600 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-gray-900 uppercase flex items-center gap-1.5">
                            <span>{emp.nama}</span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9.5px] font-bold">
                              {emp.currentContractPhase || 'K1'}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            NIK: {emp.noKtp} • {emp.project || emp.jabatan || 'PKWT'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-gray-800 text-[11px]">
                          Akhir: {end || '-'}
                        </div>
                        <div className="text-[10px] font-bold text-red-700">
                          Lewat {Math.abs(days || 0)} hari lalu
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 shrink-0">
              <span className="text-xs text-gray-600">
                <strong>{selectedBulkTerminateIds.length}</strong> karyawan dipilih untuk diakhiri kontraknya
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkTerminateModalOpen(false)}
                  disabled={isTerminatingBulk}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkTerminate}
                  disabled={isTerminatingBulk || selectedBulkTerminateIds.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  {isTerminatingBulk ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Konfirmasi Akhiri Kontrak ({selectedBulkTerminateIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isImportPreviewOpen && (
        <ExcelImportPreviewModal
          isOpen={isImportPreviewOpen}
          onClose={() => {
            setIsImportPreviewOpen(false);
            setParsedExcelItems([]);
          }}
          fileName={importFileName}
          initialItems={parsedExcelItems}
          existingEmployees={employees}
          onConfirmImport={handleConfirmExcelImport}
        />
      )}

      {/* Loading Progress Modal saat Penghapusan Data Karyawan (Sama seperti tampilan Import Excel) */}
      {deleteProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-rose-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Decorative Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500" />

            {/* Animated Icon Ring */}
            <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-rose-100 animate-ping opacity-30" />
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
                <Trash2 className="w-8 h-8 animate-pulse text-rose-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md animate-spin">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Menghapus Data dari Database...
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Memproses penghapusan data karyawan secara permanen
            </p>

            {/* Big Prominent Percentage Number */}
            <div className="my-5 flex flex-col items-center">
              <span className="text-5xl font-black font-mono tracking-tight text-rose-600">
                {deleteProgress.percent}%
              </span>
              <span className="text-xs font-semibold text-slate-600 mt-1.5">
                {deleteProgress.current} dari {deleteProgress.total} Data Karyawan
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 rounded-full transition-all duration-300 ease-out shadow-xs"
                style={{ width: `${deleteProgress.percent}%` }}
              />
            </div>

            {/* Currently Processing Info */}
            <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-left">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Sedang Menghapus:
              </div>
              <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                {deleteProgress.currentName || 'Menyiapkan data...'}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 italic">
              Harap jangan menutup browser selama proses penghapusan data berlangsung.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

