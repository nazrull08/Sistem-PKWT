/**
 * Utility untuk membersihkan data teks dari file Excel, khususnya No. KTP / NIK, No. Rekening, dan No. HP.
 * Pada file Excel di Indonesia, pengguna sering menambahkan tanda petik satu / koma atas (') di depan
 * angka (misal '0317... atau '0812...) agar angka 0 di depan tidak hilang atau agar tidak berubah
 * menjadi format eksponensial (scientific notation).
 */

export function cleanNoKtp(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Hilangkan koma atas / petik satu di depan (seperti ' ‘ ’ ` ´ ′ ")
  str = str.replace(/^['‘'´`′"]+/, '').trim();
  return str;
}

export function cleanExcelTextNumber(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  str = str.replace(/^['‘'´`′"]+/, '').trim();
  return str;
}
