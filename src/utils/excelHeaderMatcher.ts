/**
 * Excel Header Matcher & Validator for Database Karyawan
 * Ensures uploaded Excel sheets match expected employee database table headers,
 * preventing wrong tables from being imported and incorrectly mapped into the database.
 */

export interface HeaderAnalysisResult {
  isValidHeader: boolean;
  headerRowIndex: number;
  detectedHeaders: string[];
  matchedFields: Record<string, number>; // fieldName -> columnIndex
  matchedFieldNames: Record<string, string>; // fieldName -> original Excel header label
  unrecognizedHeaders: string[];
  missingRequiredFields: string[];
  errorMessage?: string;
  isTemplateFormat: boolean;
}

// Normalized alias synonyms for every Database Karyawan field
const FIELD_ALIASES: Record<string, string[]> = {
  nama: ['NAMA', 'NAMA KARYAWAN', 'NAMA LENGKAP', 'EMPLOYEE NAME', 'NAMA PEGAWAI', 'NAME', 'NAMA TENAGA KERJA'],
  noKtp: ['NO. KTP', 'NO KTP', 'NIK', 'KTP', 'NOMOR KTP', 'NO_KTP', 'NO.KTP', 'NO KTP / NIK', 'NO IDENTITAS'],
  project: ['PROJECT', 'PROYEK', 'NAMA PROJECT', 'DIVISI', 'PENEMPATAN PROJECT', 'PENEMPATAN', 'UNIT KERJA', 'CLIENT'],
  lokasiKerja: ['LOKASI KERJA', 'LOKASI', 'TEMPAT KERJA', 'LOKASI PENEMPATAN', 'PENEMPATAN KERJA', 'AREA KERJA'],
  masaKontrak: ['MASA KONTRAK', 'DURASI KONTRAK', 'MASA', 'DURASI', 'JANGKA WAKTU', 'PERIODE KONTRAK'],
  ketUpah: ['KET UPAH', 'KET. UPAH', 'KETERANGAN UPAH', 'TERBILANG UPAH', 'KET GAJI'],
  upah: ['UPAH', 'GAJI', 'SALARY', 'NOMINAL UPAH', 'BASIC SALARY', 'BASIC', 'UPAH POKOK', 'GAJI POKOK'],
  tempatLahir: ['TEMPAT', 'TEMPAT LAHIR', 'KOTA LAHIR', 'TMP LAHIR'],
  tanggalLahir: ['TANGGAL LAHIR', 'TGL LAHIR', 'DOB', 'TGL. LAHIR', 'TGL_LAHIR', 'DATE OF BIRTH'],
  alamat: ['ALAMAT', 'ALAMAT LENGKAP', 'DOMISILI', 'ALAMAT KTP', 'ALAMAT TINGGAL'],
  noRekening: ['NO REKENING', 'NO. REKENING', 'REKENING', 'NO REK', 'NO. REK', 'BANK ACCOUNT', 'NOMOR REKENING'],
  bank: ['BANK', 'NAMA BANK'],
  jabatan: ['JABATAN', 'POSISI', 'POSITION', 'ROLE'],
  golongan: ['GOLONGAN', 'GOL'],
  jenisKelamin: ['JENIS KELAMIN', 'GENDER', 'JK', 'L/P', 'SEX'],
  noHp: ['NO HP', 'NO. HP', 'TELEPON', 'NO TELEPON', 'HP', 'PHONE', 'NO WA', 'WHATSAPP'],
  email: ['EMAIL', 'E-MAIL', 'SUREL'],

  // Contract numbers
  noSurat1: ['NO SURAT 1', 'NO. SURAT 1', 'NO SURAT K1', 'SURAT 1', 'NOMOR SURAT 1'],
  noSurat2: ['NO SURAT 2', 'NO. SURAT 2', 'NO SURAT K2', 'SURAT 2', 'NOMOR SURAT 2'],
  noSurat3: ['NO SURAT 3', 'NO. SURAT 3', 'NO SURAT K3', 'SURAT 3', 'NOMOR SURAT 3'],
  noSurat4: ['NO SURAT 4', 'NO. SURAT 4', 'NO SURAT K4', 'SURAT 4', 'NOMOR SURAT 4'],
  noSurat5: ['NO SURAT 5', 'NO. SURAT 5', 'NO SURAT K5', 'SURAT 5', 'NOMOR SURAT 5'],
  noSurat6: ['NO SURAT 6', 'NO. SURAT 6', 'NO SURAT K6', 'SURAT 6', 'NOMOR SURAT 6'],

  // Contract dates
  awalK1: ['AWAL K1', 'AWAL_K1', 'MULAI K1', 'TGL AWAL K1', 'K1 AWAL', 'MULAI KONTRAK 1'],
  akhirK1: ['AKHIR K1', 'AKHIR_K1', 'SELESAI K1', 'TGL AKHIR K1', 'K1 AKHIR', 'SELESAI KONTRAK 1'],
  ttd1: ['TTD1', 'TTD 1', 'TANGGAL TTD 1', 'TGL TTD 1'],

  awalK2: ['AWAL K2', 'AWAL_K2', 'MULAI K2', 'TGL AWAL K2', 'K2 AWAL'],
  akhirK2: ['AKHIR K2', 'AKHIR_K2', 'SELESAI K2', 'TGL AKHIR K2', 'K2 AKHIR'],
  ttd2: ['TTD2', 'TTD 2', 'TGL TTD 2'],

  awalK3: ['AWAL K3', 'AWAL_K3', 'MULAI K3', 'TGL AWAL K3', 'K3 AWAL'],
  akhirK3: ['AKHIR K3', 'AKHIR_K3', 'SELESAI K3', 'TGL AKHIR K3', 'K3 AKHIR'],
  ttd3: ['TTD3', 'TTD 3', 'TGL TTD 3'],

  awalK4: ['AWAL K4', 'AWAL_K4', 'MULAI K4'],
  akhirK4: ['AKHIR K4', 'AKHIR_K4', 'SELESAI K4'],
  ttd4: ['TTD4', 'TTD 4'],

  awalK5: ['AWAL K5', 'AWAL_K5', 'MULAI K5'],
  akhirK5: ['AKHIR K5', 'AKHIR_K5', 'SELESAI K5'],
  ttd5: ['TTD5', 'TTD 5'],

  awalK6: ['AWAL K6', 'AWAL_K6', 'MULAI K6'],
  akhirK6: ['AKHIR K6', 'AKHIR_K6', 'SELESAI K6'],
  ttd6: ['TTD6', 'TTD 6'],

  noUrut: ['NO', 'NO.', 'NO URUT', 'NOMOR', 'URUT']
};

