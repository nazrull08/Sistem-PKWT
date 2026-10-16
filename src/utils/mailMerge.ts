import { Employee, ContractDocumentData, ContractPhase, PaklaringDocumentData, MasterDataSettings } from '../types';
import { terbilang } from './terbilang';
import { parseAnyDate } from './date';
import { 
  getLocalEmployees, 
  DEFAULT_MASTER_DATA, 
  getMasterDataSettings, 
  saveMasterDataSettings, 
  recordIssuedSequence, 
  extractNoUrutFromSurat 
} from '../services/db';

export { DEFAULT_MASTER_DATA, getMasterDataSettings, saveMasterDataSettings, recordIssuedSequence, extractNoUrutFromSurat };

export interface CompanySettings {
  namaPerusahaan: string;
  wakilPerusahaan: string;
  jabatanWakil: string;
  alamatKop1: string;
  alamatKop2: string;
  alamatKop3: string;
  telpKop: string;
  faxKop: string;
  kotaTtd: string;
  logoPerusahaanUrl?: string; // Master logo upload
  logoIsoUrl?: string;        // Master ISO logo upload
  ttdDirekturUrl?: string;    // Master TTD Direktur upload
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  namaPerusahaan: 'PT. ANDHANA KIRANA YASA',
  wakilPerusahaan: 'GIMMY KURNIAWAN IMANTO',
  jabatanWakil: 'Direktur Perusahaan',
  alamatKop1: 'Bukit Gading Raya Blok N No. 11',
  alamatKop2: 'Kelapa Gading Barat – Kelapa Gading',
  alamatKop3: 'Jakarta Utara - 14240',
  telpKop: '021 - 4516027',
  faxKop: '021 - 45852414',
  kotaTtd: 'Jakarta'
};

export function getSavedCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem('aky_master_company_settings_v3');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_COMPANY_SETTINGS;
}

export function saveCompanySettings(settings: CompanySettings) {
  try {
    localStorage.setItem('aky_master_company_settings_v3', JSON.stringify(settings));
  } catch (e) {
    console.error(e);
  }
}

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const PHASE_TO_ROMAN: Record<ContractPhase, string> = {
  'K1': 'I',
  'K2': 'II',
  'K3': 'III',
  'K4': 'IV',
  'K5': 'V',
  'K6': 'VI',
  'PKWTT': 'PKWTT'
};

/**
 * Detect all filled contract phases for an employee based on No Surat or Awal/Akhir dates
 */
export function getAvailableContractPhases(emp: Employee): ContractPhase[] {
  const list: ContractPhase[] = ['K1'];
  if (emp.awalK2 || emp.akhirK2 || emp.noSurat2) list.push('K2');
  if (emp.awalK3 || emp.akhirK3 || emp.noSurat3) list.push('K3');
  if (emp.awalK4 || emp.akhirK4 || emp.noSurat4) list.push('K4');
  if (emp.awalK5 || emp.akhirK5 || emp.noSurat5) list.push('K5');
  if (emp.awalK6 || emp.akhirK6 || emp.noSurat6) list.push('K6');
  if (emp.statusKaryawan === 'PKWTT') list.push('PKWTT');
  return list;
}

/**
 * Detect the latest filled contract phase based on database columns
 */
export function getLatestFilledPhase(emp: Employee): ContractPhase {
  if (emp.statusKaryawan === 'PKWTT') return 'PKWTT';
  if (emp.awalK6 || emp.akhirK6 || emp.noSurat6) return 'K6';
  if (emp.awalK5 || emp.akhirK5 || emp.noSurat5) return 'K5';
  if (emp.awalK4 || emp.akhirK4 || emp.noSurat4) return 'K4';
  if (emp.awalK3 || emp.akhirK3 || emp.noSurat3) return 'K3';
  if (emp.awalK2 || emp.akhirK2 || emp.noSurat2) return 'K2';
  return 'K1';
}

/**
 * Determine the next contract phase for extension
 */
export function getNextContractPhase(current: ContractPhase): ContractPhase | null {
  switch (current) {
    case 'K1': return 'K2';
    case 'K2': return 'K3';
    case 'K3': return 'K4';
    case 'K4': return 'K5';
    case 'K5': return 'K6';
    default: return null;
  }
}



