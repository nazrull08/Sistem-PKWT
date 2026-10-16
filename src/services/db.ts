import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Employee, ContractDocumentData, NotificationLog, UserRole, MasterDataSettings } from '../types';
import { cleanNoKtp, cleanExcelTextNumber } from '../utils/cleanText';

export const DEFAULT_MASTER_DATA: MasterDataSettings = {
  lastSequenceNumber: 0,
  kodeDivisi: 'AKY-HRD',
  namaPerusahaan: 'PT. ANDHANA KIRANA YASA',
  namaDirektur: 'GIMMY KURNIAWAN IMANTO',
  jabatanDirektur: 'Direktur',
  alamatPerusahaan: 'Bukit Gading Raya Blok N No. 11, Kelapa Gading Barat – Kelapa Gading, Jakarta Utara - 14240',
  teleponPerusahaan: '021 - 4516027',
  faxPerusahaan: '021 - 45852414'
};

const MASTER_DATA_STORAGE_KEY = 'aky_master_data_settings_v1';
const masterSettingsSubscribers = new Set<(settings: MasterDataSettings) => void>();

export function getMasterDataSettings(): MasterDataSettings {
  try {
    const raw = localStorage.getItem(MASTER_DATA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_MASTER_DATA, ...parsed };
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_MASTER_DATA;
}

export async function saveMasterDataSettings(settings: MasterDataSettings): Promise<void> {
  try {
    localStorage.setItem(MASTER_DATA_STORAGE_KEY, JSON.stringify(settings));
    masterSettingsSubscribers.forEach(cb => {
      try { cb(settings); } catch (e) { console.error(e); }
    });
    await setDoc(doc(db, 'settings', 'master'), settings);
  } catch (e) {
    console.error('Error saving master data settings to Firestore:', e);
  }
}

export function subscribeMasterSettings(callback: (settings: MasterDataSettings) => void) {
  masterSettingsSubscribers.add(callback);
  callback(getMasterDataSettings());

  const unsub = onSnapshot(doc(db, 'settings', 'master'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as MasterDataSettings;
      const merged = { ...DEFAULT_MASTER_DATA, ...data };
      localStorage.setItem(MASTER_DATA_STORAGE_KEY, JSON.stringify(merged));
      masterSettingsSubscribers.forEach(cb => {
        try { cb(merged); } catch (e) { console.error(e); }
      });
    }
  }, (err) => {
    console.warn('Master settings subscription fallback:', err.message);
  });

  return () => {
    masterSettingsSubscribers.delete(callback);
    unsub();
  };
}