/**
 * Clean & normalize a string header for comparison
 */
function normalizeHeaderStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[._\-]/g, ' ')
    .trim();
}

/**
 * Scan first rows to find the most probable header row index
 */
export function findHeaderRowIndex(rawRows: any[][]): number {
  let bestRowIdx = 0;
  let maxScore = -1;

  const maxScanRows = Math.min(rawRows.length, 6);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    const normalizedCols = row.map(normalizeHeaderStr);

    for (const col of normalizedCols) {
      if (!col) continue;
      for (const [, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.some(alias => normalizeHeaderStr(alias) === col || col.includes(normalizeHeaderStr(alias)))) {
          score += 2;
          break;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestRowIdx = r;
    }
  }

  return bestRowIdx;
}

/**
 * Validate and map Excel headers to database columns
 */
export function analyzeExcelHeaders(headerRow: any[], headerRowIndex: number = 0): HeaderAnalysisResult {
  const detectedHeaders: string[] = headerRow.map(c => String(c ?? '').trim());
  const normalizedHeaders = detectedHeaders.map(normalizeHeaderStr);

  const matchedFields: Record<string, number> = {};
  const matchedFieldNames: Record<string, string> = {};
  const unrecognizedHeaders: string[] = [];

  // Map each header column to a known database field
  normalizedHeaders.forEach((normHeader, colIdx) => {
    if (!normHeader) return;

    let matchedFieldKey: string | null = null;

    // Direct match against known aliases
    for (const [fieldKey, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some(alias => normalizeHeaderStr(alias) === normHeader)) {
        matchedFieldKey = fieldKey;
        break;
      }
    }

    // Secondary partial matching if not direct match
    if (!matchedFieldKey) {
      for (const [fieldKey, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.some(alias => normHeader.includes(normalizeHeaderStr(alias)))) {
          matchedFieldKey = fieldKey;
          break;
        }
      }
    }

    if (matchedFieldKey && matchedFields[matchedFieldKey] === undefined) {
      matchedFields[matchedFieldKey] = colIdx;
      matchedFieldNames[matchedFieldKey] = detectedHeaders[colIdx];
    } else if (!matchedFieldKey) {
      unrecognizedHeaders.push(detectedHeaders[colIdx] || `Kolom ${colIdx + 1}`);
    }
  });

  // Check required fields
  const missingRequiredFields: string[] = [];
  
  // NAMA is strictly mandatory
  if (matchedFields['nama'] === undefined) {
    missingRequiredFields.push('NAMA / NAMA KARYAWAN');
  }

  // Must have at least NIK/KTP OR PROJECT OR AWAL K1 to confirm it is indeed an employee table
  const secondaryIdentifiers = ['noKtp', 'project', 'lokasiKerja', 'awalK1', 'masaKontrak', 'upah'];
  const matchedSecondaryCount = secondaryIdentifiers.filter(f => matchedFields[f] !== undefined).length;

  const totalMatchedCount = Object.keys(matchedFields).length;

  // Validation verdict
  let isValidHeader = true;
  let errorMessage: string | undefined = undefined;

  if (matchedFields['nama'] === undefined) {
    isValidHeader = false;
    errorMessage = 'Header tabel tidak sesuai: Kolom "NAMA / NAMA KARYAWAN" tidak ditemukan. Pastikan Anda mengunggah file template Database Karyawan yang benar.';
  } else if (matchedSecondaryCount === 0 && totalMatchedCount < 2) {
    isValidHeader = false;
    errorMessage = 'Tabel yang diunggah tidak dikenali sebagai Database Karyawan. Hanya kolom nama yang terdeteksi, kolom identitas karyawan lain (NIK, Project, dsb) tidak ada.';
  }

  // Check if it matches the standard 30+ column template exported by system
  const isTemplateFormat = totalMatchedCount >= 10 && matchedFields['nama'] !== undefined;

  return {
    isValidHeader,
    headerRowIndex,
    detectedHeaders,
    matchedFields,
    matchedFieldNames,
    unrecognizedHeaders,
    missingRequiredFields,
    errorMessage,
    isTemplateFormat
  };
}
