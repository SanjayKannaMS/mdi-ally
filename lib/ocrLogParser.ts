import { MEAL_TYPES, type ExtractedLogEntry } from './manualMealLog';


const DATE_PATTERN = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

const CARB_RATIO_PATTERN = /\b(?:c\/?r|ratio)\D{0,4}(\d{1,2})/i;
const ISF_PATTERN = /\b(?:isf|s\/?f|correction)\D{0,4}(\d{2,3})/i;

const MEAL_TYPE_ALIASES: Record<string, string[]> = {
  Breakfast: ['breakfast', 'bfast', 'brkfst', 'brkfast'],
  'AM Snack': ['am snack', 'a.m. snack', 'morning snack'],
  Lunch: ['lunch'],
  'PM Snack': ['pm snack', 'p.m. snack', 'afternoon snack'],
  Dinner: ['dinner', 'supper'],
  Bedtime: ['bedtime', 'bed time', 'hs snack', 'before bed'],
  '2am': ['2am', '2 am', '2:00am', '2:00 am'],
};

interface ParsedNumber {
  value: number;
  hadDecimal: boolean;
}

function extractNumbers(text: string): ParsedNumber[] {
  const matches = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.map((m) => ({ value: Number(m), hadDecimal: m.includes('.') }));
}

function classifyNumbers(numbers: ParsedNumber[]): { carbs: number | null; bolus: number | null; glucoseAtBolus: number | null } {
  const remaining = [...numbers];

  let glucoseIdx = -1;
  for (let i = 0; i < remaining.length; i++) {
    const n = remaining[i];
    if (n.hadDecimal || n.value < 50 || n.value > 400) continue;
    if (glucoseIdx === -1 || n.value > remaining[glucoseIdx].value) glucoseIdx = i;
  }
  const glucoseAtBolus = glucoseIdx !== -1 ? remaining.splice(glucoseIdx, 1)[0].value : null;

  const decimalIdx = remaining.findIndex((n) => n.hadDecimal);
  let bolus: number | null = null;
  if (decimalIdx !== -1) {
    bolus = remaining.splice(decimalIdx, 1)[0].value;
  } else if (remaining.length >= 2) {
    bolus = remaining.splice(1, 1)[0].value;
  }

  const carbs = remaining.length > 0 ? remaining[0].value : null;

  return { carbs, bolus, glucoseAtBolus };
}

function normalizeDate(month: number, day: number, rawYear: string | undefined, year: string): string | null {
  const y = rawYear ? (rawYear.length === 2 ? `20${rawYear}` : rawYear) : year;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function findMealType(line: string): string | null {
  const lower = line.toLowerCase();
  for (const { label } of MEAL_TYPES) {
    const aliases = MEAL_TYPE_ALIASES[label];
    if (aliases.some((alias) => lower.includes(alias))) return label;
  }
  return null;
}

export interface OcrParseResult {
  entries: ExtractedLogEntry[];
  warnings: string[];
}

function looksLikeNewEntry(line: string): boolean {
  return findMealType(line) !== null || DATE_PATTERN.test(line);
}

const MAX_WINDOW_EXTRA_LINES = 2;

function collectEntryWindow(lines: string[], startIndex: number): string {
  const collected: string[] = [lines[startIndex]];
  let numbers = extractNumbers(lines[startIndex].replace(DATE_PATTERN, ' '));

  let i = startIndex + 1;
  let extended = 0;
  while (numbers.length === 0 && extended < MAX_WINDOW_EXTRA_LINES && i < lines.length && !looksLikeNewEntry(lines[i])) {
    collected.push(lines[i]);
    numbers = extractNumbers(collected.join(' ').replace(DATE_PATTERN, ' '));
    extended++;
    i++;
  }

  return collected.join(' ');
}

export function parseOcrLogText(rawText: string, year: string): OcrParseResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entries: ExtractedLogEntry[] = [];
  const warnings: string[] = [];
  let currentDate: string | null = null;
  let currentCarbRatio: number | null = null;
  let currentIsf: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dateMatch = line.match(DATE_PATTERN);
    if (dateMatch) {
      const [, monthStr, dayStr, rawYear] = dateMatch;
      const normalized = normalizeDate(Number(monthStr), Number(dayStr), rawYear, year);
      if (normalized) currentDate = normalized;
    }

    const lineCarbRatioMatch = line.match(CARB_RATIO_PATTERN);
    const lineIsfMatch = line.match(ISF_PATTERN);
    if (lineCarbRatioMatch) currentCarbRatio = Number(lineCarbRatioMatch[1]);
    if (lineIsfMatch) currentIsf = Number(lineIsfMatch[1]);

    const mealType = findMealType(line);
    if (!mealType) continue;

    if (!currentDate) {
      warnings.push(`Found "${mealType}" but no date had been read yet on or before that line -- skipped it.`);
      continue;
    }

    const windowText = collectEntryWindow(lines, i);
    const numbers = extractNumbers(windowText.replace(DATE_PATTERN, ' '));

    const carbRatioMatch = windowText.match(CARB_RATIO_PATTERN);
    const isfMatch = windowText.match(ISF_PATTERN);
    const carbRatio = carbRatioMatch ? Number(carbRatioMatch[1]) : currentCarbRatio;
    const isf = isfMatch ? Number(isfMatch[1]) : currentIsf;

    if (numbers.length === 0) {
      continue;
    }

    const { carbs, bolus, glucoseAtBolus } = classifyNumbers(numbers);
    if (carbs == null && bolus == null && glucoseAtBolus == null) continue;

    if (numbers.length > 3) {
      warnings.push(`"${mealType}" on ${currentDate}: found ${numbers.length} numbers nearby and guessed which is which -- double-check this row.`);
    }

    entries.push({ date: currentDate, mealType, carbs, bolus, glucoseAtBolus, carbRatio, isf });
  }

  return { entries, warnings };
}