export function extractNoUrutFromSurat(noSurat?: string): string | null {
  if (!noSurat) return null;
  const match = noSurat.trim().match(/^(\d+)\//);
  if (match) return match[1].padStart(3, '0');
  return null;
}

export async function recordIssuedSequence(seqNumber: number | string): Promise<void> {
  let num = typeof seqNumber === 'string' ? parseInt(seqNumber, 10) : seqNumber;
  if (isNaN(num)) {
    const extracted = extractNoUrutFromSurat(String(seqNumber));
    if (extracted) num = parseInt(extracted, 10);
  }
  if (!isNaN(num) && num > 0) {
    const master = getMasterDataSettings();
    if (num > master.lastSequenceNumber) {
      master.lastSequenceNumber = num;
      await saveMasterDataSettings(master);
    }
  }
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    no: 1,
    nama: 'AHMAD DAMAN HURI',
    tempatLahir: 'JAKARTA',
    tanggalLahir: '06/06/2000',
    jenisKelamin: 'Laki-Laki',
    noKtp: '3172030611050004',
    alamat: 'JLN PLUMPANG SEMPER NO 6 RT 1 RW 12 TUGU UTARA KOJA JAKARTA UTARA DKI JAKARTA',
    project: '006/AKY-HRD/PKWT-II/XII/2025',
    lokasiKerja: 'Jakarta',
    noRekening: '5745940924',
    bank: 'BCA',
    jabatan: 'Operator',
    golongan: '0A',
    upah: 5625883,
    ketUpah: 'Lima Juta Enam Ratus Dua Puluh Lima Ribu Delapan Ratus Delapan Puluh Tiga Rupiah',
    masaKontrak: '3 Bulan',
    email: 'ahmad.damanhuri@example.com',
    noHp: '6281234567801',
    statusKaryawan: 'PKWT',
    currentContractPhase: 'K2',
    noSurat1: '001/AKY-HRD/PKWT-I/VI/2025',
    noSurat2: '006/AKY-HRD/PKWT-II/XII/2025',
    awalK1: '24 Desember 2025',
    akhirK1: '25 Juni 2025',
    ttd1: '22 Desember 2025',
    awalK2: '25 Desember 2025',
    akhirK2: '30 Maret 2026',
    ttd2: '22 Desember 2025',
  },
  {
    id: 'emp-2',
    no: 2,
    nama: 'MUHAMMAD KHAIRUL ANAM',
    tempatLahir: 'PEMALANG',
    tanggalLahir: '03/01/1996',
    jenisKelamin: 'Laki-Laki',
    noKtp: '3327120301960002',
    alamat: 'PURWOHARJO RT06/RW07 KEC.COMAL KAB.PEMALANG PURWOHARJO COMAL PEMALANG JAWA TENGAH 52363',
    project: '007/AKY-HRD/PKWT-II/XII/2025',
    lokasiKerja: 'Jakarta',
    noRekening: '1289401294',
    bank: 'Mandiri',
    jabatan: 'Operator Senior',
    golongan: '0B',
    upah: 6391468,
    ketUpah: 'Enam Juta Tiga Ratus Sembilan Puluh Satu Ribu Empat Ratus Enam Puluh Delapan Rupiah',
    masaKontrak: '3 Bulan',
    email: 'khairul.anam@example.com',
    noHp: '6281234567802',
    statusKaryawan: 'PKWT',
    currentContractPhase: 'K2',
    noSurat1: '002/AKY-HRD/PKWT-I/VI/2025',
    noSurat2: '007/AKY-HRD/PKWT-II/XII/2025',
    awalK1: '30 Desember 2025',
    akhirK1: '01 Juli 2025',
    ttd1: '28 Desember 2025',
    awalK2: '31 Desember 2025',
    akhirK2: '31 Maret 2026',
    ttd2: '28 Desember 2025',
  },
  {
    id: 'emp-3',
    no: 3,
    nama: 'UMAR NURPAD NAJIB',
    tempatLahir: 'BEKASI',
    tanggalLahir: '15/03/1996',
    jenisKelamin: 'Laki-Laki',
    noKtp: '3216181503960008',
    alamat: 'KP. SERANG RT006 RW002 TAMANSARI SETU BEKASI JAWA BARAT 17320',
    project: '008/AKY-HRD/PKWT-II/XII/2025',
    lokasiKerja: 'Jakarta',
    noRekening: '4920194812',
    bank: 'BNI',
    jabatan: 'Operator Senior',
    golongan: '0B',
    upah: 6391468,
    ketUpah: 'Enam Juta Tiga Ratus Sembilan Puluh Satu Ribu Empat Ratus Enam Puluh Delapan Rupiah',
    masaKontrak: '3 Bulan',
    email: 'umar.nurpad@example.com',
    noHp: '6281234567803',
    statusKaryawan: 'PKWT',
    currentContractPhase: 'K2',
    noSurat1: '003/AKY-HRD/PKWT-I/VI/2025',
    noSurat2: '008/AKY-HRD/PKWT-II/XII/2025',
    awalK1: '30 Desember 2025',
    akhirK1: '01 Juli 2025',
    ttd1: '28 Desember 2025',
    awalK2: '31 Desember 2025',
    akhirK2: '31 Maret 2026',
    ttd2: '28 Desember 2025',
  },
  {
    id: 'emp-4',
    no: 4,
    nama: 'AKBAR MAULANA',
    tempatLahir: 'KUNINGAN',
    tanggalLahir: '21-Jun-1996',
    jenisKelamin: 'Laki-Laki',
    noKtp: '3208152106960001',
    alamat: 'JLN. H. NILAM KP. RAWAJULANG RT/RW.004/002 DES. MEKARWANGI, KEC. CIKARANG BARAT KAB.BEKASI 17842',
    project: '009/AKY-HRD/PKWT-II/I/2026',
    lokasiKerja: 'Bekasi',
    noRekening: '3819401829',
    bank: 'BRI',
    jabatan: 'Operator Senior',
    golongan: '0B',
    upah: 6391468,
    ketUpah: 'Enam Juta Tiga Ratus Sembilan Puluh Satu Ribu Empat Ratus Enam Puluh Delapan Rupiah',
    masaKontrak: '3 Bulan',
    email: 'akbar.maulana@example.com',
    noHp: '6281234567804',
    statusKaryawan: 'PKWT',
    currentContractPhase: 'K2',
    noSurat1: '004/AKY-HRD/PKWT-I/VIII/2025',
    noSurat2: '009/AKY-HRD/PKWT-II/I/2026',
    awalK1: '31 Desember 2025',
    akhirK1: '26 Agustus 2025',
    ttd1: '28 Desember 2025',
    awalK2: '01 Januari 2026',
    akhirK2: '31 Maret 2026',
    ttd2: '28 Desember 2025',
  },
  {
    id: 'emp-5',
    no: 5,
    nama: 'ALFIAN',
    tempatLahir: 'BANDAR LAMPUNG',
    tanggalLahir: '23 Februari 2002',
    jenisKelamin: 'Laki-Laki',
    noKtp: '3215052302020001',
    alamat: 'DUSUN KLAPA NUNGGAL RT 26/07, DESA. GINTUNGKERTA, KEC. KLARI, KAB. KARAWANG',
    project: '011/AKY-HRD/PKWT-III/X/2026',
    lokasiKerja: 'Karawang',
    noRekening: '5745940924',
    bank: 'BCA',
    jabatan: 'Operator',
    golongan: '0A',
    upah: 5910371,
    ketUpah: 'Lima Juta Sembilan Ratus Sepuluh Ribu Tiga Ratus Tujuh Puluh Satu',
    masaKontrak: '9 Bulan',
    email: 'alfian.karawang@example.com',
    noHp: '6281298765432',
    statusKaryawan: 'PKWT',
    currentContractPhase: 'K3',
    noSurat1: '005/AKY-HRD/PKWT-I/X/2025',
    noSurat2: '010/AKY-HRD/PKWT-II/IV/2026',
    noSurat3: '011/AKY-HRD/PKWT-III/X/2026',
    awalK1: '01 Oktober 2025',
    akhirK1: '31 Maret 2026',
    ttd1: '28 September 2025',
    awalK2: '01 April 2026',
    akhirK2: '30 September 2026',
    ttd2: '28 Maret 2026',
    awalK3: '01 Oktober 2026',
    akhirK3: '30 Juni 2027',
    ttd3: '28 September 2026',
  }
];

