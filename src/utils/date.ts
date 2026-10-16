/**
 * Indonesian date parsing and formatting utilities
 * Strictly formats import & export dates to "dd MMMM yyyy" (e.g., "01 Januari 2026")
 */

export const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_ALIASES: Record<string, number> = {
  // Indonesian full & abbreviations
  'januari': 0, 'jan': 0,
  'februari': 1, 'feb': 1, 'pebruari': 1, 'peb': 1,
  'maret': 2, 'mar': 2,
  'april': 3, 'apr': 3,
  'mei': 4, 'may': 4,
  'juni': 5, 'jun': 5, 'june': 5,
  'juli': 6, 'jul': 6, 'july': 6,
  'agustus': 7, 'agu': 7, 'ags': 7, 'agt': 7, 'august': 7, 'aug': 7,
  'september': 8, 'sep': 8, 'sept': 8,
  'oktober': 9, 'okt': 9, 'october': 9, 'oct': 9,
  'november': 10, 'nov': 10, 'nopember': 10, 'nop': 10,
  'desember': 11, 'des': 11, 'december': 11, 'dec': 11,
  // English full & abbreviations
  'january': 0,
  'february': 1,
  'march': 2,
};

/**
 * Converts an Excel serial date number (e.g. 45292, 46023) to a local midday Date object.
 * Using UTC components from epoch prevents timezone shifts (e.g. California -07:00 rolling back 1 day).
 */
export function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  const temp = new Date(utcMs);
  const y = temp.getUTCFullYear();
  const m = temp.getUTCMonth();
  const d = temp.getUTCDate();
  return new Date(y, m, d, 12, 0, 0);
}

/**
 * Universal date parser that handles:
 * - Excel date serial numbers (both number and string like "46023")
 * - JS Date objects (including UTC dates from SheetJS)
 * - ISO strings (YYYY-MM-DD)
 * - Indonesian / DMY formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
 * - US format fallback (MM/DD/YYYY when month > 12)
 * - Textual Indonesian & English dates (e.g. "01 Januari 2026", "1-Jan-2026", "31 Des 2025")
 * - Leading single quote/apostrophe stripping (e.g. "'01/01/2026")
 */
export function parseAnyDate(dateInput: Date | string | number | null | undefined): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;

  // 1. Direct Date instance
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    // If midnight UTC from SheetJS or serialization, normalize to midday local
    if (dateInput.getUTCHours() === 0 && dateInput.getUTCMinutes() === 0 && dateInput.getUTCSeconds() === 0) {
      return new Date(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate(), 12, 0, 0);
    }
    return dateInput;
  }

  // 2. Pure number input
  if (typeof dateInput === 'number') {
    if (dateInput > 20000 && dateInput < 75000) {
      return excelSerialToDate(dateInput);
    }
    if (dateInput > 100000000000) {
      return new Date(dateInput);
    }
    return null;
  }

  // 3. String input
  let str = String(dateInput).trim();
  // Strip leading & trailing quotes, backticks, and apostrophes
  str = str.replace(/^['"`\u2018\u2019\u201A\u201B\u2032]+/, '').replace(/['"`\u2018\u2019\u201A\u201B\u2032]+$/, '').trim();
  if (!str) return null;

  // Handle Excel serial date numbers as strings, e.g. "45000" or "45000.0"
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str);
    if (serial > 20000 && serial < 75000) {
      return excelSerialToDate(serial);
    }
  }

  // Standard ISO or YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const res = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(res.getTime())) return res;
  }

  // Try DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const num1 = parseInt(dmyMatch[1], 10);
    const num2 = parseInt(dmyMatch[2], 10);
    let day = num1;
    let month = num2 - 1;

    // Detect if MM/DD/YYYY was provided (e.g. 03/31/2026)
    if (num1 <= 12 && num2 > 12) {
      day = num2;
      month = num1 - 1;
    }

    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += (year < 50 ? 2000 : 1900);
    }
    const res = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(res.getTime())) return res;
  }

  // Try textual date e.g. "25 Juni 2025", "01 April 2026", "25-Jun-2025", "Januari 15 2026"
  const cleanTokens = str
    .replace(/[,.]/g, ' ')
    .replace(/[-/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (cleanTokens.length >= 3) {
    let day: number | undefined;
    let month: number | undefined;
    let year: number | undefined;

    // Pattern A: [Day, MonthName, Year] e.g. "01 Januari 2026"
    const monthKey1 = cleanTokens[1].toLowerCase();
    if (MONTH_ALIASES[monthKey1] !== undefined) {
      day = parseInt(cleanTokens[0], 10);
      month = MONTH_ALIASES[monthKey1];
      year = parseInt(cleanTokens[2], 10);
    }

    // Pattern B: [MonthName, Day, Year] e.g. "Januari 01 2026"
    if (month === undefined) {
      const monthKey0 = cleanTokens[0].toLowerCase();
      if (MONTH_ALIASES[monthKey0] !== undefined) {
        month = MONTH_ALIASES[monthKey0];
        day = parseInt(cleanTokens[1], 10);
        year = parseInt(cleanTokens[2], 10);
      }
    }

    // Pattern C: [Year, MonthName, Day] e.g. "2026 Januari 01"
    if (month === undefined && cleanTokens[0].length === 4) {
      const monthKey1 = cleanTokens[1].toLowerCase();
      if (MONTH_ALIASES[monthKey1] !== undefined) {
        year = parseInt(cleanTokens[0], 10);
        month = MONTH_ALIASES[monthKey1];
        day = parseInt(cleanTokens[2], 10);
      }
    }

    if (day !== undefined && month !== undefined && year !== undefined && !isNaN(day) && !isNaN(year)) {
      if (year < 100) year += (year < 50 ? 2000 : 1900);
      const res = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(res.getTime())) return res;
    }
  }

  // Fallback to JS Date constructor
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

/**
 * Format date strictly as "dd MMMM yyyy" in Indonesian:
 * - dd: Two-digit day with leading zero (01..31)
 * - MMMM: Full Indonesian month name (Januari..Desember)
 * - yyyy: 4-digit year (e.g. 2026)
 *
 * Example outputs:
 * - "01 Januari 2026"
 * - "31 Maret 2026"
 * - "15 Mei 1995"
 */
export function formatTanggalIndonesia(dateInput: Date | string | number | null | undefined): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') return '';

  const parsed = parseAnyDate(dateInput);
  if (!parsed || isNaN(parsed.getTime())) {
    return typeof dateInput === 'string' ? dateInput.trim() : '';
  }

  const day = parsed.getDate().toString().padStart(2, '0');
  const month = BULAN_INDONESIA[parsed.getMonth()];
  const year = parsed.getFullYear();
  return `${day} ${month} ${year}`;
}

