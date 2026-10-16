import React from 'react';
import { NotificationLog, Employee } from '../types';
import { MessageSquare, Mail, CheckCircle2, Clock, Send, AlertTriangle, Shield } from 'lucide-react';
import { getDaysRemaining } from '../utils/date';
import { logNotification } from '../services/db';

interface NotificationLogViewProps {
  logs: NotificationLog[];
  employees: Employee[];
  onOpenNotification: (emp: Employee) => void;
}

export const NotificationLogView: React.FC<NotificationLogViewProps> = ({
  logs,
  employees,
  onOpenNotification
}) => {
  // Expiring employees list
  const expiringEmployees = employees.filter(e => {
    const activeExpiry = e.akhirK3 || e.akhirK2 || e.akhirK1;
    const days = getDaysRemaining(activeExpiry);
    return days !== null && days <= 30;
  });

  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleBatchTrigger = async () => {
    if (expiringEmployees.length === 0) {
      setFeedback('Tidak ada karyawan dengan masa kontrak yang mendekati jatuh tempo.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    for (const emp of expiringEmployees) {
      const contractEndDate = emp.akhirK3 || emp.akhirK2 || emp.akhirK1 || '30 Juni 2027';
      const days = getDaysRemaining(contractEndDate) ?? 0;
      const newLog: NotificationLog = {
        id: `notif-batch-${emp.id}-${Date.now()}`,
        employeeId: emp.id,
        namaKaryawan: emp.nama,
        type: 'WHATSAPP',
        recipient: emp.noHp || '6281234567890',
        message: `[Sistem Otomatis HRD PT AKY] Pengingat masa kontrak PKWT untuk ${emp.nama} berakhir pada ${contractEndDate}.`,
        status: 'SENT',
        contractEndDate,
        daysRemaining: days,
        sentAt: new Date().toISOString()
      };
      await logNotification(newLog);
    }
    setFeedback(`Berhasil mengirimkan ${expiringEmployees.length} notifikasi pengingat ke database log!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          {feedback}
        </div>
      )}

      {/* Header and Batch Action Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Pusat Pengingat &amp; Log Notifikasi Perpanjangan Kontrak
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Modul pengiriman otomatis dan manual pesan resmi HRD via WhatsApp API dan Email Terintegrasi.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleBatchTrigger}
            disabled={expiringEmployees.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Notifikasi Batch ({expiringEmployees.length} Karyawan)</span>
          </button>
        </div>
      </div>

      {/* Two columns: Needs Attention & Sent History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending / Action Needed */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
          <h3 className="font-bold text-sm text-gray-900 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Karyawan Memerlukan Notifikasi
          </h3>
          <p className="text-xs text-gray-500 mb-4">Kontrak segera habis dalam 30 hari ke depan</p>

          <div className="space-y-2.5">
            {expiringEmployees.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                Tidak ada karyawan yang mendesak.
              </div>
            ) : (
              expiringEmployees.map(emp => {
                const activeExpiry = emp.akhirK3 || emp.akhirK2 || emp.akhirK1;
                const days = getDaysRemaining(activeExpiry) ?? 0;
                return (
                  <div
                    key={emp.id}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 uppercase">{emp.nama}</div>
                      <div className="text-[10.5px] text-gray-500">
                        {emp.jabatan} • Sisa {days} hari
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenNotification(emp)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Kirim</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: History Log Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
          <h3 className="font-bold text-sm text-gray-900 mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Audit Trail Pengiriman Notifikasi
          </h3>
          <p className="text-xs text-gray-500 mb-4">Log pengiriman tersimpan secara permanen di database</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-gray-600 font-bold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">WAKTU</th>
                  <th className="py-2.5 px-3">KARYAWAN</th>
                  <th className="py-2.5 px-3">KANAL</th>
                  <th className="py-2.5 px-3">PENERIMA</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Belum ada riwayat notifikasi. Silakan kirim pesan pengingat melalui tombol kirim.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {log.namaKaryawan}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.type === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.type === 'WHATSAPP' ? <MessageSquare className="w-2.5 h-2.5" /> : <Mail className="w-2.5 h-2.5" />}
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">
                        {log.recipient}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Terkirim
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
