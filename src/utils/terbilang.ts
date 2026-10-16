/**
 * Utility to convert Indonesian numbers to words (Terbilang)
 * Example: 5910371 -> "Lima Juta Sembilan Ratus Sepuluh Ribu Tiga Ratus Tujuh Puluh Satu"
 */

const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

export function terbilang(n: number): string {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return 'Nol';

  function konversi(val: number): string {
    if (val < 12) {
      return satuan[val];
    } else if (val < 20) {
      return konversi(val - 10) + ' Belas';
    } else if (val < 100) {
      return konversi(Math.floor(val / 10)) + ' Puluh ' + konversi(val % 10);
    } else if (val < 200) {
      return 'Seratus ' + konversi(val - 100);
    } else if (val < 1000) {
      return konversi(Math.floor(val / 100)) + ' Ratus ' + konversi(val % 100);
    } else if (val < 2000) {
      return 'Seribu ' + konversi(val - 1000);
    } else if (val < 1000000) {
      return konversi(Math.floor(val / 1000)) + ' Ribu ' + konversi(val % 1000);
    } else if (val < 1000000000) {
      return konversi(Math.floor(val / 1000000)) + ' Juta ' + konversi(val % 1000000);
    } else if (val < 1000000000000) {
      return konversi(Math.floor(val / 1000000000)) + ' Milyar ' + konversi(val % 1000000000);
    } else {
      return konversi(Math.floor(val / 1000000000000)) + ' Triliun ' + konversi(val % 1000000000000);
    }
  }

  const result = konversi(num).replace(/\s+/g, ' ').trim();
  return result;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('IDR', 'Rp.');
}
