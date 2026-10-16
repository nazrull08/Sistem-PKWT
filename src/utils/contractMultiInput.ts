/**
 * Helper utility for managing multi-input contract data per phase (K1 s/d K6)
 * Enables multiple No Surat, Tanggal Kontrak (Awal, Akhir), and Tgl TTD in 1 single row
 */

export interface ContractEntryItem {
  id: string;
  noSurat: string;
  awal: string;
  akhir: string;
  ttd: string;
}

/**
 * Split text by common multi-value delimiters (comma, slash, semicolon, newline)
 */
export function splitMultiValue(val?: string, delimiterRegex: RegExp = /[,;/\n]+/): string[] {
  if (!val) return [];
  // If delimited by ' / ' specifically or commas
  if (val.includes(' / ')) {
    return val.split(' / ').map(s => s.trim()).filter(Boolean);
  }
  if (val.includes(',')) {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (val.includes(';')) {
    return val.split(';').map(s => s.trim()).filter(Boolean);
  }
  if (val.includes('\n')) {
    return val.split('\n').map(s => s.trim()).filter(Boolean);
  }
  const trimmed = val.trim();
  return trimmed ? [trimmed] : [];
}

/**
 * Parses raw string fields into an array of structured ContractEntryItem
 */
export function parseMultiContractEntries(
  noSurat?: string,
  awal?: string,
  akhir?: string,
  ttd?: string
): ContractEntryItem[] {
  const surats = splitMultiValue(noSurat, /,/);
  const awals = splitMultiValue(awal);
  const akhirs = splitMultiValue(akhir);
  const ttds = splitMultiValue(ttd);

  const maxLen = Math.max(surats.length, awals.length, akhirs.length, ttds.length);
  if (maxLen === 0) {
    return [];
  }

  const entries: ContractEntryItem[] = [];
  for (let i = 0; i < maxLen; i++) {
    entries.push({
      id: `entry-${i + 1}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      noSurat: surats[i] || (surats.length === 1 ? '' : ''),
      awal: awals[i] || (awals.length === 1 ? '' : ''),
      akhir: akhirs[i] || (akhirs.length === 1 ? '' : ''),
      ttd: ttds[i] || (ttds.length === 1 ? '' : '')
    });
  }

  return entries;
}

/**
 * Serializes an array of ContractEntryItem back into standard DB string fields
 */
export function serializeMultiContractEntries(entries: ContractEntryItem[]): {
  noSurat: string;
  awal: string;
  akhir: string;
  ttd: string;
} {
  const validEntries = entries.filter(e => 
    (e.noSurat && e.noSurat.trim()) || 
    (e.awal && e.awal.trim()) || 
    (e.akhir && e.akhir.trim()) || 
    (e.ttd && e.ttd.trim())
  );

  if (validEntries.length === 0) {
    return { noSurat: '', awal: '', akhir: '', ttd: '' };
  }

  return {
    noSurat: validEntries.map(e => (e.noSurat || '').trim()).filter(Boolean).join(', '),
    awal: validEntries.map(e => (e.awal || '').trim()).filter(Boolean).join(' / '),
    akhir: validEntries.map(e => (e.akhir || '').trim()).filter(Boolean).join(' / '),
    ttd: validEntries.map(e => (e.ttd || '').trim()).filter(Boolean).join(' / ')
  };
}

/**
 * Checks whether any of the contract fields contains multiple entries
 */
export function hasMultipleEntries(
  noSurat?: string,
  awal?: string,
  akhir?: string,
  ttd?: string
): boolean {
  if (!noSurat && !awal && !akhir && !ttd) return false;
  const surats = splitMultiValue(noSurat, /,/);
  const awals = splitMultiValue(awal);
  const akhirs = splitMultiValue(akhir);
  const ttds = splitMultiValue(ttd);
  return Math.max(surats.length, awals.length, akhirs.length, ttds.length) > 1;
}

/**
 * Helper to delete a specific entry index from combined fields
 */
export function removeEntryAtIndex(
  indexToRemove: number,
  noSurat?: string,
  awal?: string,
  akhir?: string,
  ttd?: string
): {
  noSurat: string;
  awal: string;
  akhir: string;
  ttd: string;
  remainingCount: number;
} {
  const entries = parseMultiContractEntries(noSurat, awal, akhir, ttd);
  if (indexToRemove >= 0 && indexToRemove < entries.length) {
    entries.splice(indexToRemove, 1);
  }
  const serialized = serializeMultiContractEntries(entries);
  return {
    ...serialized,
    remainingCount: entries.length
  };
}