export const INITIAL_CONTRACTS: ContractDocumentData[] = [
  {
    id: 'contract-alfian-k3',
    employeeId: 'emp-5',
    nomorSurat: '011/AKY-HRD/PKWT-III/X/2026',
    nomorSuratSebelumnya: '010/AKY-HRD/PKWT-II/IV/2026',
    tanggalSuratSebelumnya: '01 April 2026',
    periodeAwalSebelumnya: '01 April 2026',
    periodeAkhirSebelumnya: '30 September 2026',
    jenisPerjanjian: 'PKWT',
    phase: 'K3',
    namaPihakPertama: 'PT. ANDHANA KIRANA YASA',
    wakilPihakPertama: 'GIMMY KURNIAWAN IMANTO',
    jabatanPihakPertama: 'Direktur',
    alamatPihakPertama: 'Bukit Gading Raya Blok N No. 11, Kelapa Gading Barat – Kelapa Gading, Jakarta Utara - 14240',
    telpPihakPertama: '021 - 4516027',
    faxPihakPertama: '021 - 45852414',
    namaKaryawan: 'ALFIAN',
    nikKaryawan: '3215052302020001',
    tempatTanggalLahir: 'BANDAR LAMPUNG , 23 Februari 2002',
    jenisKelamin: 'Laki-Laki',
    alamatKaryawan: 'DUSUN KLAPA NUNGGAL RT 26/07, DESA. GINTUNGKERTA, KEC. KLARI, KAB. KARAWANG',
    jabatanKaryawan: 'Operator',
    golonganJabatan: '0A',
    tanggalMulai: '01 Oktober 2026',
    tanggalSelesai: '30 Juni 2027',
    masaKontrak: '9 Bulan',
    upah: 5910371,
    ketUpah: 'Lima Juta Sembilan Ratus Sepuluh Ribu Tiga Ratus Tujuh Puluh Satu',
    namaBank: 'BCA',
    noRekening: '5745940924',
    atasNamaRekening: 'ALFIAN',
    tempatTtd: 'Jakarta',
    tanggalTtd: '28 September 2026',
    statusTtd: 'COMPLETED',
    signedAtKaryawan: '2026-09-28T10:15:00Z',
    signedAtPerusahaan: '2026-09-28T14:30:00Z',
    docHash: 'AKY-PKWT-206-III-2026-VERIFIED-SEAL',
    createdAt: '2026-09-28T09:00:00Z',
    updatedAt: '2026-09-28T14:30:00Z'
  }
];

