import React, { useState } from 'react';
import { Employee, NotificationLog } from '../types';
import { getDaysRemaining } from '../utils/date';
import { X, Send, Mail, MessageSquare, CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import { logNotification } from '../services/db';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onNotificationSent?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  employee,
  onNotificationSent
}) => {
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [phoneNumber, setPhoneNumber] = useState(employee?.noHp || '6281234567890');
  const [emailAddress, setEmailAddress] = useState(employee?.email || 'karyawan@example.com');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Determine active contract expiry date
  const contractEndDate = employee?.akhirK3 || employee?.akhirK2 || employee?.akhirK1 || '30 Juni 2027';
  const contractNumber = employee?.noSurat2 || employee?.noSurat1 || '206/AKY-HRD/PKWT-III/IX/2026';
  const daysRemaining = getDaysRemaining(contractEndDate) ?? 30;

  // Indonesian formal message draft
  const defaultSubject = `[Pemberitahuan HRD] Pengingat Evaluasi & Perpanjangan Kontrak PKWT - ${employee?.nama || ''}`;

  const defaultMessage = `Kepada Yth. Sdr/i ${employee?.nama || ''},

Departemen HRD PT. ANDHANA KIRANA YASA menginformasikan bahwa Perjanjian Kerja Waktu Tertentu (PKWT) Saudara:
- Nomor Kontrak: ${contractNumber}
- Penempatan / Project: ${employee?.project || 'Pabrik & Operasional'}
- Posisi / Golongan: ${employee?.jabatan || 'Operator'} (${employee?.golongan || '0A'})
- Tanggal Berakhir: ${contractEndDate} (Sisa waktu: ${daysRemaining > 0 ? `${daysRemaining} hari lagi` : 'Sudah berakhir'})

Sehubungan dengan hal tersebut, Manajemen Perusahaan bermaksud mengundang Saudara untuk melakukan diskusi evaluasi kinerja serta penandatanganan addendum perpanjangan PKWT tahap berikutnya.

Mohon konfirmasi kesediaan dan respon Saudara melalui pesan ini atau hadir ke ruangan HRD Bukit Gading Raya.

Terima kasih atas dedikasi dan kerja sama Saudara.

Hormat kami,
Departemen HRD & Legal
PT. ANDHANA KIRANA YASA
Kelapa Gading, Jakarta Utara`;

  const [messageText, setMessageText] = useState(defaultMessage);

  const handleSendWhatsApp = async () => {
    if (!employee) return;
    // Sanitize phone number: clean characters, replace leading 0 with 62
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    // Log to audit trail in Firestore
    const newLog: NotificationLog = {
      id: `notif-wa-${Date.now()}`,
      employeeId: employee.id,
      namaKaryawan: employee.nama,
      type: 'WHATSAPP',
      recipient: cleanPhone,
      message: messageText,
      status: 'SENT',
      contractEndDate,
      daysRemaining,
      sentAt: new Date().toISOString()
    };
    await logNotification(newLog);

    setSentSuccess(true);
    if (onNotificationSent) onNotificationSent();

    // Open WhatsApp in new window/tab
    window.open(waUrl, '_blank');
  };

  const handleSendEmail = async () => {
    if (!employee) return;
    const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(defaultSubject)}&body=${encodeURIComponent(messageText)}`;

    const newLog: NotificationLog = {
      id: `notif-mail-${Date.now()}`,
      employeeId: employee.id,
      namaKaryawan: employee.nama,
      type: 'EMAIL',
      recipient: emailAddress,
      message: messageText,
      status: 'SENT',
      contractEndDate,
      daysRemaining,
      sentAt: new Date().toISOString()
    };
    await logNotification(newLog);

    setSentSuccess(true);
    if (onNotificationSent) onNotificationSent();

    window.open(mailtoUrl, '_self');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Notifikasi Pengingat Kontrak</h3>
              <p className="text-xs text-gray-500">
                Penerima: <span className="font-semibold text-gray-800">{employee.nama}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Selector */}
        <div className="flex border-b border-gray-100 text-xs font-semibold px-5 pt-3 space-x-4">
          <button
            onClick={() => setChannel('WHATSAPP')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors ${
              channel === 'WHATSAPP'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Kirim WhatsApp</span>
          </button>

          <button
            onClick={() => setChannel('EMAIL')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors ${
              channel === 'EMAIL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Kirim Email Resmi</span>
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Urgency Badge */}
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold">Masa Kontrak Berakhir: {contractEndDate}</span>
                <p className="text-[11px] text-amber-700">Tersisa {daysRemaining} hari kalender</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-bold rounded-md text-[10px]">
              {employee.currentContractPhase}
            </span>
          </div>

          {channel === 'WHATSAPP' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nomor WhatsApp Karyawan (Kode 62):
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Contoh: 6281234567890"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Alamat Email Karyawan:
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Pesan Notifikasi:
              </label>
              <button
                type="button"
                onClick={copyToClipboard}
                className="text-[11px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Tersalin!' : 'Salin Pesan'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs leading-relaxed font-sans text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          {sentSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Notifikasi berhasil dicatat ke sistem dan diarahkan ke kanal komunikasi!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Tutup
          </button>
          
          {channel === 'WHATSAPP' ? (
            <button
              onClick={handleSendWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center space-x-2 transition-transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Buka Chat WhatsApp</span>
            </button>
          ) : (
            <button
              onClick={handleSendEmail}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center space-x-2 transition-transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Melalui Email</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
