import Papa from 'papaparse';
import { MEAL_TYPES, type ExtractedLogEntry } from './manualMealLog';

const MEAL_TYPE_BY_LOWER = new Map(MEAL_TYPES.map((m) => [m.label.toLowerCase(), m.label]));

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function toIsoDate(value: string | undefined, fallbackYear: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const shortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const month = Number(shortMatch[1]);
    const day = Number(shortMatch[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${fallbackYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface ManualLogCsvResult {
  entries: ExtractedLogEntry[];
  warnings: string[];
}

export function parseManualLogCsv(rawText: string, fallbackYear: string): ManualLogCsvResult {
  const parsed = Papa.parse<Record<string, string>>(rawText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const entries: ExtractedLogEntry[] = [];
  const warnings: string[] = [];

  for (const row of parsed.data) {
    const date = toIsoDate(row['date'], fallbackYear);
    const mealTypeRaw = (row['meal type'] ?? row['mealtype'] ?? row['time/meal'] ?? row['meal'] ?? '').trim().toLowerCase();
    const mealType = MEAL_TYPE_BY_LOWER.get(mealTypeRaw) ?? null;

    if (!date || !mealType) {
      warnings.push(`Skipped a row with an unrecognized date or meal type ("${row['date'] ?? ''}", "${row['meal type'] ?? row['time/meal'] ?? ''}").`);
      continue;
    }

    const carbs = toNumber(row['carbs']);
    const bolus = toNumber(row['bolus'] ?? row['units'] ?? row['insulin']);
    const glucoseAtBolus = toNumber(row['glucose'] ?? row['glucose at bolus'] ?? row['blood glucose']);
    const carbRatio = toNumber(row['carb ratio'] ?? row['carbratio']);
    const isf = toNumber(row['isf']);

    if (carbs == null && bolus == null && glucoseAtBolus == null) continue;

    entries.push({ date, mealType, carbs, bolus, glucoseAtBolus, carbRatio, isf });
  }

  if (parsed.data.length === 0) {
    warnings.push('The CSV had no data rows.');
  }

  return { entries, warnings };
}
