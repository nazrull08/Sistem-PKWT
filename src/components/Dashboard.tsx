import React from 'react';
import { Employee, ContractDocumentData, NotificationLog } from '../types';
import { getDaysRemaining } from '../utils/date';
import { 
  Users, 
  FileCheck2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  ShieldCheck, 
  Send, 
  CheckCircle, 
  FileText,
  TrendingUp,
  Flame,
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  contracts: ContractDocumentData[];
  logs: NotificationLog[];
  onOpenNotification: (employee: Employee) => void;
  onOpenContract: (employee: Employee) => void;
  onNavigateToTable: (employee?: Employee) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  employees,
  contracts,
  logs,
  onOpenNotification,
  onOpenContract,
  onNavigateToTable
}) => {
  // Aggregate statistics
  const totalEmployees = employees.length;
  const pkwttCount = employees.filter(e => e.statusKaryawan === 'PKWTT').length;
  const pkwtActive = employees.filter(e => e.statusKaryawan === 'PKWT').length;

  // Contracts expiring within 30 days
  const expiringEmployees = employees.filter(e => {
    const activeExpiry = e.akhirK3 || e.akhirK2 || e.akhirK1;
    const days = getDaysRemaining(activeExpiry);
    return days !== null && days >= 0 && days <= 30;
  });

  // Expired contracts
  const expiredEmployees = employees.filter(e => {
    const activeExpiry = e.akhirK3 || e.akhirK2 || e.akhirK1;
    const days = getDaysRemaining(activeExpiry);
    return days !== null && days < 0;
  });

  // Contract phase distribution (K1 s/d K6 + PKWTT)
  const phases = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'PKWTT'];
  const phaseCounts = phases.reduce((acc, p) => {
    acc[p] = employees.filter(e => e.currentContractPhase === p).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Top Urgent Alert Banner if there are expiring contracts */}
      {expiringEmployees.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs mt-0.5">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm sm:text-base flex items-center gap-2">
                <span>Perhatian HRD: {expiringEmployees.length} Karyawan Memerlukan Perpanjangan Kontrak Segera!</span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-xs font-bold">
                  Prioritas Tinggi
                </span>
              </h3>
              <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                Masa kerja PKWT akan berakhir dalam kurun waktu kurang dari 30 hari kalender. Segera lakukan evaluasi kerja dan persiapkan perpanjangan kontrak di database karyawan.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onNavigateToTable()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Kelola &amp; Perpanjang Kontrak</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid (3 Columns, Kontrak Ditandatangani removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Karyawan */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Karyawan</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalEmployees}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Terdata dalam database AKY
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: PKWT Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PKWT Aktif</p>
            <h3 className="text-2xl font-extrabold text-blue-600 mt-1">{pkwtActive}</h3>
            <p className="text-[11px] text-gray-500 mt-1">
              {pkwttCount} Karyawan Tetap (PKWTT)
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Segera Habis */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs flex items-center justify-between bg-amber-50/20">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Segera Habis (&le;30 Hari)</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{expiringEmployees.length}</h3>
            <p className="text-[11px] text-rose-600 font-semibold mt-1">
              {expiredEmployees.length} Telah lewat tanggal
            </p>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Columns: Expiration Watchlist & Phase Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiration Watchlist (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Daftar Pantau Jatuh Tempo Kontrak</h3>
                  <p className="text-xs text-gray-500">Karyawan dengan masa kontrak mendekati batas akhir</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTable()}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Lihat Seluruhnya &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {expiringEmployees.length === 0 && expiredEmployees.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-semibold text-gray-700">Semua masa kontrak dalam kondisi aman!</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tidak ada kontrak yang kedaluwarsa dalam 30 hari ke depan.</p>
                </div>
              ) : (
                [...expiringEmployees, ...expiredEmployees].slice(0, 5).map(emp => {
                  const activeExpiry = emp.akhirK3 || emp.akhirK2 || emp.akhirK1;
                  const days = getDaysRemaining(activeExpiry) ?? 0;
                  const isPast = days < 0;

                  return (
                    <div
                      key={emp.id}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isPast ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {emp.currentContractPhase}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900 uppercase">{emp.nama}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2">
                            <span>{emp.jabatan}</span>
                            <span>•</span>
                            <span className="font-mono text-gray-600">NIK: {emp.noKtp}</span>
                            <span>•</span>
                            <span>{emp.lokasiKerja}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">{activeExpiry}</p>
                          <p className={`text-[10px] font-bold ${isPast ? 'text-rose-600' : 'text-amber-600'}`}>
                            {isPast ? `Lewat ${Math.abs(days)} hari` : `Tersisa ${days} hari`}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => onNavigateToTable(emp)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                            title="Proses perpanjangan / kelola karyawan di database master"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Proses</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Sistem sinkron otomatis dengan regulasi UU Cipta Kerja PP 35/2021</span>
            <span className="font-semibold text-gray-700">Maksimum PKWT: 5 Tahun Kumulatif</span>
          </div>
        </div>

        {/* Phase Breakdown & Distribution (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Distribusi Tahap Kontrak</h3>
              <p className="text-xs text-gray-500">Komposisi status perikatan kerja karyawan</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {phases.map(p => {
              const count = phaseCounts[p] || 0;
              const percent = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
              return (
                <div key={p} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700 font-semibold">Tahap {p}</span>
                    <span className="text-gray-500">{count} org ({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        p === 'PKWTT' ? 'bg-emerald-500' :
                        p === 'K1' ? 'bg-blue-500' :
                        p === 'K2' ? 'bg-indigo-500' :
                        p === 'K3' ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Notice Log */}
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-800 mb-2">Riwayat Notifikasi Terkirim:</h4>
            {logs.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">Belum ada pengiriman notifikasi pengingat.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {logs.slice(0, 3).map(l => (
                  <div key={l.id} className="p-2 bg-slate-50 rounded-lg text-[10.5px] border border-gray-100">
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span>{l.namaKaryawan}</span>
                      <span className="text-emerald-600 font-bold">{l.type}</span>
                    </div>
                    <div className="text-gray-500 truncate mt-0.5">{l.recipient} • {new Date(l.sentAt).toLocaleTimeString('id-ID')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