export function dateToISODate(dateStrOrDate: Date | string | number | null | undefined): string {
  if (!dateStrOrDate) return '';
  const d = parseAnyDate(dateStrOrDate);
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysToDate(dateStrOrDate: Date | string | number | null | undefined, days: number): string {
  const d = parseAnyDate(dateStrOrDate);
  if (!d || isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return formatTanggalIndonesia(d);
}

export function addMonthsToDate(dateStrOrDate: Date | string | number | null | undefined, months: number): string {
  const d = parseAnyDate(dateStrOrDate);
  if (!d || isNaN(d.getTime())) return '';
  
  // Calculate end of duration (standard contract rule: ends 1 day before the next period starts)
  const target = new Date(d.getFullYear(), d.getMonth() + months, d.getDate() - 1, 12, 0, 0);
  return formatTanggalIndonesia(target);
}

export function getDaysRemaining(endDateStr?: string): number | null {
  if (!endDateStr) return null;
  const endDate = parseAnyDate(endDateStr);
  if (!endDate) return null;

  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getExpirationStatus(days: number | null): {
  label: string;
  color: string;
  bgColor: string;
  urgency: 'critical' | 'warning' | 'notice' | 'active' | 'expired' | 'unknown';
} {
  if (days === null) {
    return { label: 'Belum Ada Kontrak', color: 'text-gray-500', bgColor: 'bg-gray-100', urgency: 'unknown' };
  }
  if (days < 0) {
    return { label: `Kedaluwarsa (${Math.abs(days)} hari lalu)`, color: 'text-red-700', bgColor: 'bg-red-100', urgency: 'expired' };
  }
  if (days <= 7) {
    return { label: `Kritis: Sisa ${days} Hari`, color: 'text-red-700', bgColor: 'bg-red-100', urgency: 'critical' };
  }
  if (days <= 30) {
    return { label: `Perhatian: Sisa ${days} Hari`, color: 'text-amber-700', bgColor: 'bg-amber-100', urgency: 'warning' };
  }
  if (days <= 60) {
    return { label: `Mendekati: Sisa ${days} Hari`, color: 'text-blue-700', bgColor: 'bg-blue-100', urgency: 'notice' };
  }
  return { label: `Aktif: Sisa ${days} Hari`, color: 'text-emerald-700', bgColor: 'bg-emerald-100', urgency: 'active' };
}
