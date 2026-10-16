import React, { useState, useMemo, useEffect } from 'react';
import { Employee, ContractPhase, EmployeeStatus } from '../types';
import { formatRupiah } from '../utils/terbilang';
import { parseAnyDate, formatTanggalIndonesia } from '../utils/date';
import { formatAutoNoSurat } from '../utils/mailMerge';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  X, 
  Trash2, 
  Edit3, 
  Save, 
  RotateCcw,
  Search,
  CheckCheck,
  ShieldCheck,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  Database,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { cleanNoKtp, cleanExcelTextNumber } from '../utils/cleanText';
import { ContractMultiInputModal } from './ContractMultiInputModal';
import { parseMultiContractEntries, splitMultiValue, removeEntryAtIndex } from '../utils/contractMultiInput';

export { cleanNoKtp, cleanExcelTextNumber };

export interface ParsedExcelEmployee {
  tempId: string;
  noUrut: number;
  nama: string;
  noKtp: string;
  project: string;
  lokasiKerja: string;
  masaKontrak: string;
  ketUpah: string;
  upah: number;
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  noRekening: string;
  bank: string;
  jabatan: string;
  golongan: string;
  jenisKelamin: 'Laki-Laki' | 'Perempuan';
  email: string;
  noHp: string;
  statusKaryawan: EmployeeStatus;
  currentContractPhase: ContractPhase;
  
  // Nomor Surat & Tanggal Kontrak
  noSurat1: string;
  awalK1: string;
  akhirK1: string;
  ttd1: string;
  noSurat2: string;
  awalK2: string;
  akhirK2: string;
  ttd2: string;
  noSurat3: string;
  awalK3: string;
  akhirK3: string;
  ttd3: string;
  noSurat4: string;
  awalK4: string;
  akhirK4: string;
  ttd4: string;
  noSurat5: string;
  awalK5: string;
  akhirK5: string;
  ttd5: string;
  noSurat6: string;
  awalK6: string;
  akhirK6: string;
  ttd6: string;

  // Properti Kompilasi Duplikat NIK (Aturan PKWT Perusahaan)
  isCompiled?: boolean;
  compiledFromCount?: number;
  duplicateOccurrence?: number; // 1 = Awal, 2 = Perpanjangan K3, 3 = Perpanjangan K4, dst
  totalDuplicates?: number;

  // Status & Validasi
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  isSelected: boolean;
}

export interface ImportProgressData {
  current: number;
  total: number;
  percent: number;
  currentName: string;
}

interface ExcelImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  initialItems: ParsedExcelEmployee[];
  existingEmployees: Employee[];
  onConfirmImport: (
    itemsToImport: Employee[],
    onProgress?: (progress: ImportProgressData) => void
  ) => Promise<void>;
}

// Helper untuk mengekstrak seluruh No Surat non-kosong dari satu baris item
function extractCleanSurats(item: any): string[] {
  return [
    item.noSurat1, item.noSurat2, item.noSurat3,
    item.noSurat4, item.noSurat5, item.noSurat6
  ]
    .map(s => (s || '').toString().trim().toUpperCase())
    .filter(s => s && s.length >= 3 && !s.includes('AUTO-'));
}

// Cek apakah ada NIK atau No Surat atau (Nama+DOB) yang muncul lebih dari 1 kali
export function checkHasDuplicateNiks(items: Array<any>): boolean {
  if (!items || items.length < 2) return false;

  const nikCounts = new Map<string, number>();
  const suratCounts = new Map<string, number>();
  const nameDobCounts = new Map<string, number>();

  for (const item of items) {
    const ktp = cleanNoKtp(item.noKtp);
    if (ktp) {
      nikCounts.set(ktp, (nikCounts.get(ktp) || 0) + 1);
      if (nikCounts.get(ktp)! > 1) return true;
    }

    const surats = extractCleanSurats(item);
    for (const surat of surats) {
      suratCounts.set(surat, (suratCounts.get(surat) || 0) + 1);
      if (suratCounts.get(surat)! > 1) return true;
    }

    const cleanNama = (item.nama || '').toString().trim().toUpperCase();
    const cleanDob = (item.tanggalLahir || '').toString().trim().toUpperCase();
    if (cleanNama && cleanNama.length >= 3) {
      const nameKey = cleanDob ? `${cleanNama}|${cleanDob}` : cleanNama;
      nameDobCounts.set(nameKey, (nameDobCounts.get(nameKey) || 0) + 1);
      if (nameDobCounts.get(nameKey)! > 1) return true;
    }
  }

  return false;
}

/**
 * Mendeteksi angka fase PKWT (1 s/d 6) dari string teks No Surat atau deskripsi.
 * Mendukung format Romawi (PKWT-I s/d PKWT-VI) dan Angka Arab (PKWT-1 s/d PKWT-6).
 * Contoh:
 * - "015/AKY-HRD/PKWT-III/III/2026" -> 3
 * - "006/AKY-HRD/PKWT-II/XII/2025"  -> 2
 * - "001/AKY-HRD/PKWT-I/VI/2025"   -> 1
 * - "020/AKY-HRD/PKWT-IV/IV/2026"  -> 4
 * - "PKWT 3" atau "KONTRAK-III"    -> 3
 */
