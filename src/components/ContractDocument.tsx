import React from 'react';
import { ContractDocumentData } from '../types';
import { formatRupiah } from '../utils/terbilang';
import { Printer, ExternalLink } from 'lucide-react';

interface ContractDocumentProps {
  contract: ContractDocumentData;
}

export const ContractDocument: React.FC<ContractDocumentProps> = ({ contract }) => {
  // User can directly toggle preview between Format Kontrak 1 and Format Kontrak 2+ (Extension)
  const [formatMode, setFormatMode] = React.useState<'AUTO' | 'K1' | 'EXTENSION'>('AUTO');

  React.useEffect(() => {
    setFormatMode('AUTO');
  }, [contract.id, contract.phase, contract.isInitialContract]);

  const isInitial = formatMode === 'K1' 
    ? true 
    : formatMode === 'EXTENSION' 
      ? false 
      : (contract.isInitialContract ?? (contract.phase === 'K1'));

  // Reliable print function
  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Shared Clauses 1 - 11 definitions
  const clause1 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">1.</span>
      <p>

        PIHAK PERTAMA menerima PIHAK KEDUA untuk dipekerjakan sebagai karyawan {contract.namaPihakPertama} dan PIHAK KEDUA bersedia serta sanggup menjalankan pekerjaan yang diberikan oleh PIHAK PERTAMA sebagai <span className="font-bold">{contract.jabatanKaryawan}</span> pada golongan jabatan <span className="font-bold">{contract.golonganJabatan || '0A'}</span>, dengan syarat-syarat dan ketentuan yang mengikat selama jangka waktu tertentu terhitung mulai tanggal <span className="font-semibold">{contract.tanggalMulai}</span> sampai dengan <span className="font-semibold">{contract.tanggalSelesai}</span>.
      </p>
    </div>
  );

  const clause2 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">2.</span>
      <p>
        PIHAK PERTAMA memberikan kepada PIHAK KEDUA imbalan berupa gaji pokok sebesar <span className="font-bold">{formatRupiah(contract.upah)},- ({contract.ketUpah})</span> Gross per bulan disamping tunjangan-tunjangan, jaminan sosial dan bantuan-bantuan lainnya sebagaimana yang tersebut dalam Perjanjian Kerja Bersama (PKB) yang berlaku.
      </p>
    </div>
  );

  const clause3 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">3.</span>
      <p>
        Kesepakatan Kerja ini secara otomatis berakhir pada tanggal <span className="font-semibold">{contract.tanggalSelesai}</span>, dengan demikian sejak tanggal tersebut Hubungan Kerja antara PIHAK PERTAMA dengan PIHAK KEDUA putus dengan sendirinya.
      </p>
    </div>
  );

  const clause4 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">4.</span>
      <p>
        Pembayaran Gaji, tunjangan-tunjangan dan/atau lembur dilakukan sesuai dengan ketentuan dalam Perjanjian Kerja Bersama (PKB) yang berlaku{contract.noRekening ? `, dan akan dibayarkan melalui transfer ke Rekening ${contract.namaBank} dengan Nomor Rekening: ${contract.noRekening} atas nama ${contract.atasNamaRekening || contract.namaKaryawan}.` : '.'}
      </p>
    </div>
  );

  const clause5 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">5.</span>
      <p>
        PIHAK KEDUA bersedia melaksanakan pekerjaan sesuai perintah PIHAK PERTAMA dan bersedia ditempatkan dimana saja atau dipindahtugaskan kemana saja dimana PIHAK KEDUA dibutuhkan di semua bagian/unit/area/lokasi kerja yang terdapat aktivitas operasional Perusahaan PIHAK PERTAMA.
      </p>
    </div>
  );

  const clause6 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">6.</span>
      <p>
        PIHAK KEDUA bersedia mentaati seluruh peraturan dan ketentuan yang berlaku di Perusahaan PIHAK PERTAMA serta peraturan dan ketentuan yang berlaku di Perusahaan dimana PIHAK KEDUA ditempatkan bekerja.
      </p>
    </div>
  );

  const clause7 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">7.</span>
      <p>
        Setelah Perjanjian Kerja ini berakhir atau Hubungan Kerja ini berakhir sebelum berakhirnya jangka waktu yang diperjanjikan, PIHAK PERTAMA akan memberikan Kompensasi kepada PIHAK KEDUA sesuai ketentuan dalam peraturan perundangan ketenagakerjaan yang berlaku.
      </p>
    </div>
  );

  const clause8 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">8.</span>
      <p>
        Dalam hal salah satu pihak mengakhiri Perjanjian Kerja ini sebelum waktunya, maka pihak yang mengakhiri perjanjian wajib memberikan ganti rugi untuk sisa masa kerja yang belum dijalani kepada pihak lainnya sesuai ketentuan dalam peraturan perundangan ketenagakerjaan yang berlaku.
      </p>
    </div>
  );

  const clause9 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">9.</span>
      <p>
        Dalam hal Perjanjian Kerja ini akan diperpanjang oleh PIHAK PERTAMA, maka hal tersebut akan dilakukan sesuai peraturan perundangan ketenagakerjaan yang berlaku dan diberitahukan oleh PIHAK PERTAMA kepada PIHAK KEDUA sebelum Perjanjian Kerja ini berakhir.
      </p>
    </div>
  );

  const clause10 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">10.</span>
      <p>
        Ketentuan Pasal 3 PKWT ini dikecualikan dan berakhir dengan sendirinya apabila PIHAK KEDUA dalam masa PKWT terbukti melakukan perbuatan yang melanggar tata tertib disiplin kerja dengan sanksi Pemutusan Hubungan Kerja. Atas berakhirnya PKWT ini, maka PIHAK PERTAMA hanya berkewajiban memberikan sejumlah uang terbatas pada pemberian uang kompensasi berakhirnya masa PKWT.
      </p>
    </div>
  );

  const clause11 = (
    <div className="flex items-start space-x-2">
      <span className="font-bold min-w-4">11.</span>
      <p>
        Apabila oleh sebab tertentu PIHAK PERTAMA tidak dapat melanjutkan mempekerjakan PIHAK KEDUA sebelum berakhirnya waktu dan/atau pekerjaan yang diperjanjikan, maka PIHAK PERTAMA dapat tetap mempekerjakan PIHAK KEDUA dengan memperhatikan ketentuan butir 5 (lima) Perjanjian ini. Apabila akibat sebab tertentu termaksud PIHAK PERTAMA tidak dapat mempekerjakan PIHAK KEDUA maka Perjanjian Kerja antara PARA PIHAK dengan sendirinya berakhir dan PIHAK PERTAMA bertanggung jawab atas pemenuhan hak-hak PIHAK KEDUA sesuai dengan peraturan perundangan ketenagakerjaan yang berlaku.
      </p>
    </div>
  );