/**
 * Determine the next incremental sequence number across all employees and contracts.
 * Scans provided employees, local database storage, and master data settings.
 * Returns next sequence number (e.g. 262 -> 263).
 */
export function getNextAvailableNoUrut(employees?: Employee[]): number {
  const master = getMasterDataSettings();
  let maxNo = master.lastSequenceNumber || 0;

  // Use provided employees, or fallback to local database employees
  const employeeList = (employees && employees.length > 0) ? employees : getLocalEmployees();

  if (employeeList && employeeList.length > 0) {
    for (const emp of employeeList) {
      if (typeof emp.no === 'number' && !isNaN(emp.no) && emp.no > maxNo) {
        maxNo = emp.no;
      }
      const suratList = [
        emp.noSurat1, 
        emp.noSurat2, 
        emp.noSurat3, 
        emp.noSurat4, 
        emp.noSurat5, 
        emp.noSurat6
      ];
      for (const s of suratList) {
        const extracted = extractNoUrutFromSurat(s);
        if (extracted) {
          const num = parseInt(extracted, 10);
          if (!isNaN(num) && num > maxNo) {
            maxNo = num;
          }
        }
      }
    }
  }

  return maxNo + 1;
}

/**
 * Auto-generate official Nomor Surat with exact formula:
 * [No urut(autocounting)]/AKY-HRD/PKWT-(Romawi Kontrak)-(Bulan Romawi)/(Tahun)
 * Example: 001/AKY-HRD/PKWT-I/VI/2025 or 006/AKY-HRD/PKWT-II/XII/2025
 * Konsep: Mau buat baru ataupun perpanjangan, No Urut selalu bertambah 1 mengikuti nomor terakhir kontrak perusahaan.
 */
export function formatAutoNoSurat(
  noUrutOrPrev: number | string,
  phase: ContractPhase,
  dateContext?: string,
  _legacyPrevSurat?: string
): string {
  let padNo = '001';

  if (typeof noUrutOrPrev === 'number') {
    padNo = noUrutOrPrev.toString().padStart(3, '0');
  } else if (typeof noUrutOrPrev === 'string') {
    if (noUrutOrPrev.includes('/')) {
      const extracted = extractNoUrutFromSurat(noUrutOrPrev);
      padNo = extracted || '001';
    } else if (/^\d+$/.test(noUrutOrPrev.trim())) {
      padNo = noUrutOrPrev.trim().padStart(3, '0');
    } else {
      padNo = (parseInt(noUrutOrPrev, 10) || 1).toString().padStart(3, '0');
    }
  }

  const phaseRoman = PHASE_TO_ROMAN[phase] || 'I';

  const now = new Date();
  let monthRoman = ROMAN_MONTHS[now.getMonth()] || 'X';
  let year = now.getFullYear().toString();

  if (dateContext) {
    const parsed = parseAnyDate(dateContext);
    if (parsed) {
      monthRoman = ROMAN_MONTHS[parsed.getMonth()] || monthRoman;
      year = parsed.getFullYear().toString();
    }
  }

  const master = getMasterDataSettings();
  const kodeDivisi = master.kodeDivisi || 'AKY-HRD';

  return `${padNo}/${kodeDivisi}/PKWT-${phaseRoman}/${monthRoman}/${year}`;
}

export function generatePaklaringData(
  emp: Employee,
  settings: CompanySettings = getSavedCompanySettings(),
  alasan: string = 'Masa Kontrak Kerja Berakhir (Selesai PKWT)'
): PaklaringDocumentData {
  const padNo = (emp.no || 1).toString().padStart(3, '0');
  const now = new Date();
  const monthRoman = ROMAN_MONTHS[now.getMonth()];
  const year = now.getFullYear().toString();
  const nomorSurat = `${padNo}/AKY-HRD/SKK/${monthRoman}/${year}`;

  const periodeAwal = emp.awalK1 || '01 Januari 2025';
  const periodeAkhir = emp.akhirK6 || emp.akhirK5 || emp.akhirK4 || emp.akhirK3 || emp.akhirK2 || emp.akhirK1 || '31 Desember 2025';

  const BULAN_INDONESIA = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const tanggalCetak = `${now.getDate()} ${BULAN_INDONESIA[now.getMonth()]} ${year}`;

  return {
    id: `paklaring-${emp.id}`,
    employeeId: emp.id,
    nomorSurat,
    namaKaryawan: emp.nama,
    nikKaryawan: emp.noKtp,
    alamatKaryawan: emp.alamat,
    jabatanTerakhir: emp.jabatan || 'Operator',
    lokasiKerja: emp.lokasiKerja || 'Jakarta',
    periodeAwal,
    periodeAkhir,
    alasanBerakhir: alasan,
    tanggalCetak,
    tempatCetak: emp.lokasiKerja || settings.kotaTtd || 'Jakarta',
    namaDirektur: settings.wakilPerusahaan || 'GIMMY KURNIAWAN IMANTO',
    jabatanDirektur: settings.jabatanWakil || 'Direktur Perusahaan'
  };
}