export function detectPkwtNumberFromText(text?: string | null): number | null {
  if (!text) return null;
  const s = String(text).toUpperCase().trim();

  // 1. Cek angka Romawi setelah kata kunci PKWT / KONTRAK / K
  // Urutan pencarian: VI (6), V (5), IV (4), III (3), II (2), I (1)
  const romanMatch = s.match(/(?:PKWT|KONTRAK|K)[\s\-_/:]*(VI|V|IV|III|II|I)(?=[^A-Z]|$)/);
  if (romanMatch) {
    const rom = romanMatch[1];
    if (rom === 'VI') return 6;
    if (rom === 'V') return 5;
    if (rom === 'IV') return 4;
    if (rom === 'III') return 3;
    if (rom === 'II') return 2;
    if (rom === 'I') return 1;
  }

  // 2. Cek angka Arab 1 s/d 6 setelah kata kunci PKWT / KONTRAK / K
  const numMatch = s.match(/(?:PKWT|KONTRAK|K)[\s\-_/:]*([1-6])(?=[^0-9]|$)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

interface ContractCandidate {
  noSurat: string;
  awal: string;
  akhir: string;
  ttd: string;
  detectedNum: number | null;
  timestamp: number;
  sourceOrder: number;
}

// Algorithm: Rantai Referensi Kontrak (Contract Chain Merger)
// Menggabungkan baris perpanjangan kontrak (misal: Row 1 = K1+K2, Row 2 = K2 reference + K3 baru, dst)
// Disertai validasi nomor PKWT (contoh: PKWT-III masuk ke No Surat 3), pengurutan tanggal kronologis,
// dan jika ada PKWT yang sama (misal dua PKWT-III), keduanya tetap dimasukkan ke slot berikutnya.
export function mergeContractChains(
  groupItems: ParsedExcelEmployee[],
  existingInDb?: Employee
) {
  const slots: Record<number, { noSurat: string; awal: string; akhir: string; ttd: string }> = {
    1: { noSurat: '', awal: '', akhir: '', ttd: '' },
    2: { noSurat: '', awal: '', akhir: '', ttd: '' },
    3: { noSurat: '', awal: '', akhir: '', ttd: '' },
    4: { noSurat: '', awal: '', akhir: '', ttd: '' },
    5: { noSurat: '', awal: '', akhir: '', ttd: '' },
    6: { noSurat: '', awal: '', akhir: '', ttd: '' },
  };

  const norm = (s?: string) => (s || '').toString().trim().toUpperCase();

  // Kumpulkan seluruh data kontrak mentah dari DB dan Excel
  const rawList: ContractCandidate[] = [];
  let orderCounter = 0;

  // 1. Dari data yang sudah ada di Database
  if (existingInDb) {
    for (let k = 1; k <= 6; k++) {
      const ns = (existingInDb as any)[`noSurat${k}`] || '';
      const aw = formatTanggalIndonesia((existingInDb as any)[`awalK${k}`] || '');
      const ak = formatTanggalIndonesia((existingInDb as any)[`akhirK${k}`] || '');
      const tt = formatTanggalIndonesia((existingInDb as any)[`ttd${k}`] || aw || '');
      if (ns || aw || ak) {
        const detected = detectPkwtNumberFromText(ns) || k;
        const ts = parseAnyDate(aw)?.getTime() || parseAnyDate(ak)?.getTime() || 0;
        rawList.push({
          noSurat: ns,
          awal: aw,
          akhir: ak,
          ttd: tt,
          detectedNum: detected,
          timestamp: ts,
          sourceOrder: orderCounter++
        });
      }
    }
  }

  // 2. Dari seluruh baris Excel dalam kelompok karyawan ini
  groupItems.forEach((row) => {
    for (let k = 1; k <= 6; k++) {
      const ns = (row as any)[`noSurat${k}`] || '';
      const aw = formatTanggalIndonesia((row as any)[`awalK${k}`] || '');
      const ak = formatTanggalIndonesia((row as any)[`akhirK${k}`] || '');
      const tt = formatTanggalIndonesia((row as any)[`ttd${k}`] || aw || '');
      if (ns || aw || ak) {
        const detected = detectPkwtNumberFromText(ns);
        const ts = parseAnyDate(aw)?.getTime() || parseAnyDate(ak)?.getTime() || 0;
        rawList.push({
          noSurat: ns,
          awal: aw,
          akhir: ak,
          ttd: tt,
          detectedNum: detected,
          timestamp: ts,
          sourceOrder: orderCounter++
        });
      }
    }
  });

  // 3. Konsolidasikan dan satukan kontrak yang sama persis (misal No Surat referensi yang diulang)
  // Catatan: Jika ada PKWT yang sama (misal dua baris dengan PKWT-III) tetapi No Surat atau tanggalnya berbeda,
  // KEDUANYA TETAP DISIMPAN (masukkan keduanya).
  const uniqueContracts: ContractCandidate[] = [];

  rawList.forEach((item) => {
    const itemNorm = norm(item.noSurat);
    let matchedIndex = -1;

    // Cocokkan apakah sudah ada kontrak dengan nomor surat yang sama persis
    if (itemNorm && itemNorm.length >= 3 && !itemNorm.includes('AUTO-')) {
      matchedIndex = uniqueContracts.findIndex(c => norm(c.noSurat) === itemNorm);
    } else if (item.awal && item.akhir) {
      // Jika no surat kosong, cocokkan jika awal dan akhir tanggal sama persis
      matchedIndex = uniqueContracts.findIndex(c => c.awal === item.awal && c.akhir === item.akhir);
    }

    if (matchedIndex >= 0) {
      // Kontrak yang sama (referensi kontrak berulang): lengkapi data yang kosong
      const target = uniqueContracts[matchedIndex];
      if (!target.awal && item.awal) target.awal = item.awal;
      if (!target.akhir && item.akhir) target.akhir = item.akhir;
      if (!target.ttd && item.ttd) target.ttd = item.ttd;
      if (!target.noSurat && item.noSurat) target.noSurat = item.noSurat;
      if (!target.detectedNum && item.detectedNum) target.detectedNum = item.detectedNum;
      if (!target.timestamp && item.timestamp) target.timestamp = item.timestamp;
    } else {
      // Kontrak baru: tambahkan ke daftar
      uniqueContracts.push({ ...item });
    }
  });

  // 4. Urutkan kontrak agar teratur dan tidak acak-acakan:
  // Kriteria pengurutan:
  // - Jika keduanya memiliki nomor fase PKWT terdeteksi yang berbeda (misal K1 vs K2 vs K3): urutkan berdasarkan fase (1 s/d 6)
  // - Jika nomor fase sama (misal ada 2 kontrak PKWT-III) atau salah satu tidak terdeteksi: urutkan berdasarkan kronologi tanggal awal
  // - Fallback urutan kemunculan di file
  uniqueContracts.sort((a, b) => {
    if (a.detectedNum && b.detectedNum && a.detectedNum !== b.detectedNum) {
      return a.detectedNum - b.detectedNum;
    }
    if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    if (a.detectedNum && !b.detectedNum) return -1;
    if (!a.detectedNum && b.detectedNum) return 1;
    return a.sourceOrder - b.sourceOrder;
  });

  // 5. Tempatkan kontrak ke slot 1 s/d 6:
  // - Prioritas 1: Jika kontrak memiliki detectedNum (misal PKWT-III -> slot 3), masukkan ke slot 3.
  //   Jika slot 3 sudah terisi (kasus: ada PKWT yang sama), masukkan ke slot kosong berikutnya (slot 4) agar keduanya tetap masuk.
  // - Prioritas 2: Kontrak tanpa detectedNum dimasukkan ke slot kosong pertama yang tersedia.
  const assigned = new Set<ContractCandidate>();

  // Tahap A: Tempatkan yang memiliki detectedNum eksplisit
  uniqueContracts.forEach((c) => {
    if (c.detectedNum && c.detectedNum >= 1 && c.detectedNum <= 6) {
      const targetSlot = c.detectedNum;
      const slot = slots[targetSlot];

      if (!slot.noSurat && !slot.awal && !slot.akhir) {
        slots[targetSlot] = {
          noSurat: c.noSurat,
          awal: c.awal,
          akhir: c.akhir,
          ttd: c.ttd
        };
      } else {
        // Jika slot sudah terisi (duplikat fase yang sama, misal PKWT-III ganda),
        // gabungkan dalam 1 row yang sama tanpa berpindah ke kontrak berikutnya (misal K4).
        if (c.noSurat && !slot.noSurat.includes(c.noSurat)) {
          slot.noSurat = [slot.noSurat, c.noSurat].filter(Boolean).join(', ');
        }
        if (c.awal && !slot.awal.includes(c.awal)) {
          slot.awal = [slot.awal, c.awal].filter(Boolean).join(' / ');
        }
        if (c.akhir && !slot.akhir.includes(c.akhir)) {
          slot.akhir = [slot.akhir, c.akhir].filter(Boolean).join(' / ');
        }
        if (c.ttd && !slot.ttd.includes(c.ttd)) {
          slot.ttd = [slot.ttd, c.ttd].filter(Boolean).join(' / ');
        }
      }
      assigned.add(c);
    }
  });

  // Tahap B: Tempatkan sisa kontrak yang belum ter-assign ke slot kosong berurutan
  uniqueContracts.forEach((c) => {
    if (!assigned.has(c)) {
      let targetSlot = 1;
      while (targetSlot <= 6 && (slots[targetSlot].noSurat || slots[targetSlot].awal || slots[targetSlot].akhir)) {
        targetSlot++;
      }
      if (targetSlot <= 6) {
        slots[targetSlot] = {
          noSurat: c.noSurat,
          awal: c.awal,
          akhir: c.akhir,
          ttd: c.ttd
        };
        assigned.add(c);
      }
    }
  });

  // 6. Pastikan No Surat unik dan buatkan otomatis jika slot memiliki tanggal tetapi belum ada No Surat
  const usedNoSurats = new Set<string>();
  const baseNoUrut = groupItems[0]?.noUrut || 1;

  for (let k = 1; k <= 6; k++) {
    const slot = slots[k];
    const sNorm = norm(slot.noSurat);

    if (slot.noSurat && !usedNoSurats.has(sNorm)) {
      usedNoSurats.add(sNorm);
    } else if (slot.awal || slot.akhir) {
      const phaseKey = `K${k}` as ContractPhase;
      const autoNs = formatAutoNoSurat(baseNoUrut, phaseKey, slot.awal || slots[1].awal || '01 Januari 2026');
      slot.noSurat = autoNs;
      usedNoSurats.add(norm(autoNs));
    }
  }

  // Tentukan fase kontrak tertinggi yang terisi
  let highestNum = 1;
  for (let k = 6; k >= 1; k--) {
    if (slots[k].awal || slots[k].akhir || slots[k].noSurat) {
      highestNum = k;
      break;
    }
  }
  const highestPhase = `K${highestNum}` as ContractPhase;

  // Pilih latestRow berdasarkan baris dengan tanggal kontrak terbaru atau baris terakhir
  let latestRow = groupItems[groupItems.length - 1];
  let maxRowTimestamp = 0;
  groupItems.forEach((row) => {
    for (let k = 6; k >= 1; k--) {
      const aw = (row as any)[`awalK${k}`];
      const ak = (row as any)[`akhirK${k}`];
      const ts = parseAnyDate(ak)?.getTime() || parseAnyDate(aw)?.getTime() || 0;
      if (ts > maxRowTimestamp) {
        maxRowTimestamp = ts;
        latestRow = row;
      }
    }
  });

  return { slots, highestPhase, latestRow };
}

// Kompilasikan baris NIK / No Surat duplikat secara terpadu sesuai aturan PKWT:
// Satukan data yang memiliki NIK sama, No Surat sama, atau nama karyawan sama agar kontrak tidak terduplikasi.
export function compileDuplicateNikRows(
  items: ParsedExcelEmployee[],
  existingEmployees: Employee[] = []
): ParsedExcelEmployee[] {
  if (!items || items.length === 0) return [];

  // Algoritma Union-Find (Disjoint Set Union) untuk menggabungkan baris yang terhubung oleh NIK, No Surat, atau Nama+DOB
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  };

  const nikMap = new Map<string, number>();
  const suratMap = new Map<string, number>();
  const nameDobMap = new Map<string, number>();

  items.forEach((item, index) => {
    const cleanNik = cleanNoKtp(item.noKtp);
    if (cleanNik) {
      if (nikMap.has(cleanNik)) {
        union(index, nikMap.get(cleanNik)!);
      } else {
        nikMap.set(cleanNik, index);
      }
    }

    const surats = extractCleanSurats(item);
    surats.forEach(surat => {
      if (suratMap.has(surat)) {
        union(index, suratMap.get(surat)!);
      } else {
        suratMap.set(surat, index);
      }
    });

    const cleanNama = (item.nama || '').toString().trim().toUpperCase();
    const cleanDob = (item.tanggalLahir || '').toString().trim().toUpperCase();
    if (cleanNama && cleanNama.length >= 3) {
      const nameKey = cleanDob ? `${cleanNama}|${cleanDob}` : cleanNama;
      if (nameDobMap.has(nameKey)) {
        union(index, nameDobMap.get(nameKey)!);
      } else {
        nameDobMap.set(nameKey, index);
      }
    }
  });

  // Kelompokkan baris berdasarkan kelompok utamanya
  const groupsMap = new Map<number, ParsedExcelEmployee[]>();
  items.forEach((item, index) => {
    const root = find(index);
    const group = groupsMap.get(root) || [];
    group.push(item);
    groupsMap.set(root, group);
  });

  const result: ParsedExcelEmployee[] = [];

  groupsMap.forEach((groupItems) => {
    // DISATUKAN: MULTIPLE ROWS UNTUK NIK / NO SURAT / NAMA YANG SAMA
    const base = { ...groupItems[0] };

    // Lengkapi profil dasar karyawan jika ada sel kosong di baris pertama
    for (let i = 1; i < groupItems.length; i++) {
      const row = groupItems[i];
      if (!base.noKtp && row.noKtp) base.noKtp = row.noKtp;
      if ((!base.nama || base.nama.length < 3) && row.nama) base.nama = row.nama;
      if (!base.tempatLahir && row.tempatLahir) base.tempatLahir = row.tempatLahir;
      if (!base.tanggalLahir && row.tanggalLahir) base.tanggalLahir = row.tanggalLahir;
      if (!base.alamat && row.alamat) base.alamat = row.alamat;
      if (!base.noRekening && row.noRekening) base.noRekening = row.noRekening;
      if (!base.email && row.email) base.email = row.email;
      if (!base.noHp && row.noHp) base.noHp = row.noHp;
      if (!base.project && row.project) base.project = row.project;
      if (!base.lokasiKerja && row.lokasiKerja) base.lokasiKerja = row.lokasiKerja;
    }

    // Cek jika data karyawan sudah ada di database untuk mengaitkan riwayat kontrak sebelumnya
    const cleanNikBase = cleanNoKtp(base.noKtp);
    const existingInDb = existingEmployees.find(e => {
      const eNik = cleanNoKtp(e.noKtp);
      if (cleanNikBase && eNik === cleanNikBase) return true;
      if (base.noSurat1 && e.noSurat1 === base.noSurat1) return true;
      if (base.nama && e.nama.toUpperCase() === base.nama.toUpperCase()) return true;
      return false;
    });

    // Jalankan penggabungan rantai nomor kontrak (Contract Chain Merger)
    const { slots, highestPhase, latestRow } = mergeContractChains(groupItems, existingInDb);

    // Salin hasil slot kontrak ke base record
    base.noSurat1 = slots[1].noSurat;
    base.awalK1 = slots[1].awal;
    base.akhirK1 = slots[1].akhir;
    base.ttd1 = slots[1].ttd;

    base.noSurat2 = slots[2].noSurat;
    base.awalK2 = slots[2].awal;
    base.akhirK2 = slots[2].akhir;
    base.ttd2 = slots[2].ttd;

    base.noSurat3 = slots[3].noSurat;
    base.awalK3 = slots[3].awal;
    base.akhirK3 = slots[3].akhir;
    base.ttd3 = slots[3].ttd;

    base.noSurat4 = slots[4].noSurat;
    base.awalK4 = slots[4].awal;
    base.akhirK4 = slots[4].akhir;
    base.ttd4 = slots[4].ttd;

    base.noSurat5 = slots[5].noSurat;
    base.awalK5 = slots[5].awal;
    base.akhirK5 = slots[5].akhir;
    base.ttd5 = slots[5].ttd;

    base.noSurat6 = slots[6].noSurat;
    base.awalK6 = slots[6].awal;
    base.akhirK6 = slots[6].akhir;
    base.ttd6 = slots[6].ttd;

    // Perbarui info kepegawaian aktif dari baris perpanjangan terbaru
    if (latestRow.upah && latestRow.upah > 0) base.upah = latestRow.upah;
    if (latestRow.ketUpah) base.ketUpah = latestRow.ketUpah;
    if (latestRow.masaKontrak) base.masaKontrak = latestRow.masaKontrak;
    if (latestRow.jabatan) base.jabatan = latestRow.jabatan;
    if (latestRow.lokasiKerja) base.lokasiKerja = latestRow.lokasiKerja;
    if (latestRow.project) base.project = latestRow.project;
    if (latestRow.statusKaryawan) base.statusKaryawan = latestRow.statusKaryawan;

    base.tanggalLahir = formatTanggalIndonesia(base.tanggalLahir) || '01 Januari 2000';
    base.currentContractPhase = highestPhase;
    base.isCompiled = true;
    base.compiledFromCount = groupItems.length;
    base.totalDuplicates = groupItems.length;
    base.duplicateOccurrence = 1;

    result.push(base);
  });

  return result;
}

export function validateParsedItem(
  item: Omit<ParsedExcelEmployee, 'status' | 'errors' | 'warnings'>,
  allParsed: Array<any>,
  existingEmployees: Employee[]
): { status: 'valid' | 'warning' | 'error'; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validasi Nama (Fatal)
  const trimmedNama = (item.nama || '').trim();
  if (!trimmedNama || trimmedNama.length < 2) {
    errors.push('Nama karyawan wajib diisi');
  }

  // 2. Validasi NIK / No KTP & No Surat Duplikat
  const cleanKtp = cleanNoKtp(item.noKtp);
  if (!cleanKtp) {
    errors.push('NIK / No KTP wajib diisi');
  } else {
    // Cek duplikasi NIK atau No Surat di dalam file Excel yang sama
    const dupMatching = allParsed.filter(p => cleanNoKtp(p.noKtp) === cleanKtp);
    const itemSurats = extractCleanSurats(item);
    const dupSuratMatching = itemSurats.length > 0
      ? allParsed.filter(p => p.tempId !== item.tempId && extractCleanSurats(p).some(s => itemSurats.includes(s)))
      : [];

    if (dupMatching.length > 1) {
      const occurrence = dupMatching.findIndex(p => p.tempId === item.tempId) + 1;
      if (occurrence === 1) {
        warnings.push(`NIK terulang (${dupMatching.length}x): Baris Utama Kontrak K1/K2`);
      } else {
        warnings.push(`NIK Duplikat #${occurrence} → Perpanjangan Kontrak [Siap Disatukan]`);
      }
    } else if (dupSuratMatching.length > 0) {
      warnings.push(`No Surat terulang/sama dengan baris lain (${dupSuratMatching.length}x) [Siap Disatukan]`);
    }

    // Cek format standar 16 digit angka
    if (!/^\d{16}$/.test(cleanKtp)) {
      warnings.push('NIK tidak standar (sebaiknya 16 digit angka)');
    }

    // Cek apakah NIK sudah ada di database saat ini
    const existingInDb = existingEmployees.find(e => cleanNoKtp(e.noKtp) === cleanKtp);
    if (existingInDb) {
      warnings.push(`NIK sudah ada di database (${existingInDb.nama}) - data akan diperbarui`);
    }
  }

  // 3. Validasi Tanggal Awal / Akhir Kontrak
  if (item.awalK1) {
    const parsedAwal = parseAnyDate(item.awalK1);
    if (!parsedAwal) {
      warnings.push(`Format tgl awal K1 ("${item.awalK1}") tidak standar`);
    }
  }
  if (item.akhirK1) {
    const parsedAkhir = parseAnyDate(item.akhirK1);
    if (!parsedAkhir) {
      warnings.push(`Format tgl akhir K1 ("${item.akhirK1}") tidak standar`);
    }
  }

  // 4. Validasi Upah
  if (!item.upah || item.upah <= 0) {
    warnings.push('Nominal upah kosong / Rp 0');
  }

  // 5. Validasi Project & Lokasi Kerja
  if (!item.project) {
    warnings.push('Project belum terisi');
  }
  if (!item.lokasiKerja) {
    warnings.push('Lokasi kerja belum terisi');
  }

  let status: 'valid' | 'warning' | 'error' = 'valid';
  if (errors.length > 0) {
    status = 'error';
  } else if (warnings.length > 0) {
    status = 'warning';
  }

  return { status, errors, warnings };
}

export const ExcelImportPreviewModal: React.FC<ExcelImportPreviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  initialItems,
  existingEmployees,
  onConfirmImport
}) => {
  const { showToast } = useToast();

  // State untuk Progress Bar dan Persentase Loading Impor Database
  const [importProgress, setImportProgress] = useState<ImportProgressData | null>(null);

  // Simpan data mentah baris Excel
  const [rawItems, setRawItems] = useState<ParsedExcelEmployee[]>(initialItems);

  // Status apakah mode kompilasi aktif (otomatis aktif jika terdeteksi NIK duplikat)
  const [isCompiledMode, setIsCompiledMode] = useState<boolean>(() => checkHasDuplicateNiks(initialItems));

  // Daftar item yang sedang aktif ditampilkan di tabel
  const [items, setItems] = useState<ParsedExcelEmployee[]>(() => {
    const hasDups = checkHasDuplicateNiks(initialItems);
    if (hasDups) {
      return compileDuplicateNikRows(initialItems, existingEmployees);
    }
    return initialItems;
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ParsedExcelEmployee>>({});
  const [filterTab, setFilterTab] = useState<'all' | 'issues' | 'valid' | 'duplicates'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Modal Multi-Input Kontrak (No Surat, Tanggal Kontrak, TTD ganda)
  const [multiInputTarget, setMultiInputTarget] = useState<{
    tempId: string;
    phaseNum: number;
    phaseLabel: string;
    phaseKey: 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6';
    employeeName: string;
    employeeNo: number;
    initialNoSurat: string;
    initialAwal: string;
    initialAkhir: string;
    initialTtd: string;
  } | null>(null);

  // State konfirmasi hapus baris & entri (Yes / No)
  const [rowToDelete, setRowToDelete] = useState<ParsedExcelEmployee | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<{
    tempId: string;
    phaseNum: number;
    entryIndex: number;
    employeeName: string;
    surat: string;
  } | null>(null);

  // Validasi ulang daftar
  const revalidateAll = (currentItems: ParsedExcelEmployee[]): ParsedExcelEmployee[] => {
    return currentItems.map(item => {
      const { status, errors, warnings } = validateParsedItem(item, currentItems, existingEmployees);
      return {
        ...item,
        status,
        errors,
        warnings,
        isSelected: item.isSelected !== undefined ? item.isSelected : status !== 'error'
      };
    });
  };

  // Sinkronisasi bila initialItems berubah
  useEffect(() => {
    setRawItems(initialItems);
    const hasDups = checkHasDuplicateNiks(initialItems);
    setIsCompiledMode(hasDups);
    if (hasDups) {
      const compiled = compileDuplicateNikRows(initialItems, existingEmployees);
      setItems(revalidateAll(compiled));
    } else {
      setItems(revalidateAll(initialItems));
    }
  }, [initialItems, existingEmployees]);

  // Statistik duplikasi (NIK & No Surat) pada data mentah
  const duplicateStats = useMemo(() => {
    const keyCounts = new Map<string, number>();
    rawItems.forEach(i => {
      const k = cleanNoKtp(i.noKtp);
      if (k) keyCounts.set(`nik-${k}`, (keyCounts.get(`nik-${k}`) || 0) + 1);

      const surats = extractCleanSurats(i);
      surats.forEach(s => {
        keyCounts.set(`surat-${s}`, (keyCounts.get(`surat-${s}`) || 0) + 1);
      });
    });
    let uniqueDuplicates = 0;
    let duplicateRowsCount = 0;
    keyCounts.forEach(cnt => {
      if (cnt > 1) {
        uniqueDuplicates++;
        duplicateRowsCount += cnt;
      }
    });
    return { uniqueDuplicates, duplicateRowsCount };
  }, [rawItems]);

  // Toggle antara Mode Kompilasi Terpadu (K1-K6) dan Mode Baris Terpisah
  const handleToggleCompileMode = () => {
    if (isCompiledMode) {
      // Beralih ke tampilan baris mentah terpisah
      setIsCompiledMode(false);
      setItems(revalidateAll(rawItems));
    } else {
      // Beralih ke mode kompilasi terpadu
      setIsCompiledMode(true);
      const compiled = compileDuplicateNikRows(rawItems, existingEmployees);
      setItems(revalidateAll(compiled));
    }
    setEditingId(null);
  };

  // Hitung ringkasan statistik
  const stats = useMemo(() => {
    const total = items.length;
    const valid = items.filter(i => i.status === 'valid').length;
    const warning = items.filter(i => i.status === 'warning').length;
    const error = items.filter(i => i.status === 'error').length;
    const selected = items.filter(i => i.isSelected).length;
    const dups = items.filter(i => (i.totalDuplicates && i.totalDuplicates > 1) || i.isCompiled).length;
    return { total, valid, warning, error, selected, dups };
  }, [items]);

  // Filter items berdasarkan tab & search
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Tab filter
      if (filterTab === 'issues' && item.status === 'valid') return false;
      if (filterTab === 'valid' && item.status !== 'valid') return false;
      if (filterTab === 'duplicates' && !item.isCompiled && (!item.totalDuplicates || item.totalDuplicates <= 1)) return false;

      // Search filter
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchNama = item.nama.toLowerCase().includes(query);
        const matchKtp = item.noKtp.includes(query);
        const matchProject = item.project.toLowerCase().includes(query);
        const matchError = [...item.errors, ...item.warnings].some(msg => msg.toLowerCase().includes(query));
        if (!matchNama && !matchKtp && !matchProject && !matchError) return false;
      }

      return true;
    });
  }, [items, filterTab, searchFilter]);

  if (!isOpen) return null;

  // Toggle checklist baris
  const handleToggleSelect = (tempId: string) => {
    setItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return { ...item, isSelected: !item.isSelected };
      }
      return item;
    }));
  };

  // Pilih semua yang valid
  const handleSelectAllValid = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      isSelected: item.status !== 'error'
    })));
  };

  // Batal pilih semua
  const handleDeselectAll = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      isSelected: false
    })));
  };

  // Hapus baris dari daftar preview
  const handleDeleteRow = (tempId: string) => {
    const remaining = items.filter(i => i.tempId !== tempId);
    setItems(revalidateAll(remaining));
    setRawItems(prev => prev.filter(i => i.tempId !== tempId));
    showToast('delete', 'Baris Dihapus', 'Baris data karyawan dihapus dari daftar pratinjau impor.');
  };

  // Mulai edit baris
  const handleStartEdit = (item: ParsedExcelEmployee) => {
    setEditingId(item.tempId);
    setEditFormData({ ...item });
  };

  // Simpan perubahan baris & langsung validasi ulang
  const handleSaveEdit = (tempId: string) => {
    const updated = items.map(item => {
      if (item.tempId === tempId) {
        return {
          ...item,
          ...editFormData,
          nama: (editFormData.nama || item.nama).toUpperCase(),
          noKtp: cleanNoKtp(editFormData.noKtp ?? item.noKtp),
          noRekening: cleanExcelTextNumber(editFormData.noRekening ?? item.noRekening),
          noHp: cleanExcelTextNumber(editFormData.noHp ?? item.noHp),
          project: (editFormData.project ?? item.project),
          lokasiKerja: (editFormData.lokasiKerja ?? item.lokasiKerja),
          upah: Number(editFormData.upah) || item.upah
        };
      }
      return item;
    });

    setItems(revalidateAll(updated));
    setEditingId(null);
    setEditFormData({});
    showToast('edit', 'Data Baris Diperbarui', 'Perubahan data karyawan pada baris pratinjau berhasil disimpan.');
  };

  // Handler untuk menghapus satu entri spesifik dari data multi-input dalam 1 row
  const handleRemoveEntryFromItem = (tempId: string, phaseNum: number, entryIndex: number) => {
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.tempId !== tempId) return item;
        const noSuratKey = `noSurat${phaseNum}` as keyof ParsedExcelEmployee;
        const awalKey = `awalK${phaseNum}` as keyof ParsedExcelEmployee;
        const akhirKey = `akhirK${phaseNum}` as keyof ParsedExcelEmployee;
        const ttdKey = `ttd${phaseNum}` as keyof ParsedExcelEmployee;

        const res = removeEntryAtIndex(
          entryIndex,
          item[noSuratKey] as string,
          item[awalKey] as string,
          item[akhirKey] as string,
          item[ttdKey] as string
        );

        return {
          ...item,
          [noSuratKey]: res.noSurat,
          [awalKey]: res.awal,
          [akhirKey]: res.akhir,
          [ttdKey]: res.ttd
        };
      });
      return revalidateAll(updated);
    });
    showToast('delete', 'Entri Kontrak Dihapus', `Entri ke-${entryIndex + 1} pada Kontrak ${phaseNum} berhasil dihapus dari baris.`);
  };

  // Handler saat menyimpan perubahan dari Modal Multi-Input Kontrak
  const handleSaveMultiInput = (data: { noSurat: string; awal: string; akhir: string; ttd: string }) => {
    if (!multiInputTarget) return;
    const { tempId, phaseNum } = multiInputTarget;
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.tempId !== tempId) return item;
        return {
          ...item,
          [`noSurat${phaseNum}`]: data.noSurat,
          [`awalK${phaseNum}`]: data.awal,
          [`akhirK${phaseNum}`]: data.akhir,
          [`ttd${phaseNum}`]: data.ttd
        };
      });
      return revalidateAll(updated);
    });

    if (editingId === tempId) {
      setEditFormData(prev => ({
        ...prev,
        [`noSurat${phaseNum}`]: data.noSurat,
        [`awalK${phaseNum}`]: data.awal,
        [`akhirK${phaseNum}`]: data.akhir,
        [`ttd${phaseNum}`]: data.ttd
      }));
    }

    showToast('edit', 'Multi-Input Diperbarui', `Data Kontrak ${phaseNum} berhasil diperbarui.`);
  };

  // Eksekusi impor data yang dicentang
  const handleExecuteImport = async () => {
    let selectedItems = items.filter(i => i.isSelected);
    
    // Cek jika ada item terpilih yang masih berstatus error
    const fatalSelected = selectedItems.filter(i => i.status === 'error');
    if (fatalSelected.length > 0) {
      alert(`Terdapat ${fatalSelected.length} baris dengan error fatal yang dicentang. Silakan perbaiki data atau hilangkan centang baris tersebut terlebih dahulu.`);
      return;
    }

    if (selectedItems.length === 0) {
      alert('Tidak ada baris data karyawan yang dipilih untuk diimpor.');
      return;
    }

    // PENTING: Jika pengguna berada pada mode baris terpisah tetapi memilih data yang memiliki NIK duplikat,
    // kita secara otomatis kompilasikan agar database menerima 1 data karyawan utuh dengan riwayat K1 s/d K6!
    if (!isCompiledMode && checkHasDuplicateNiks(selectedItems)) {
      selectedItems = compileDuplicateNikRows(selectedItems, existingEmployees);
    }

    setIsSubmitting(true);
    try {
      // Konversi ke format Employee
      const finalEmployees: Employee[] = selectedItems.map((item, idx) => {
        const rawNama = (item.nama || '').toString().trim();
        const cleanKtp = cleanNoKtp(item.noKtp);
        const existingInDb = existingEmployees.find(e => cleanNoKtp(e.noKtp) === cleanKtp);

        // Generate No Surat 1 jika masih kosong
        let noSurat1 = item.noSurat1 || (existingInDb ? existingInDb.noSurat1 : '');
        if (!noSurat1) {
          noSurat1 = formatAutoNoSurat(item.noUrut || (existingEmployees.length + idx + 1), 'K1', item.awalK1);
        }

        const employeeId = existingInDb ? existingInDb.id : `emp-import-${Date.now()}-${idx}`;
        const employeeNo = existingInDb ? existingInDb.no : (item.noUrut || (existingEmployees.length + idx + 1));

        return {
          id: employeeId,
          no: employeeNo,
          nama: rawNama,
          noKtp: cleanKtp,
          project: item.project || (existingInDb?.project ?? ''),
          lokasiKerja: item.lokasiKerja || (existingInDb?.lokasiKerja ?? 'Jakarta'),
          masaKontrak: item.masaKontrak || (existingInDb?.masaKontrak ?? '3 Bulan'),
          ketUpah: item.ketUpah || (existingInDb?.ketUpah ?? ''),
          upah: Number(item.upah) || (existingInDb?.upah ?? 5625883),
          tempatLahir: item.tempatLahir || (existingInDb?.tempatLahir ?? 'JAKARTA'),
          tanggalLahir: formatTanggalIndonesia(item.tanggalLahir || existingInDb?.tanggalLahir) || '01 Januari 2000',
          alamat: item.alamat || (existingInDb?.alamat ?? 'JAKARTA'),
          noRekening: cleanExcelTextNumber(item.noRekening) || (existingInDb?.noRekening ?? '5745940924'),
          bank: item.bank || (existingInDb?.bank ?? 'BCA'),
          jabatan: item.jabatan || (existingInDb?.jabatan ?? 'Operator'),
          golongan: item.golongan || (existingInDb?.golongan ?? '0A'),
          jenisKelamin: (item.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-Laki') as 'Laki-Laki' | 'Perempuan',
          email: item.email || (existingInDb?.email ?? `${rawNama.toLowerCase().replace(/\s+/g, '.')}@example.com`),
          noHp: cleanExcelTextNumber(item.noHp) || (existingInDb?.noHp ?? '6281234567890'),
          statusKaryawan: (item.statusKaryawan === 'PKWTT' || item.statusKaryawan === 'SELESAI' || item.statusKaryawan === 'NONAKTIF' ? item.statusKaryawan : 'PKWT') as EmployeeStatus,
          currentContractPhase: item.currentContractPhase || (existingInDb?.currentContractPhase ?? 'K1'),
          
          noSurat1,
          awalK1: formatTanggalIndonesia(item.awalK1 || existingInDb?.awalK1) || '',
          akhirK1: formatTanggalIndonesia(item.akhirK1 || existingInDb?.akhirK1) || '',
          ttd1: formatTanggalIndonesia(item.ttd1 || existingInDb?.ttd1) || '',
          
          noSurat2: item.noSurat2 || (existingInDb?.noSurat2 ?? ''),
          awalK2: formatTanggalIndonesia(item.awalK2 || existingInDb?.awalK2) || '',
          akhirK2: formatTanggalIndonesia(item.akhirK2 || existingInDb?.akhirK2) || '',
          ttd2: formatTanggalIndonesia(item.ttd2 || existingInDb?.ttd2) || '',
          
          noSurat3: item.noSurat3 || (existingInDb?.noSurat3 ?? ''),
          awalK3: formatTanggalIndonesia(item.awalK3 || existingInDb?.awalK3) || '',
          akhirK3: formatTanggalIndonesia(item.akhirK3 || existingInDb?.akhirK3) || '',
          ttd3: formatTanggalIndonesia(item.ttd3 || existingInDb?.ttd3) || '',
          
          noSurat4: item.noSurat4 || (existingInDb?.noSurat4 ?? ''),
          awalK4: formatTanggalIndonesia(item.awalK4 || existingInDb?.awalK4) || '',
          akhirK4: formatTanggalIndonesia(item.akhirK4 || existingInDb?.akhirK4) || '',
          ttd4: formatTanggalIndonesia(item.ttd4 || existingInDb?.ttd4) || '',
          
          noSurat5: item.noSurat5 || (existingInDb?.noSurat5 ?? ''),
          awalK5: formatTanggalIndonesia(item.awalK5 || existingInDb?.awalK5) || '',
          akhirK5: formatTanggalIndonesia(item.akhirK5 || existingInDb?.akhirK5) || '',
          ttd5: formatTanggalIndonesia(item.ttd5 || existingInDb?.ttd5) || '',
          
          noSurat6: item.noSurat6 || (existingInDb?.noSurat6 ?? ''),
          awalK6: formatTanggalIndonesia(item.awalK6 || existingInDb?.awalK6) || '',
          akhirK6: formatTanggalIndonesia(item.akhirK6 || existingInDb?.akhirK6) || '',
          ttd6: formatTanggalIndonesia(item.ttd6 || existingInDb?.ttd6) || '',
          
          ttdKaryawanUrl: existingInDb?.ttdKaryawanUrl || '',
          createdAt: existingInDb?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      setImportProgress({
        current: 0,
        total: finalEmployees.length,
        percent: 0,
        currentName: finalEmployees[0]?.nama || 'Menyiapkan data...'
      });

      await onConfirmImport(finalEmployees, (progress) => {
        setImportProgress(progress);
      });
      onClose();
    } catch (err: any) {
      console.error('Import execution error:', err);
      const msg = err?.message ? `: ${err.message}` : '';
      alert(`Terjadi kesalahan saat menyimpan data impor ke database${msg}.`);
    } finally {
      setIsSubmitting(false);
      setImportProgress(null);
    }
  };

  // Render sel No Surat dengan dukungan Multi-Badge dan tombol Hapus entri ganda
  const renderSuratCell = (item: ParsedExcelEmployee, phaseNum: number, colorClass: string) => {
    const noSuratVal = (item[`noSurat${phaseNum}` as keyof ParsedExcelEmployee] as string) || '';
    const awalVal = (item[`awalK${phaseNum}` as keyof ParsedExcelEmployee] as string) || '';
    const akhirVal = (item[`akhirK${phaseNum}` as keyof ParsedExcelEmployee] as string) || '';
    const ttdVal = (item[`ttd${phaseNum}` as keyof ParsedExcelEmployee] as string) || '';

    const entries = parseMultiContractEntries(noSuratVal, awalVal, akhirVal, ttdVal);

    if (entries.length > 1) {
      return (
        <div className="flex flex-col gap-1 items-start min-w-[130px]">
          {entries.map((entry, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between gap-1 bg-amber-50 text-amber-950 border border-amber-300 rounded px-1.5 py-0.5 text-[10px] font-mono w-full group/chip hover:bg-amber-100 transition-colors shadow-2xs"
              title={`Entri #${idx + 1}: ${entry.noSurat || '(Kosong)'} | Awal: ${entry.awal || '-'} | Akhir: ${entry.akhir || '-'}`}
            >
              <span className="font-black text-[9px] bg-amber-200 text-amber-950 px-1 rounded">#{idx + 1}</span>
              <span className="truncate flex-1 font-semibold">{entry.noSurat || '(No Surat -)'}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEntryToDelete({
                    tempId: item.tempId,
                    phaseNum,
                    entryIndex: idx,
                    employeeName: item.nama,
                    surat: entry.noSurat || `Entri #${idx + 1}`
                  });
                }}
                className="text-gray-400 hover:text-rose-600 hover:bg-rose-100 p-0.5 rounded cursor-pointer transition-colors"
                title={`Hapus entri #${idx + 1} ini`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMultiInputTarget({
                tempId: item.tempId,
                phaseNum,
                phaseLabel: `Kontrak ${phaseNum} (K${phaseNum})`,
                phaseKey: `K${phaseNum}` as any,
                employeeName: item.nama,
                employeeNo: item.noUrut || 1,
                initialNoSurat: noSuratVal,
                initialAwal: awalVal,
                initialAkhir: akhirVal,
                initialTtd: ttdVal
              });
            }}
            className="text-[9.5px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer hover:underline mt-0.5"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Kelola Multi-Input ({entries.length})</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group/single gap-1 min-w-[90px]">
        <span className={noSuratVal ? colorClass : 'text-gray-400 font-mono text-[10.5px]'}>
          {noSuratVal || '-'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMultiInputTarget({
              tempId: item.tempId,
              phaseNum,
              phaseLabel: `Kontrak ${phaseNum} (K${phaseNum})`,
              phaseKey: `K${phaseNum}` as any,
              employeeName: item.nama,
              employeeNo: item.noUrut || 1,
              initialNoSurat: noSuratVal,
              initialAwal: awalVal,
              initialAkhir: akhirVal,
              initialTtd: ttdVal
            });
          }}
          className="opacity-0 group-hover/single:opacity-100 text-[9px] text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50 cursor-pointer transition-all"
          title="Buka Multi-Input untuk kontrak ini"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // Render sel Tanggal Kontrak (Awal, Akhir, TTD) yang mendukung multi-tanggal
  const renderDateCell = (dateString?: string) => {
    if (!dateString) return <span className="text-gray-400">-</span>;
    const parts = splitMultiValue(dateString);
    if (parts.length > 1) {
      return (
        <div className="flex flex-col gap-0.5 text-[10px] min-w-[90px]">
          {parts.map((p, idx) => (
            <span key={idx} className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded font-mono border border-slate-200">
              #{idx + 1}: {formatTanggalIndonesia(p) || p}
            </span>
          ))}
        </div>
      );
    }
    return <span>{formatTanggalIndonesia(dateString) || dateString}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[98vw] h-[95vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                  Pratinjau & Validasi Data Impor Excel
                </h3>
                <span className="text-[11px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md truncate max-w-[200px]" title={fileName}>
                  {fileName}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Periksa kelengkapan baris, perbaiki kesalahan secara langsung di tabel, lalu impor data ke database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="px-5 py-3 border-b border-gray-200 bg-white grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Baris</p>
              <p className="text-base font-extrabold text-gray-900">{stats.total} Baris</p>
            </div>
            <span className="p-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">
              {stats.total}
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Siap Impor (Valid)</p>
              <p className="text-base font-extrabold text-emerald-800">{stats.valid} Baris</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Perlu Perhatian</p>
              <p className="text-base font-extrabold text-amber-800">{stats.warning} Baris</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Error Fatal</p>
              <p className="text-base font-extrabold text-rose-800">{stats.error} Baris</p>
            </div>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        {/* Filtering & Quick Selection Toolbar */}
        <div className="px-5 py-2.5 border-b border-gray-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterTab === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              onClick={() => setFilterTab('issues')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                filterTab === 'issues' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Bermasalah ({stats.warning + stats.error})</span>
            </button>
            <button
              onClick={() => setFilterTab('valid')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterTab === 'valid' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hanya Valid ({stats.valid})
            </button>
            {duplicateStats.duplicateRowsCount > 0 && (
              <button
                onClick={() => setFilterTab('duplicates')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                  filterTab === 'duplicates' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:text-indigo-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Data Duplikat ({stats.dups})</span>
              </button>
            )}
          </div>

          {/* Search within Preview */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIK, atau pesan..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Selection Buttons & Compilation Mode Toggle */}
          <div className="flex items-center space-x-2 shrink-0">
            {duplicateStats.duplicateRowsCount > 0 && (
              <button
                onClick={handleToggleCompileMode}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                  isCompiledMode 
                    ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-xs' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                }`}
                title={isCompiledMode ? 'Klik untuk melihat baris mentah terpisah' : 'Klik untuk mengkompilasikan baris duplikat NIK / No Surat ke K1-K6'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isCompiledMode ? 'Mode Kompilasi: AKTIF' : 'Kompilasi Duplikat'}</span>
              </button>
            )}

            <button
              onClick={handleSelectAllValid}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 flex items-center space-x-1 cursor-pointer"
              title="Centang semua baris yang tidak memiliki error fatal"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pilih Semua Valid</span>
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 cursor-pointer"
              title="Hapus semua centang"
            >
              Batal Pilih
            </button>
          </div>
        </div>

        {/* Dedicated Kompilasi NIK & No Surat Duplikat Banner */}
        {duplicateStats.duplicateRowsCount > 0 && (
          isCompiledMode ? (
            <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-indigo-950">
                      ⚡ Mode Kompilasi Duplikat (NIK / No Surat) Aktif
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                      {duplicateStats.duplicateRowsCount} Baris Excel → {items.length} Data Karyawan Utuh
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Baris dengan <strong>NIK atau No Surat ganda/sama</strong> telah disatukan otomatis: <strong>Duplikat ke-2</strong> dipetakan ke <strong>Perpanjangan Kontrak ke-3 (K3)</strong>, dst. Riwayat surat & tanggal kontrak tersimpan utuh tanpa kontrak ganda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCompileMode}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs shrink-0"
                title="Beralih untuk melihat baris mentah per baris"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lihat Baris Terpisah ({rawItems.length} Baris)</span>
              </button>
            </div>
          ) : (
            <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-950">
                      Terdeteksi {duplicateStats.duplicateRowsCount} Baris Duplikat NIK / No Surat ({duplicateStats.uniqueDuplicates} Kelompok Data)
                    </span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      Tampilan Baris Terpisah
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Ditemukan NIK atau No Surat sama pada data yang berbeda. Klik tombol di kanan untuk menyatukan riwayat kontrak menjadi 1 profil karyawan utuh agar tidak terduplikasi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCompileMode}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="Gabungkan baris duplikat menjadi perpanjangan kontrak K1-K6"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>⚡ Satukan Data Duplikat Sekarang</span>
              </button>
            </div>
          )
        )}

        {/* Informative Guidance Banner */}
        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 text-blue-900 text-[11px] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold">Petunjuk:</span>
            <span>Seluruh kolom (No Surat 1-6, Awal/Akhir/TTD K1-K6, upah, dsb.) dapat ditinjau dan diperbaiki secara langsung sebelum data disimpan ke database.</span>
          </div>
          <span className="font-semibold text-blue-800 shrink-0">
            {stats.selected} dari {stats.total} baris dipilih
          </span>
        </div>

        {/* Preview Data Table - FULL EXCEL REVIEW (ALL 35+ COLUMNS) */}
        <div className="flex-1 overflow-auto bg-gray-50/50">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead className="bg-[#00A2E8] text-white uppercase tracking-wider font-bold text-[10px] sticky top-0 z-20 shadow-sm select-none">
              <tr className="divide-x divide-[#0089C4]">
                <th className="py-2.5 px-3 w-10 text-center sticky left-0 bg-[#00A2E8] z-30">PILIH</th>
                <th className="py-2.5 px-3 min-w-[90px] text-center sticky left-10 bg-[#00A2E8] z-30">STATUS</th>
                <th className="py-2.5 px-3 text-center min-w-[50px]">NO</th>
                <th className="py-2.5 px-3 min-w-[190px]">NAMA KARYAWAN</th>

                {/* Point 2: No Surat 1 s/d 6 */}
                <th className="py-2.5 px-3 min-w-[190px]">No Surat 1</th>
                <th className="py-2.5 px-3 min-w-[190px]">No Surat 2</th>
                <th className="py-2.5 px-3 min-w-[190px]">No Surat 3</th>
                <th className="py-2.5 px-3 min-w-[190px]">No Surat 4</th>
                <th className="py-2.5 px-3 min-w-[190px]">No Surat 5</th>
                <th className="py-2.5 px-3 min-w-[190px]">No Surat 6</th>

                {/* K1 */}
                <th className="py-2.5 px-3 min-w-[110px]">AWAL K1</th>
                <th className="py-2.5 px-3 min-w-[110px]">AKHIR K1</th>
                <th className="py-2.5 px-3 min-w-[110px]">TTD1</th>

                {/* K2 */}
                <th className="py-2.5 px-3 min-w-[110px]">AWAL K2</th>
                <th className="py-2.5 px-3 min-w-[110px]">AKHIR K2</th>
                <th className="py-2.5 px-3 min-w-[110px]">TTD2</th>

                {/* K3 */}
                <th className="py-2.5 px-3 min-w-[110px]">AWAL K3</th>
                <th className="py-2.5 px-3 min-w-[110px]">AKHIR K3</th>
                <th className="py-2.5 px-3 min-w-[110px]">TTD3</th>

                {/* K4 */}
                <th className="py-2.5 px-3 min-w-[110px]">AWAL K4</th>
                <th className="py-2.5 px-3 min-w-[110px]">AKHIR K4</th>
                <th className="py-2.5 px-3 min-w-[110px]">TTD4</th>

                {/* K5 */}
                <th className="py-2.5 px-3 min-w-[110px]">AWAL K5</th>
                <th className="py-2.5 px-3 min-w-[110px]">AKHIR K5</th>
                <th className="py-2.5 px-3 min-w-[110px]">TTD5</th>

                {/* K6 */}
                <th className="py-2.5 px-3 min-w-[110px] bg-[#0089C4]">AWAL K6</th>
                <th className="py-2.5 px-3 min-w-[110px] bg-[#0089C4]">AKHIR K6</th>
                <th className="py-2.5 px-3 min-w-[110px] bg-[#0089C4]">TTD6</th>

                {/* Komponen Data Utama */}
                <th className="py-2.5 px-3 min-w-[110px]">MASA KONTRAK</th>
                <th className="py-2.5 px-3 min-w-[260px]">KET upah</th>
                <th className="py-2.5 px-3 min-w-[120px]">upah</th>
                <th className="py-2.5 px-3 min-w-[120px]">LOKASI KERJA</th>
                <th className="py-2.5 px-3 min-w-[120px]">TEMPAT</th>
                <th className="py-2.5 px-3 min-w-[120px]">TANGGAL LAHIR</th>
                <th className="py-2.5 px-3 min-w-[150px]">NO. KTP</th>
                <th className="py-2.5 px-3 min-w-[300px]">ALAMAT</th>
                <th className="py-2.5 px-3 min-w-[180px]">PROJECT</th>
                <th className="py-2.5 px-3 min-w-[140px]">NO REKENING</th>

                {/* Catatan Validasi Error & Aksi */}
                <th className="py-2.5 px-3 min-w-[240px]">CATATAN / ERROR</th>
                <th className="py-2.5 px-3 min-w-[90px] text-center sticky right-0 bg-[#00A2E8] z-30">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={40} className="py-12 text-center text-gray-400">
                    Tidak ada baris data yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isEditing = editingId === item.tempId;

                  return (
                    <tr 
                      key={item.tempId}
                      className={`hover:bg-slate-50/80 transition-colors divide-x divide-gray-100 group ${
                        item.status === 'error' ? 'bg-rose-50/30' : 
                        item.status === 'warning' ? 'bg-amber-50/30' : ''
                      } ${item.isSelected ? 'border-l-4 border-l-blue-600' : ''}`}
                    >
                      {/* Checkbox (sticky left-0) */}
                      <td className="py-2.5 px-3 text-center sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          disabled={item.status === 'error'}
                          onChange={() => handleToggleSelect(item.tempId)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                          title={item.status === 'error' ? 'Perbaiki error terlebih dahulu sebelum mencentang' : 'Pilih baris ini untuk diimpor'}
                        />
                      </td>

                      {/* Status Badge (sticky left-10) */}
                      <td className="py-2.5 px-3 sticky left-10 bg-white group-hover:bg-slate-50 z-10">
                        <div className="flex flex-col gap-1 items-start">
                          {item.isCompiled && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <Layers className="w-2.5 h-2.5 text-indigo-600" />
                              <span>Kompilasi ({item.compiledFromCount}x)</span>
                            </span>
                          )}
                          {!item.isCompiled && item.totalDuplicates && item.totalDuplicates > 1 && (
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${
                              item.duplicateOccurrence === 1 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                            }`}>
                              <span>
                                {item.duplicateOccurrence === 1 
                                  ? 'Induk (K1/K2)' 
                                  : `Duplikat #${item.duplicateOccurrence} → K${(item.duplicateOccurrence || 2) + 1}`}
                              </span>
                            </span>
                          )}
                          {item.status === 'valid' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          )}
                          {item.status === 'warning' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Perhatian</span>
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Error</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NO */}
                      <td className="py-2.5 px-3 text-center text-gray-500 font-mono text-[11px] font-bold">
                        {item.noUrut}
                      </td>

                      {/* NAMA KARYAWAN (TAMPIL DI DEPAN) */}
                      <td className="py-2 px-3 font-semibold text-gray-900 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.nama ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, nama: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 uppercase"
                            placeholder="NAMA KARYAWAN"
                          />
                        ) : (
                          <span className={!item.nama ? 'text-rose-600 font-bold italic' : 'uppercase font-bold'}>
                            {item.nama || '(Nama Kosong)'}
                          </span>
                        )}
                      </td>

                      {/* No Surat 1 s/d 6 */}
                      <td className="py-2 px-3 font-mono text-[10.5px]">
                        {renderSuratCell(item, 1, 'text-gray-800')}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10.5px]">
                        {renderSuratCell(item, 2, 'text-blue-700 font-medium')}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10.5px]">
                        {renderSuratCell(item, 3, 'text-emerald-700 font-medium')}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10.5px]">
                        {renderSuratCell(item, 4, 'text-indigo-700 font-medium')}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10.5px]">
                        {renderSuratCell(item, 5, 'text-amber-700 font-medium')}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10.5px]">
                        {renderSuratCell(item, 6, 'text-purple-700 font-medium')}
                      </td>

                      {/* AWAL K1 s/d TTD1 */}
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.awalK1)}</td>
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.akhirK1)}</td>
                      <td className="py-2 px-3 text-gray-600">{renderDateCell(item.ttd1)}</td>

                      {/* AWAL K2 s/d TTD2 */}
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.awalK2)}</td>
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.akhirK2)}</td>
                      <td className="py-2 px-3 text-gray-600">{renderDateCell(item.ttd2)}</td>

                      {/* AWAL K3 s/d TTD3 */}
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.awalK3)}</td>
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.akhirK3)}</td>
                      <td className="py-2 px-3 text-gray-600">{renderDateCell(item.ttd3)}</td>

                      {/* AWAL K4 s/d TTD4 */}
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.awalK4)}</td>
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.akhirK4)}</td>
                      <td className="py-2 px-3 text-gray-600">{renderDateCell(item.ttd4)}</td>

                      {/* AWAL K5 s/d TTD5 */}
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.awalK5)}</td>
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.akhirK5)}</td>
                      <td className="py-2 px-3 text-gray-600">{renderDateCell(item.ttd5)}</td>

                      {/* AWAL K6 s/d TTD6 */}
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.awalK6)}</td>
                      <td className="py-2 px-3 text-gray-700">{renderDateCell(item.akhirK6)}</td>
                      <td className="py-2 px-3 text-gray-600">{renderDateCell(item.ttd6)}</td>

                      {/* MASA KONTRAK */}
                      <td className="py-2 px-3 text-gray-700 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.masaKontrak ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, masaKontrak: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          item.masaKontrak || '3 Bulan'
                        )}
                      </td>

                      {/* KET upah */}
                      <td className="py-2 px-3 text-[11px] text-gray-600 truncate max-w-[280px]" title={item.ketUpah}>
                        {item.ketUpah || '-'}
                      </td>

                      {/* upah */}
                      <td className="py-2 px-3 font-mono text-[11px] font-bold text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData.upah ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, upah: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        ) : (
                          formatRupiah(item.upah)
                        )}
                      </td>

                      {/* LOKASI KERJA */}
                      <td className="py-2 px-3 text-gray-700 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.lokasiKerja ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, lokasiKerja: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          item.lokasiKerja || '-'
                        )}
                      </td>

                      {/* TEMPAT */}
                      <td className="py-2 px-3 text-gray-700">{item.tempatLahir || '-'}</td>

                      {/* TANGGAL LAHIR */}
                      <td className="py-2 px-3 text-gray-700 font-mono text-[11px]">{formatTanggalIndonesia(item.tanggalLahir) || '-'}</td>

                      {/* NO. KTP */}
                      <td className="py-2 px-3 font-mono text-[11px] text-gray-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.noKtp ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, noKtp: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                            placeholder="16 Digit NIK"
                          />
                        ) : (
                          <span className={!cleanNoKtp(item.noKtp) ? 'text-rose-600 font-bold italic' : ''}>
                            {cleanNoKtp(item.noKtp) || '(NIK Kosong)'}
                          </span>
                        )}
                      </td>

                      {/* ALAMAT */}
                      <td className="py-2 px-3 text-gray-600 truncate max-w-[320px]" title={item.alamat}>
                        {item.alamat || '-'}
                      </td>

                      {/* PROJECT */}
                      <td className="py-2 px-3 text-gray-800 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.project ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, project: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          item.project || '-'
                        )}
                      </td>

                      {/* NO REKENING */}
                      <td className="py-2 px-3 font-mono text-[11px] text-gray-700">
                        {item.noRekening || '-'}
                      </td>

                      {/* Catatan / Pesan Validasi Error */}
                      <td className="py-2 px-3">
                        <div className="space-y-1 max-w-[260px]">
                          {item.isCompiled && (
                            <span className="inline-block bg-indigo-100 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 mr-1 mb-0.5">
                              ⚡ Kompilasi {item.compiledFromCount} baris NIK (Fase aktif: {item.currentContractPhase})
                            </span>
                          )}
                          {item.errors.map((err, errIdx) => (
                            <span 
                              key={errIdx}
                              className="inline-block bg-rose-100 text-rose-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-rose-200 mr-1 mb-0.5"
                            >
                              ❌ {err}
                            </span>
                          ))}
                          {item.warnings.map((warn, warnIdx) => (
                            <span 
                              key={warnIdx}
                              className="inline-block bg-amber-100 text-amber-800 text-[10px] font-medium px-2 py-0.5 rounded border border-amber-200 mr-1 mb-0.5"
                            >
                              ⚠️ {warn}
                            </span>
                          ))}
                          {item.errors.length === 0 && item.warnings.length === 0 && !item.isCompiled && (
                            <span className="text-emerald-600 text-[10.5px] font-semibold">
                              ✓ Siap Diimpor
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi Baris (sticky right-0) */}
                      <td className="py-2.5 px-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleSaveEdit(item.tempId)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Simpan Perbaikan Data"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
                              title="Batal Edit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Perbaiki / Edit Baris Ini"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setRowToDelete(item)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus Baris Ini dari Impor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-gray-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 text-xs text-gray-600">
            <span>
              Terpilih: <strong className="text-gray-900 font-bold">{stats.selected}</strong> dari {stats.total} baris
            </span>
            {stats.error > 0 && (
              <span className="text-rose-600 font-semibold flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>({stats.error} baris error belum diperbaiki)</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={isSubmitting || stats.selected === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Sedang Mengimpor Data...' 
                  : `Impor ${stats.selected} Data Karyawan ke Database`}
              </span>
            </button>
          </div>
        </div>

        {/* Loading Progress Modal with Prominent Percentage */}
        {importProgress && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              {/* Animated database icon */}
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
                  <Database className="w-8 h-8 animate-pulse text-blue-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md animate-spin">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Mengimpor Database Karyawan...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Menyimpan data karyawan ke dalam database Firestore
              </p>

              {/* Big Prominent Percentage Number */}
              <div className="my-5 flex flex-col items-center">
                <span className="text-5xl font-black font-mono tracking-tight text-blue-600">
                  {importProgress.percent}%
                </span>
                <span className="text-xs font-semibold text-slate-600 mt-1.5">
                  {importProgress.current} dari {importProgress.total} Data Karyawan
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${importProgress.percent}%` }}
                />
              </div>

              {/* Currently Processing Info */}
              <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sedang Menyimpan:
                </div>
                <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {importProgress.currentName || 'Menyiapkan data...'}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-4 italic">
                Harap jangan menutup browser selama proses impor berlangsung.
              </p>
            </div>
          </div>
        )}

        {/* Modal Pengelolaan Multi-Input Kontrak (No Surat, Tanggal & TTD Ganda) */}
        {multiInputTarget && (
          <ContractMultiInputModal
            isOpen={true}
            onClose={() => setMultiInputTarget(null)}
            phaseLabel={multiInputTarget.phaseLabel}
            phaseKey={multiInputTarget.phaseKey}
            employeeName={multiInputTarget.employeeName}
            employeeNo={multiInputTarget.employeeNo}
            initialNoSurat={multiInputTarget.initialNoSurat}
            initialAwal={multiInputTarget.initialAwal}
            initialAkhir={multiInputTarget.initialAkhir}
            initialTtd={multiInputTarget.initialTtd}
            onSave={handleSaveMultiInput}
          />
        )}

        {/* Modal Konfirmasi Hapus Baris Pratinjau (Yes / No) */}
        {rowToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">Hapus Baris dari Pratinjau?</h3>
                    <p className="text-xs text-rose-600 font-semibold">Konfirmasi Hapus (Yes / No)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRowToDelete(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus baris karyawan berikut dari daftar pratinjau impor?
              </p>

              <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
                <p className="font-extrabold uppercase text-gray-950">{rowToDelete.nama}</p>
                <p className="text-[11px] text-rose-800 font-mono">NIK: {rowToDelete.noKtp || '(NIK Kosong)'}</p>
                <p className="text-[11px] text-gray-700">Project: {rowToDelete.project || '-'}</p>
                <p className="text-[11px] text-gray-700">Fase Aktif: <span className="font-bold text-blue-700">{rowToDelete.currentContractPhase || 'K1'}</span></p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRowToDelete(null)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tidak, Batalkan (No)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteRow(rowToDelete.tempId);
                    setRowToDelete(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Baris (Yes)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Entri Ganda Kontrak (Yes / No) */}
        {entryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">Hapus Entri Kontrak Ganda?</h3>
                    <p className="text-xs text-amber-600 font-semibold">Konfirmasi Hapus Entri (Yes / No)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus nomor surat/tanggal berikut dari Kontrak {entryToDelete.phaseNum} untuk karyawan <strong>{entryToDelete.employeeName}</strong>?
              </p>

              <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs text-amber-950 font-mono">
                <span className="font-bold">Nomor Surat / Entri:</span> {entryToDelete.surat}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tidak, Batalkan (No)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveEntryFromItem(entryToDelete.tempId, entryToDelete.phaseNum, entryToDelete.entryIndex);
                    setEntryToDelete(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Entri (Yes)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