// Top-level Company Letterhead Component (Used on both Page 1 and Page 2)
// Placed at module level so React 19 fiber reconciliation maintains stable component identity
const HeaderLetterhead: React.FC<{ contract: ContractDocumentData }> = ({ contract }) => (
  <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-5 select-none">
    <div className="flex items-center space-x-4">
      {contract.logoPerusahaanUrl ? (
        <img
          src={contract.logoPerusahaanUrl}
          alt="Logo Perusahaan"
          className="h-[72px] max-w-[180px] object-contain"
        />
      ) : (
        <div className="flex items-center">
          <svg className="w-24 h-18" viewBox="0 0 140 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="40" rx="65" ry="34" stroke="#0072CE" strokeWidth="4" />
            <path d="M42 40C42 28 55 20 70 20C85 20 98 28 98 40C98 52 85 60 70 60C55 60 42 52 42 40Z" stroke="#00A859" strokeWidth="3" />
            <text x="70" y="47" textAnchor="middle" fill="#003B70" fontFamily="sans-serif" fontWeight="900" fontSize="24" letterSpacing="1">AKY</text>
            <text x="70" y="68" textAnchor="middle" fill="#003B70" fontFamily="sans-serif" fontWeight="700" fontSize="7">PT. ANDHANA KIRANA YASA</text>
          </svg>
        </div>
      )}

      {contract.logoIsoUrl ? (
        <img
          src={contract.logoIsoUrl}
          alt="Logo ISO"
          className="h-[72px] max-w-[135px] object-contain"
        />
      ) : (
        <div className="flex items-center">
          <svg className="w-16 h-18" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="35,2 67,18 67,62 35,78 3,62 3,18" fill="#0F4C81" />
            <polygon points="35,6 63,20 63,60 35,74 7,60 7,20" fill="#FFFFFF" />
            <polygon points="35,10 59,22 59,58 35,70 11,58 11,22" fill="#0F4C81" />
            <text x="35" y="38" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontSize="13">TÜV</text>
            <text x="35" y="48" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="700" fontSize="8">SÜD</text>
            <text x="35" y="58" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontSize="5">ISO 9001</text>
          </svg>
        </div>
      )}
    </div>

    <div className="text-left text-[10pt] leading-tight text-black font-sans shrink-0 pl-4">
      <p className="font-semibold">{contract.alamatPihakPertama?.split(',')[0] || 'Bukit Gading Raya Blok N No. 11'}</p>
      <p>Kelapa Gading Barat – Kelapa Gading</p>
      <p>Jakarta Utara - 14240</p>
      <p>Telp : {contract.telpPihakPertama || '021 - 4516027'}</p>
      <p>Fax : {contract.faxPihakPertama || '021 - 45852414'}</p>
    </div>
  </div>
);

  return (
    <div className="w-full my-1 print:m-0 print:p-0 print:block">
      {/* The Printable Container (Calibri 10pt, Top: 1cm, Bottom: 1.75cm, Left/Right: 2.54cm) */}
      <div id={`contract-printable-${contract.id}`} className="contract-document-calibri print:block">
        
        {/* ==================== PAGE 1 ==================== */}
        <div className="contract-page-a4 bg-white text-black leading-snug shadow-xl mb-8 print:shadow-none print:mb-0 print:p-0 print:m-0 max-w-[210mm] mx-auto p-[2.54cm] pt-[1cm] pb-[1.75cm]">
          <HeaderLetterhead contract={contract} />

          {/* Document Title */}
          <div className="text-center my-3">
            <h1 className="font-bold text-[11.5pt] uppercase tracking-wider">
              PERJANJIAN KERJA WAKTU TERTENTU
            </h1>
            <p className="text-[10pt] font-semibold mt-0.5">
              {contract.nomorSurat?.startsWith('No') ? contract.nomorSurat : `No. : ${contract.nomorSurat}`}
            </p>
          </div>

          <p className="mb-2">Yang bertanda tangan dibawah ini :</p>

          {/* Pihak Pertama */}
          <div className="grid grid-cols-[110px_15px_1fr] mb-2.5">
            <span className="font-medium">1.&nbsp;&nbsp;N A M A</span>
            <span>:</span>
            <div>
              <span className="font-bold">{contract.namaPihakPertama}</span>, berkedudukan di Jakarta, dalam hal ini diwakili oleh <span className="font-bold">{contract.wakilPihakPertama}</span>, selaku {contract.jabatanPihakPertama} Perusahaan, selanjutnya disebut <span className="font-bold">PIHAK PERTAMA</span>.
            </div>
          </div>

          {/* Pihak Kedua */}
          <div className="grid grid-cols-[110px_15px_1fr] mb-1">
            <span className="font-medium">2.&nbsp;&nbsp;N A M A</span>
            <span>:</span>
            <span className="font-bold uppercase">{contract.namaKaryawan}</span>
          </div>
          <div className="grid grid-cols-[110px_15px_1fr] mb-1">
            <span className="font-medium">TEMPAT/TANGGAL LAHIR</span>
            <span>:</span>
            <span>{contract.tempatTanggalLahir}</span>
          </div>
          <div className="grid grid-cols-[110px_15px_1fr] mb-1">
            <span className="font-medium">JENIS KELAMIN</span>
            <span>:</span>
            <span>{contract.jenisKelamin}</span>
          </div>
          <div className="grid grid-cols-[110px_15px_1fr] mb-1">
            <span className="font-medium">NIK (NO.KTP)</span>
            <span>:</span>
            <span className="font-mono">{contract.nikKaryawan}</span>
          </div>
          <div className="grid grid-cols-[110px_15px_1fr] mb-3">
            <span className="font-medium">ALAMAT</span>
            <span>:</span>
            <div>
              <p>Pada saat menandatangani Perjanjian Kerja Waktu Tertentu ini bertempat tinggal di :</p>
              <p className="uppercase mt-0.5">{contract.alamatKaryawan}</p>
              <p className="mt-1">Selanjutnya disebut <span className="font-bold">PIHAK KEDUA</span>.</p>
            </div>
          </div>

          {/* Conditional Layout for Kontrak 1 vs Kontrak 2, 3, dst */}
          {isInitial ? (
            /* ================= KONTRAK 1 FORMAT (PAGE 1) ================= */
            <>
              {/* Directly into agreement sentence without preamble a & b */}
              <p className="text-justify mb-2.5">
                Pada hari ini tanggal <span className="font-semibold">{contract.tanggalMulai}</span> PIHAK PERTAMA dan PIHAK KEDUA (“PARA PIHAK”) telah sepakat untuk melakukan Perjanjian Kerja Waktu Tertentu (PKWT) dengan ketentuan-ketentuan sebagai berikut :
              </p>

              {/* Page 1 fits Clauses 1 through 7 */}
              <div className="space-y-2 text-justify">
                {clause1}
                {clause2}
                {clause3}
                {clause4}
                {clause5}
                {clause6}
                {clause7}
              </div>
            </>
          ) : (
            /* ================= KONTRAK 2, 3, dst FORMAT (PAGE 1) ================= */
            <>
              <div className="text-justify mb-2.5">
                <p className="mb-1.5">Terlebih dahulu PIHAK PERTAMA dan PIHAK KEDUA (“PARA PIHAK”) menerangkan sebagai berikut :</p>
                
                <div className="flex items-start space-x-2 mb-1.5 pl-4">
                  <span className="font-semibold">a.</span>
                  <p>
                    PIHAK PERTAMA sebelumnya telah mempekerjakan PIHAK KEDUA sebagai karyawan PKWT sebagaimana PKWT No. : {contract.nomorSuratSebelumnya}, tanggal {contract.tanggalSuratSebelumnya || '01 April 2026'}, terhitung mulai tanggal {contract.periodeAwalSebelumnya || '01 April 2026'} dan akan berakhir pada tanggal {contract.periodeAkhirSebelumnya || '30 September 2026'}.
                  </p>
                </div>

                <div className="flex items-start space-x-2 pl-4">
                  <span className="font-semibold">b.</span>
                  <p>
                    Dengan adanya kebutuhan PKWT di Perusahaan PIHAK PERTAMA sesuai kemampuan yang dimiliki PIHAK KEDUA, maka PIHAK KEDUA bersedia untuk melakukan perpanjangan PKWT di Perusahaan PIHAK PERTAMA sesuai dengan Peraturan Perundangan Ketenagakerjaan yang berlaku.
                  </p>
                </div>
              </div>

              <p className="text-justify mb-2.5">
                Pada hari ini tanggal <span className="font-semibold">{contract.tanggalMulai}</span> PIHAK PERTAMA dan PIHAK KEDUA (“PARA PIHAK”) telah sepakat untuk melakukan perpanjangan Perjanjian Kerja Waktu Tertentu (PKWT) dengan ketentuan-ketentuan sebagai berikut :
              </p>

              {/* Page 1 fits Clauses 1 through 4 */}
              <div className="space-y-2 text-justify">
                {clause1}
                {clause2}
                {clause3}
                {clause4}
              </div>
            </>
          )}
        </div>

        {/* ==================== PAGE 2 ==================== */}
        <div className="contract-page-a4 bg-white text-black leading-snug shadow-xl print:shadow-none print:p-0 print:m-0 max-w-[210mm] mx-auto p-[2.54cm] pt-[1cm] pb-[1.75cm]">
          <HeaderLetterhead contract={contract} />

          {/* Conditional Layout for Page 2 */}
          {isInitial ? (
            /* ================= KONTRAK 1 FORMAT (PAGE 2) ================= */
            /* Page 2 fits Clauses 8, 9, 10, 11 */
            <div className="space-y-2.5 text-justify">
              {clause8}
              {clause9}
              {clause10}
              {clause11}
            </div>
          ) : (
            /* ================= KONTRAK 2, 3, dst FORMAT (PAGE 2) ================= */
            /* Page 2 fits Clauses 5, 6, 7, 8, 9, 10, 11 */
            <div className="space-y-2 text-justify">
              {clause5}
              {clause6}
              {clause7}
              {clause8}
              {clause9}
              {clause10}
              {clause11}
            </div>
          )}

          {/* Closing paragraphs (identical on both) */}
          <div className="mt-4 space-y-2 text-justify">
            <p>
              Demikian Perjanjian Kerja ini dibuat dan ditandatangani oleh PIHAK PERTAMA dan PIHAK KEDUA dengan kesadaran dan tanpa paksaan, dimana masing-masing Pihak telah mengetahui dan memahami isinya.
            </p>
            <p>
              Kesepakatan Kerja ini dibuat rangkap 2 (dua) masing-masing untuk PIHAK PERTAMA dan PIHAK KEDUA dimana keduanya mempunyai kekuatan hukum yang sama.
            </p>
          </div>

          {/* Signature Date & Signatures Container */}
          <div className="break-inside-avoid print:break-inside-avoid">
            {/* Signature Date */}
            <div className="text-right mt-3 mr-8 font-sans text-[10pt]">
              {contract.tempatTtd || 'Karawang'}, {contract.tanggalTtd || contract.tanggalMulai}
            </div>

            {/* Signature Columns: Uploaded image if present, or blank space if none */}
            <div className="grid grid-cols-2 gap-8 mt-2 pt-1 text-center font-sans text-[10pt]">
            {/* PIHAK KEDUA (Employee) */}
            <div className="flex flex-col items-center justify-between min-h-[130px]">
              <p className="font-bold tracking-wider">PIHAK KEDUA</p>
              
              <div className="h-24 flex items-center justify-center my-1 w-full">
                {contract.ttdKaryawan ? (
                  <img 
                    src={contract.ttdKaryawan} 
                    alt="TTD Pihak Kedua" 
                    className="max-h-24 max-w-[170px] object-contain"
                  />
                ) : (
                  <div className="h-20 w-44" />
                )}
              </div>

              <div>
                <p className="font-bold uppercase underline tracking-wide">
                  {contract.namaKaryawan}
                </p>
                <p className="text-[9.5pt] invisible select-none">
                  &nbsp;
                </p>
              </div>
            </div>

            {/* PIHAK PERTAMA (Company Director) */}
            <div className="flex flex-col items-center justify-between min-h-[130px]">
              <p className="font-bold tracking-wider">PIHAK PERTAMA</p>

              <div className="h-24 flex items-center justify-center my-1 w-full">
                {contract.ttdPerusahaan ? (
                  <img 
                    src={contract.ttdPerusahaan} 
                    alt="TTD Direktur" 
                    className="max-h-24 max-w-[170px] object-contain"
                  />
                ) : (
                  <div className="h-20 w-44" />
                )}
              </div>

              <div>
                <p className="font-bold uppercase underline tracking-wide">
                  {contract.wakilPihakPertama || 'GIMMY KURNIAWAN IMANTO'}
                </p>
                <p className="text-[9.5pt] text-gray-800">
                  {contract.jabatanPihakPertama || 'Direktur'}
                </p>
              </div>
            </div>
          </div>
          </div>

        </div>
      </div>
    </div>
  );
};