const LOCAL_STORAGE_EMPLOYEES_KEY = 'aky_pkwt_employees_v2';
const LOCAL_STORAGE_CONTRACTS_KEY = 'aky_pkwt_contracts_v2';
const LOCAL_STORAGE_LOGS_KEY = 'aky_pkwt_notif_logs_v1';

// In-memory or localStorage cache helper
const LOCAL_STORAGE_DELETED_IDS_KEY = 'aky_pkwt_deleted_emp_ids_v1';

export function getDeletedEmployeeIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_IDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function addDeletedEmployeeId(id: string) {
  try {
    const set = getDeletedEmployeeIds();
    set.add(id);
    localStorage.setItem(LOCAL_STORAGE_DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function removeDeletedEmployeeId(id: string) {
  try {
    const set = getDeletedEmployeeIds();
    set.delete(id);
    localStorage.setItem(LOCAL_STORAGE_DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getLocalEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EMPLOYEES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const deleted = getDeletedEmployeeIds();
        return parsed.filter(e => !deleted.has(e.id));
      }
    } else {
      // Migrate from v1 if present, preserving any user-added employees
      const oldRaw = localStorage.getItem('aky_pkwt_employees_v1');
      if (oldRaw) {
        try {
          const oldParsed: Employee[] = JSON.parse(oldRaw);
          const customEmps = oldParsed.filter(e => !INITIAL_EMPLOYEES.some(init => init.id === e.id));
          const combined = [...INITIAL_EMPLOYEES, ...customEmps];
          saveLocalEmployees(combined);
          return combined;
        } catch {}
      }
    }
  } catch (e) {
    console.error('Error reading local employees:', e);
  }
  const initialCopy = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
  saveLocalEmployees(initialCopy);
  return initialCopy;
}

export function saveLocalEmployees(data: Employee[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EMPLOYEES_KEY, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

export function getLocalContracts(): ContractDocumentData[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONTRACTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return JSON.parse(JSON.stringify(INITIAL_CONTRACTS));
}

export function saveLocalContracts(data: ContractDocumentData[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONTRACTS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

export function getLocalLogs(): NotificationLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveLocalLogs(data: NotificationLog[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

// Reactive Subscribers for instant UI updates
const employeeSubscribers = new Set<(employees: Employee[]) => void>();
const contractSubscribers = new Set<(contracts: ContractDocumentData[]) => void>();

function notifyEmployeeSubscribers(data: Employee[]) {
  employeeSubscribers.forEach(cb => {
    try {
      cb([...data]);
    } catch (e) {
      console.error(e);
    }
  });
}

function notifyContractSubscribers(data: ContractDocumentData[]) {
  contractSubscribers.forEach(cb => {
    try {
      cb([...data]);
    } catch (e) {
      console.error(e);
    }
  });
}

// Subscribe to employees from Firestore with fallback to LocalStorage & local reactivity
export function subscribeEmployees(callback: (employees: Employee[]) => void) {
  employeeSubscribers.add(callback);

  // Set initial cache first
  const cached = getLocalEmployees();
  callback([...cached]);

  const colRef = collection(db, 'employees');
  const unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
    const deletedIds = getDeletedEmployeeIds();
    if (!snapshot.empty) {
      const firestoreList: Employee[] = [];
      snapshot.forEach(docSnap => {
        if (!deletedIds.has(docSnap.id)) {
          firestoreList.push({ ...(docSnap.data() as Employee), id: docSnap.id });
        }
      });

      // Merge local cache with Firestore
      const localList = getLocalEmployees().filter(e => !deletedIds.has(e.id));
      const map = new Map<string, Employee>();
      firestoreList.forEach(e => map.set(e.id, e));
      localList.forEach(e => {
        if (!map.has(e.id)) {
          map.set(e.id, e);
        }
      });

      const merged = Array.from(map.values());
      merged.sort((a, b) => (a.no || 0) - (b.no || 0));
      saveLocalEmployees(merged);
      notifyEmployeeSubscribers(merged);
    } else {
      // If Firestore collection is empty, seed from current local records
      seedInitialDataToFirestore();
      notifyEmployeeSubscribers(getLocalEmployees());
    }
  }, (err) => {
    console.warn('Firestore employees snapshot subscription note:', err.message);
    callback(getLocalEmployees());
  });

  return () => {
    employeeSubscribers.delete(callback);
    unsubscribeFirestore();
  };
}

// Seed initial records to Firestore
export async function seedInitialDataToFirestore() {
  try {
    const current = getLocalEmployees();
    for (const emp of current) {
      await setDoc(doc(db, 'employees', emp.id), emp);
    }
    const contracts = getLocalContracts();
    for (const contract of contracts) {
      await setDoc(doc(db, 'contracts', contract.id), contract);
    }
  } catch (error) {
    console.warn('Seeding to Firestore skipped or pending:', error);
  }
}

// Helper to strip undefined values so Firestore setDoc never throws invalid field value
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned as T;
}

// Add or update employee (Create & Update) - Optimistic instant update
export async function saveEmployee(employee: Employee): Promise<void> {
  if (!employee) return;

  // Sanitize all fields to guarantee valid, defined data
  const sanitized: Employee = {
    ...employee,
    id: employee.id || `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    no: Number(employee.no) || 1,
    nama: (employee.nama || '').toString().trim(),
    noKtp: cleanNoKtp(employee.noKtp),
    tempatLahir: (employee.tempatLahir || '').toString().trim(),
    tanggalLahir: (employee.tanggalLahir || '').toString().trim(),
    jenisKelamin: employee.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-Laki',
    alamat: (employee.alamat || '').toString().trim(),
    project: (employee.project || '').toString().trim(),
    lokasiKerja: (employee.lokasiKerja || '').toString().trim(),
    noRekening: cleanExcelTextNumber(employee.noRekening),
    bank: (employee.bank || '').toString().trim(),
    jabatan: (employee.jabatan || '').toString().trim(),
    golongan: (employee.golongan || '').toString().trim(),
    upah: Number(employee.upah) || 0,
    ketUpah: (employee.ketUpah || '').toString().trim(),
    masaKontrak: (employee.masaKontrak || '3 Bulan').toString().trim(),
    email: (employee.email || '').toString().trim(),
    noHp: cleanExcelTextNumber(employee.noHp),
    statusKaryawan: employee.statusKaryawan || 'PKWT',
    currentContractPhase: employee.currentContractPhase || 'K1',
    noSurat1: (employee.noSurat1 || '').toString().trim(),
    awalK1: (employee.awalK1 || '').toString().trim(),
    akhirK1: (employee.akhirK1 || '').toString().trim(),
    ttd1: (employee.ttd1 || '').toString().trim(),
    noSurat2: (employee.noSurat2 || '').toString().trim(),
    awalK2: (employee.awalK2 || '').toString().trim(),
    akhirK2: (employee.akhirK2 || '').toString().trim(),
    ttd2: (employee.ttd2 || '').toString().trim(),
    noSurat3: (employee.noSurat3 || '').toString().trim(),
    awalK3: (employee.awalK3 || '').toString().trim(),
    akhirK3: (employee.akhirK3 || '').toString().trim(),
    ttd3: (employee.ttd3 || '').toString().trim(),
    noSurat4: (employee.noSurat4 || '').toString().trim(),
    awalK4: (employee.awalK4 || '').toString().trim(),
    akhirK4: (employee.akhirK4 || '').toString().trim(),
    ttd4: (employee.ttd4 || '').toString().trim(),
    noSurat5: (employee.noSurat5 || '').toString().trim(),
    awalK5: (employee.awalK5 || '').toString().trim(),
    akhirK5: (employee.akhirK5 || '').toString().trim(),
    ttd5: (employee.ttd5 || '').toString().trim(),
    noSurat6: (employee.noSurat6 || '').toString().trim(),
    awalK6: (employee.awalK6 || '').toString().trim(),
    akhirK6: (employee.akhirK6 || '').toString().trim(),
    ttd6: (employee.ttd6 || '').toString().trim(),
    ttdKaryawanUrl: employee.ttdKaryawanUrl || '',
    createdAt: employee.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Remove from deleted set if re-added
  removeDeletedEmployeeId(sanitized.id);

  // Update local storage first
  const current = getLocalEmployees();
  const idx = current.findIndex(e => e.id === sanitized.id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...sanitized };
  } else {
    current.push({ ...sanitized });
  }
  // Sort by no
  current.sort((a, b) => (a.no || 0) - (b.no || 0));
  saveLocalEmployees(current);
  
  // Instantly notify all UI subscribers!
  notifyEmployeeSubscribers([...current]);

  // Sync to Firestore in background without blocking immediate UI reactivity
  try {
    const ref = doc(db, 'employees', sanitized.id);
    const firestoreData = cleanForFirestore(sanitized);
    await Promise.race([
      setDoc(ref, firestoreData),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
  } catch (error) {
    console.warn('Background Firestore sync employee error/fallback:', error);
  }
}

// Delete employee (Delete) - Optimistic instant deletion
export async function deleteEmployeeRecord(id: string): Promise<void> {
  addDeletedEmployeeId(id);

  const current = getLocalEmployees().filter(e => e.id !== id);
  saveLocalEmployees(current);
  
  // Instantly notify all UI subscribers!
  notifyEmployeeSubscribers([...current]);

  // Sync to Firestore in background
  (async () => {
    try {
      await Promise.race([
        deleteDoc(doc(db, 'employees', id)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
    } catch (error) {
      console.warn('Background Firestore delete error/fallback:', error);
    }
  })();
}

// Bulk delete employees (Multiple Delete) - Optimistic instant deletion
export async function deleteMultipleEmployeeRecords(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  ids.forEach(id => addDeletedEmployeeId(id));

  const current = getLocalEmployees().filter(e => !idSet.has(e.id));
  saveLocalEmployees(current);

  // Instantly notify all UI subscribers!
  notifyEmployeeSubscribers([...current]);

  // Sync to Firestore in background
  (async () => {
    try {
      await Promise.all(
        ids.map(id =>
          Promise.race([
            deleteDoc(doc(db, 'employees', id)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]).catch(err => console.warn('Bulk delete single item err:', err))
        )
      );
    } catch (error) {
      console.warn('Background Firestore bulk delete error:', error);
    }
  })();
}

// Subscribe to contracts
export function subscribeContracts(callback: (contracts: ContractDocumentData[]) => void) {
  contractSubscribers.add(callback);
  const colRef = collection(db, 'contracts');
  const cached = getLocalContracts();
  callback(cached);

  const unsubscribe = onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const list: ContractDocumentData[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...(docSnap.data() as ContractDocumentData), id: docSnap.id });
      });
      saveLocalContracts(list);
      notifyContractSubscribers(list);
    } else {
      notifyContractSubscribers(cached);
    }
  }, (err) => {
    console.warn('Firestore contracts snapshot fallback:', err.message);
    callback(getLocalContracts());
  });

  return () => {
    contractSubscribers.delete(callback);
    unsubscribe();
  };
}

// Save contract
export async function saveContract(contract: ContractDocumentData): Promise<void> {
  const current = getLocalContracts();
  const idx = current.findIndex(c => c.id === contract.id);
  if (idx >= 0) {
    current[idx] = contract;
  } else {
    current.unshift(contract);
  }
  saveLocalContracts(current);
  notifyContractSubscribers(current);

  try {
    await setDoc(doc(db, 'contracts', contract.id), contract);
  } catch (error) {
    console.warn('Error saving contract to Firestore, saved locally:', error);
  }
}

// Add notification log
export async function logNotification(log: NotificationLog): Promise<void> {
  const current = getLocalLogs();
  current.unshift(log);
  saveLocalLogs(current);

  try {
    await setDoc(doc(db, 'notification_logs', log.id), log);
  } catch (error) {
    console.warn('Error logging notification to Firestore:', error);
  }
}

// Subscribe to notification logs
export function subscribeLogs(callback: (logs: NotificationLog[]) => void) {
  const colRef = collection(db, 'notification_logs');
  callback(getLocalLogs());

  const unsubscribe = onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const list: NotificationLog[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...(docSnap.data() as NotificationLog), id: docSnap.id });
      });
      saveLocalLogs(list);
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore logs subscription fallback:', err.message);
    callback(getLocalLogs());
  });

  return unsubscribe;
}
