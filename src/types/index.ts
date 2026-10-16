export type ContractPhase = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'PKWTT';

export type EmployeeStatus = 'PKWT' | 'PKWTT' | 'SELESAI' | 'NONAKTIF';

export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

export interface Employee {
  id: string;
  no: number;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string; // DD/MM/YYYY
  jenisKelamin: 'Laki-Laki' | 'Perempuan';
  noKtp: string;
  alamat: string;
  project: string;
  lokasiKerja: string;
  noRekening: string;
  bank: string;
  jabatan: string;
  golongan: string;
  upah: number;
  ketUpah: string;
  masaKontrak: string;
  email: string;
  noHp: string;
  statusKaryawan: EmployeeStatus;
  currentContractPhase: ContractPhase;

  // Nomor Surat 1 s/d 6 sesuai jumlah perpanjangan kontrak
  noSurat1?: string;
  noSurat2?: string;
  noSurat3?: string;
  noSurat4?: string;
  noSurat5?: string;
  noSurat6?: string;

  // Tanggal awal, akhir, ttd K1 s/d K6
  awalK1?: string;
  akhirK1?: string;
  ttd1?: string;

  awalK2?: string;
  akhirK2?: string;
  ttd2?: string;

  awalK3?: string;
  akhirK3?: string;
  ttd3?: string;

  awalK4?: string;
  akhirK4?: string;
  ttd4?: string;

  awalK5?: string;
  akhirK5?: string;
  ttd5?: string;

  awalK6?: string;
  akhirK6?: string;
  ttd6?: string;

  ttdKaryawanUrl?: string; // Optional uploaded signature image

  createdAt?: string;
  updatedAt?: string;
}

export type ContractStatus = 'DRAFT' | 'SIGNED_BY_EMPLOYEE' | 'SIGNED_BY_DIRECTOR' | 'COMPLETED';

export interface ContractDocumentData {
  id: string;
  employeeId: string;
  nomorSurat: string;
  nomorSuratSebelumnya?: string;
  tanggalSuratSebelumnya?: string;
  periodeAwalSebelumnya?: string;
  periodeAkhirSebelumnya?: string;
  jenisPerjanjian: 'PKWT' | 'PKWTT';
  phase: ContractPhase;
  isInitialContract?: boolean; // True for K1 (Kontrak 1 Baru), False for K2..K6 (Perpanjangan)
  
  // Pihak Pertama (Company)
  namaPihakPertama: string;
  wakilPihakPertama: string;
  jabatanPihakPertama: string;
  alamatPihakPertama: string;
  telpPihakPertama: string;
  faxPihakPertama: string;
  logoPerusahaanUrl?: string;
  logoIsoUrl?: string;

  // Pihak Kedua (Employee)
  namaKaryawan: string;
  nikKaryawan: string;
  tempatTanggalLahir: string;
  jenisKelamin: 'Laki-Laki' | 'Perempuan';
  alamatKaryawan: string;

  // Syarat Kerja
  jabatanKaryawan: string;
  golonganJabatan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  masaKontrak: string;
  upah: number;
  ketUpah: string;
  namaBank: string;
  noRekening: string;
  atasNamaRekening: string;

  // Pengesahan
  tempatTtd: string;
  tanggalTtd: string;
  ttdKaryawan?: string;
  ttdPerusahaan?: string;
  statusTtd: ContractStatus;
  signedAtKaryawan?: string;
  signedAtPerusahaan?: string;
  docHash?: string;

  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  employeeId: string;
  namaKaryawan: string;
  type: 'WHATSAPP' | 'EMAIL';
  recipient: string;
  message: string;
  status: 'SENT' | 'SCHEDULED' | 'FAILED';
  contractEndDate: string;
  daysRemaining: number;
  sentAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface PaklaringDocumentData {
  id: string;
  employeeId: string;
  nomorSurat: string;
  namaKaryawan: string;
  nikKaryawan: string;
  alamatKaryawan: string;
  jabatanTerakhir: string;
  lokasiKerja: string;
  periodeAwal: string;
  periodeAkhir: string;
  alasanBerakhir: string;
  tanggalCetak: string;
  tempatCetak: string;
  namaDirektur: string;
  jabatanDirektur: string;
}

export interface MasterDataSettings {
  lastSequenceNumber: number; // Nomor urut terakhir yang diterbitkan
  kodeDivisi: string; // Default: 'AKY-HRD'
  namaPerusahaan: string; // 'PT. ANDHANA KIRANA YASA'
  namaDirektur: string; // 'GIMMY KURNIAWAN IMANTO'
  jabatanDirektur: string; // 'Direktur'
  alamatPerusahaan: string;
  teleponPerusahaan: string;
  faxPerusahaan: string;
}
