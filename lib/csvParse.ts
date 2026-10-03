import Papa from 'papaparse';

export interface CareLinkRow {
  section: string;
  values: Record<string, string>;
}

export function parseCareLinkCsv(rawText: string): CareLinkRow[] {
  const table = Papa.parse<string[]>(rawText.trim(), { skipEmptyLines: true }).data;

  const rows: CareLinkRow[] = [];
  let header: string[] | null = null;
  let section = '';

  for (const line of table) {
    const first = (line[0] ?? '').trim();

    if (first.startsWith('-------')) {
      section = (line[2] ?? '').trim();
      continue;
    }
    if (first === 'Index') {
      header = line;
      continue;
    }
    if (!header) continue;

    const values: Record<string, string> = {};
    header.forEach((col, i) => {
      values[col] = (line[i] ?? '').trim();
    });
    rows.push({ section, values });
  }

  return rows;
}

export function csvNumber(row: CareLinkRow, column: string): number | null {
  const raw = row.values[column];
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

export function csvTimestamp(row: CareLinkRow): Date | null {
  const date = row.values['Date'];
  const time = row.values['Time'];
  if (!date || !time) return null;
  const d = new Date(`${date.replace(/\//g, '-')}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}