export function mergeEmployeeToContract(
  emp: Employee,
  settings: CompanySettings = getSavedCompanySettings(),
  forcedPhase?: ContractPhase,
  forceInitial?: boolean
): ContractDocumentData {
  // Determine contract phase: if forcedPhase is passed use it, otherwise check filled columns automatically
  let phase: ContractPhase = forcedPhase || getLatestFilledPhase(emp);

  // Automatic template detection: K1 is always Initial Template, K2..K6 is always Extension Template!
  const isInitialContract = forceInitial !== undefined 
    ? forceInitial 
    : (phase === 'K1');


  // Dates and previous contract reference
  let tanggalMulai = '01 Oktober 2026';
  let tanggalSelesai = '30 Juni 2027';
  let tanggalTtd = '28 September 2026';

  let nomorSuratSebelumnya: string | undefined = undefined;
  let tanggalSuratSebelumnya: string | undefined = undefined;
  let periodeAwalSebelumnya: string | undefined = undefined;
  let periodeAkhirSebelumnya: string | undefined = undefined;
  let nomorSuratCurrent: string = '';

  if (phase === 'K6') {
    tanggalMulai = emp.awalK6 || '01 Januari 2029';
    tanggalSelesai = emp.akhirK6 || '31 Desember 2029';
    tanggalTtd = emp.ttd6 || '25 Desember 2028';
    nomorSuratCurrent = emp.noSurat6 || formatAutoNoSurat(emp.no, 'K6', tanggalMulai);

    nomorSuratSebelumnya = emp.noSurat5 || formatAutoNoSurat(emp.no, 'K5', emp.awalK5);
    tanggalSuratSebelumnya = emp.ttd5 || emp.awalK5;
    periodeAwalSebelumnya = emp.awalK5;
    periodeAkhirSebelumnya = emp.akhirK5;
  } else if (phase === 'K5') {
    tanggalMulai = emp.awalK5 || '01 April 2028';
    tanggalSelesai = emp.akhirK5 || '31 Desember 2028';
    tanggalTtd = emp.ttd5 || '25 Maret 2028';
    nomorSuratCurrent = emp.noSurat5 || formatAutoNoSurat(emp.no, 'K5', tanggalMulai);

    nomorSuratSebelumnya = emp.noSurat4 || formatAutoNoSurat(emp.no, 'K4', emp.awalK4);
    tanggalSuratSebelumnya = emp.ttd4 || emp.awalK4;
    periodeAwalSebelumnya = emp.awalK4;
    periodeAkhirSebelumnya = emp.akhirK4;
  } else if (phase === 'K4') {
    tanggalMulai = emp.awalK4 || '01 Juli 2027';
    tanggalSelesai = emp.akhirK4 || '31 Maret 2028';
    tanggalTtd = emp.ttd4 || '25 Juni 2027';
    nomorSuratCurrent = emp.noSurat4 || formatAutoNoSurat(emp.no, 'K4', tanggalMulai);

    nomorSuratSebelumnya = emp.noSurat3 || formatAutoNoSurat(emp.no, 'K3', emp.awalK3);
    tanggalSuratSebelumnya = emp.ttd3 || emp.awalK3;
    periodeAwalSebelumnya = emp.awalK3;
    periodeAkhirSebelumnya = emp.akhirK3;
  } else if (phase === 'K3') {
    tanggalMulai = emp.awalK3 || emp.awalK2 || '01 Oktober 2026';
    tanggalSelesai = emp.akhirK3 || '30 Juni 2027';
    tanggalTtd = emp.ttd3 || emp.ttd2 || '28 September 2026';
    nomorSuratCurrent = emp.noSurat3 || emp.noSurat2 || formatAutoNoSurat(emp.no, 'K3', tanggalMulai);

    nomorSuratSebelumnya = emp.noSurat2 || emp.noSurat1 || formatAutoNoSurat(emp.no, 'K2', emp.awalK2);
    tanggalSuratSebelumnya = emp.ttd2 || emp.awalK2 || '01 April 2026';
    periodeAwalSebelumnya = emp.awalK2 || '01 April 2026';
    periodeAkhirSebelumnya = emp.akhirK2 || '30 September 2026';
  } else if (phase === 'K2') {
    tanggalMulai = emp.awalK2 || '25 Desember 2025';
    tanggalSelesai = emp.akhirK2 || '30 Maret 2026';
    tanggalTtd = emp.ttd2 || '22 Desember 2025';
    nomorSuratCurrent = emp.noSurat2 || formatAutoNoSurat(emp.no, 'K2', tanggalMulai);

    nomorSuratSebelumnya = emp.noSurat1 || formatAutoNoSurat(emp.no, 'K1', emp.awalK1);
    tanggalSuratSebelumnya = emp.ttd1 || emp.awalK1 || '22 Desember 2025';
    periodeAwalSebelumnya = emp.awalK1 || '24 Desember 2025';
    periodeAkhirSebelumnya = emp.akhirK1 || '25 Juni 2025';
  } else {
    // K1 (Kontrak 1 Awal / Baru)
    tanggalMulai = emp.awalK1 || '24 Desember 2025';
    tanggalSelesai = emp.akhirK1 || '25 Juni 2025';
    tanggalTtd = emp.ttd1 || '22 Desember 2025';
    nomorSuratCurrent = emp.noSurat1 || formatAutoNoSurat(emp.no, 'K1', tanggalMulai);
  }

  const nominalUpah = emp.upah || 5625883;
  const ketUpah = emp.ketUpah ? emp.ketUpah.replace(/^\(|\)$/g, '').trim() : terbilang(nominalUpah);


  return {
    id: `contract-merge-${emp.id}-${phase}`,
    employeeId: emp.id,
    nomorSurat: nomorSuratCurrent,
    nomorSuratSebelumnya: !isInitialContract ? nomorSuratSebelumnya : undefined,
    tanggalSuratSebelumnya: !isInitialContract ? tanggalSuratSebelumnya : undefined,
    periodeAwalSebelumnya: !isInitialContract ? periodeAwalSebelumnya : undefined,
    periodeAkhirSebelumnya: !isInitialContract ? periodeAkhirSebelumnya : undefined,
    jenisPerjanjian: emp.statusKaryawan === 'PKWTT' ? 'PKWTT' : 'PKWT',
    phase,
    isInitialContract,

    // Pihak Pertama
    namaPihakPertama: settings.namaPerusahaan,
    wakilPihakPertama: settings.wakilPerusahaan,
    jabatanPihakPertama: settings.jabatanWakil,
    alamatPihakPertama: `${settings.alamatKop1}, ${settings.alamatKop2}, ${settings.alamatKop3}`,
    telpPihakPertama: settings.telpKop,
    faxPihakPertama: settings.faxKop,
    logoPerusahaanUrl: settings.logoPerusahaanUrl,
    logoIsoUrl: settings.logoIsoUrl,

    // Pihak Kedua
    namaKaryawan: emp.nama,
    nikKaryawan: emp.noKtp,
    tempatTanggalLahir: `${emp.tempatLahir} , ${emp.tanggalLahir}`,
    jenisKelamin: emp.jenisKelamin || 'Laki-Laki',
    alamatKaryawan: emp.alamat,

    // Klausul Kerja
    jabatanKaryawan: emp.jabatan || 'Operator',
    golonganJabatan: emp.golongan || '0A',
    tanggalMulai,
    tanggalSelesai,
    masaKontrak: emp.masaKontrak || '3 Bulan',
    upah: nominalUpah,
    ketUpah,
    namaBank: emp.bank || 'BCA',
    noRekening: emp.noRekening || '5745940924',
    atasNamaRekening: emp.nama,

    // Penandatanganan
    tempatTtd: emp.lokasiKerja || settings.kotaTtd,
    tanggalTtd,
    ttdKaryawan: emp.ttdKaryawanUrl,
    ttdPerusahaan: settings.ttdDirekturUrl,
    statusTtd: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
