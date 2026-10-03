import { bucketByFourHourWindow } from './glucoseMath';
import type { AnalysisResult, DayMealData, MealDefault, PatternOccurrence, StatsBlock } from './types';

export const MANUAL_ENTRY_LABEL = 'Manual entry';
export const PHOTO_LOG_LABEL = 'Photo/PDF log';

export type ReportSource = 'csv' | 'photo' | 'manual';

export function reportSourceFor(fileName: string): ReportSource {
  if (fileName === PHOTO_LOG_LABEL) return 'photo';
  if (fileName === MANUAL_ENTRY_LABEL) return 'manual';
  return 'csv';
}

export const MEAL_TYPES: { label: string; defaultHour: number }[] = [
  { label: 'Breakfast', defaultHour: 8 },
  { label: 'AM Snack', defaultHour: 10 },
  { label: 'Lunch', defaultHour: 13 },
  { label: 'PM Snack', defaultHour: 15 },
  { label: 'Dinner', defaultHour: 19 },
  { label: 'Bedtime', defaultHour: 21 },
  { label: '2am', defaultHour: 2 },
];

export interface ManualMealEntry {
  id: string;
  date: string;
  mealType: string;
  carbs: number;
  fiber: number | null;
  protein: number | null;
  bolus: number;
  carbRatio: number | null;
  isf: number | null;
  glucoseAtBolus: number | null;
  glucoseAtTwoHour: number | null;
}

export function nextEntryId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export interface ExtractedLogEntry {
  date: string;
  mealType: string;
  carbs: number | null;
  bolus: number | null;
  glucoseAtBolus: number | null;
  carbRatio: number | null;
  isf: number | null;
}

export function fromExtractedEntry(e: ExtractedLogEntry): ManualMealEntry | null {
  if (e.carbs == null && e.bolus == null) return null;
  return {
    id: nextEntryId(),
    date: e.date,
    mealType: e.mealType,
    carbs: e.carbs ?? 0,
    fiber: null,
    protein: null,
    bolus: e.bolus ?? 0,
    carbRatio: e.carbRatio,
    isf: e.isf,
    glucoseAtBolus: e.glucoseAtBolus,
    glucoseAtTwoHour: null,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number | null, decimals: number): number | null {
  if (value == null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0);
}

function aggregateByDay(entries: ManualMealEntry[]): DayMealData[] {
  const byDate = new Map<string, ManualMealEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }

  return Array.from(byDate.entries())
    .map(([date, dayEntries]) => {
      const mainEntry = dayEntries.reduce((biggest, e) => (e.carbs > biggest.carbs ? e : biggest));
      return {
        date,
        carbs: dayEntries.reduce((sum, e) => sum + e.carbs, 0),
        fiber: sumOrNull(dayEntries.map((e) => e.fiber)),
        protein: sumOrNull(dayEntries.map((e) => e.protein)),
        bolus: round(dayEntries.reduce((sum, e) => sum + e.bolus, 0), 1) ?? 0,
        glucoseAtBolus: mainEntry.glucoseAtBolus,
        glucoseAtTwoHour: mainEntry.glucoseAtTwoHour,
        currentRatio: mainEntry.carbRatio,
        isf: mainEntry.isf,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

const LOW_THRESHOLD = 70;
const HIGH_THRESHOLD = 180;

interface PointReading {
  hour: number;
  value: number;
}

function collectPointReadings(entries: ManualMealEntry[]): PointReading[] {
  const out: PointReading[] = [];
  for (const e of entries) {
    const hour = MEAL_TYPES.find((m) => m.label === e.mealType)?.defaultHour ?? 12;
    if (e.glucoseAtBolus != null) out.push({ hour, value: e.glucoseAtBolus });
    if (e.glucoseAtTwoHour != null) out.push({ hour: (hour + 2) % 24, value: e.glucoseAtTwoHour });
  }
  return out;
}

function computePointInTimeStats(readings: PointReading[]): StatsBlock | null {
  if (readings.length === 0) return null;

  const values = readings.map((r) => r.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const gmi = 3.31 + 0.02392 * mean;
  const estimatedA1c = (mean + 46.7) / 28.7;

  return {
    averageSG: round(mean, 0) ?? undefined,
    coefficientOfVariation: round((standardDeviation / mean) * 100, 1) ?? undefined,
    gmi: round(gmi, 1) ?? undefined,
    estimatedA1c: round(estimatedA1c, 1) ?? undefined,
  };
}

function computePointInTimePatterns(readings: PointReading[], threshold: number, direction: 'low' | 'high'): PatternOccurrence[] {
  const hours = readings
    .filter((r) => (direction === 'low' ? r.value < threshold : r.value > threshold))
    .map((r) => r.hour);
  return bucketByFourHourWindow(hours);
}

export function buildManualLogResult(entries: ManualMealEntry[]): AnalysisResult {
  const mealDefaults: MealDefault[] = MEAL_TYPES.map(({ label, defaultHour }) => {
    const dayList = aggregateByDay(entries.filter((e) => e.mealType === label));

    return {
      label,
      defaultHour,
      currentRatio: round(average(dayList.map((d) => d.currentRatio).filter((v): v is number => v != null)), 1),
      isf: round(average(dayList.map((d) => d.isf).filter((v): v is number => v != null)), 0),
      avgCarbs: round(average(dayList.map((d) => d.carbs)), 0),
      avgFiber: round(average(dayList.map((d) => d.fiber).filter((v): v is number => v != null)), 0),
      avgProtein: round(average(dayList.map((d) => d.protein).filter((v): v is number => v != null)), 0),
      avgBolus: round(average(dayList.map((d) => d.bolus)), 1),
      sgAtBolus: round(average(dayList.map((d) => d.glucoseAtBolus).filter((v): v is number => v != null)), 0),
      sgAtTwoHour: round(average(dayList.map((d) => d.glucoseAtTwoHour).filter((v): v is number => v != null)), 0),
      dayCount: dayList.length > 0 ? dayList.length : null,
      days: dayList,
    };
  });

  const pointReadings = collectPointReadings(entries);

  return {
    stats: computePointInTimeStats(pointReadings),
    hypoglycemicPatterns: computePointInTimePatterns(pointReadings, LOW_THRESHOLD, 'low'),
    hyperglycemicPatterns: computePointInTimePatterns(pointReadings, HIGH_THRESHOLD, 'high'),
    mealDefaults,
  };
}
