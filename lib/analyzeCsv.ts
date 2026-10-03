import { parseCareLinkCsv, csvNumber, csvTimestamp, type CareLinkRow } from './csvParse';
import { bucketByFourHourWindow, findLowEpisodes, findHighEpisodes, type Reading } from './glucoseMath';
import type { AnalysisResult, DayMealData, MealDefault, StatsBlock } from './types';

const MEAL_WINDOWS: { label: string; defaultHour: number; startHour: number; endHour: number; minCarbs: number }[] = [
  { label: 'Breakfast', defaultHour: 8, startHour: 6, endHour: 10, minCarbs: 0 },
  { label: 'Lunch', defaultHour: 13, startHour: 11, endHour: 15, minCarbs: 30 },
  { label: 'Dinner', defaultHour: 19, startHour: 16, endHour: 22, minCarbs: 30 },
  { label: 'Overnight', defaultHour: 2, startHour: 22, endHour: 6, minCarbs: 0 },
];

function mealLabelForHour(hour: number): string | null {
  for (const w of MEAL_WINDOWS) {
    if (w.startHour < w.endHour) {
      if (hour >= w.startHour && hour < w.endHour) return w.label;
    } else if (hour >= w.startHour || hour < w.endHour) {
      return w.label;
    }
  }
  return null;
}

function minCarbsForLabel(label: string): number {
  return MEAL_WINDOWS.find((w) => w.label === label)?.minCarbs ?? 0;
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

function buildReadings(rows: CareLinkRow[]): Reading[] {
  const readings: Reading[] = [];
  for (const row of rows) {
    if (row.section !== 'Sensor') continue;
    const v = csvNumber(row, 'Sensor Glucose (mg/dL)');
    const t = csvTimestamp(row);
    if (v == null || !t) continue;
    readings.push({ t, v });
  }
  readings.sort((a, b) => a.t.getTime() - b.t.getTime());
  return readings;
}

const LOOKUP_TOLERANCE_MS = 15 * 60 * 1000;

function glucoseNear(readings: Reading[], target: Date): number | null {
  let best: Reading | null = null;
  let bestDiffMs = Infinity;
  for (const r of readings) {
    const diffMs = Math.abs(r.t.getTime() - target.getTime());
    if (diffMs < bestDiffMs) {
      bestDiffMs = diffMs;
      best = r;
    }
  }
  return best && bestDiffMs <= LOOKUP_TOLERANCE_MS ? best.v : null;
}

interface MealEvent {
  label: string;
  timestamp: Date;
  carbs: number;
  bolus: number;
  glucoseAtBolus: number | null;
  carbRatio: number | null;
  isf: number | null;
}

function buildMealEvents(rows: CareLinkRow[]): MealEvent[] {
  const events: MealEvent[] = [];
  for (const row of rows) {
    if (row.section !== 'Pump') continue;

    const carbs = csvNumber(row, 'BWZ Carb Input (grams)');
    if (carbs == null || carbs <= 0) continue;

    const timestamp = csvTimestamp(row);
    if (!timestamp) continue;

    const label = mealLabelForHour(timestamp.getHours());
    if (!label) continue;
    if (carbs < minCarbsForLabel(label)) continue;

    const rawGlucose = csvNumber(row, 'BWZ BG/SG Input (mg/dL)');

    events.push({
      label,
      timestamp,
      carbs,
      bolus: csvNumber(row, 'BWZ Estimate (U)') ?? 0,
      glucoseAtBolus: rawGlucose && rawGlucose > 0 ? rawGlucose : null,
      carbRatio: csvNumber(row, 'BWZ Carb Ratio (g/U)'),
      isf: csvNumber(row, 'BWZ Insulin Sensitivity (mg/dL/U)'),
    });
  }
  return events;
}

function dayBucketKey(timestamp: Date, label: string): string {
  const d = new Date(timestamp);
  if (label === 'Overnight' && d.getHours() < 12) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface DayAggregate {
  date: string;
  totalCarbs: number;
  totalBolus: number;
  mainEvent: MealEvent;
}

function aggregateByDay(events: MealEvent[]): DayAggregate[] {
  const byDay = new Map<string, MealEvent[]>();
  for (const e of events) {
    const key = dayBucketKey(e.timestamp, e.label);
    const list = byDay.get(key);
    if (list) list.push(e);
    else byDay.set(key, [e]);
  }

  return Array.from(byDay.entries())
    .map(([date, dayEvents]) => ({
      date,
      totalCarbs: dayEvents.reduce((sum, e) => sum + e.carbs, 0),
      totalBolus: dayEvents.reduce((sum, e) => sum + e.bolus, 0),
      mainEvent: dayEvents.reduce((biggest, e) => (e.carbs > biggest.carbs ? e : biggest)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildMealDefaults(events: MealEvent[], readings: Reading[]): MealDefault[] {
  return MEAL_WINDOWS.map(({ label, defaultHour }) => {
    const days = aggregateByDay(events.filter((e) => e.label === label));

    const dayList: DayMealData[] = days.map((d) => ({
      date: d.date,
      carbs: round(d.totalCarbs, 0) ?? d.totalCarbs,
      fiber: null,
      protein: null,
      bolus: round(d.totalBolus, 1) ?? d.totalBolus,
      glucoseAtBolus: d.mainEvent.glucoseAtBolus,
      glucoseAtTwoHour: glucoseNear(readings, new Date(d.mainEvent.timestamp.getTime() + 2 * 60 * 60 * 1000)),
      currentRatio: d.mainEvent.carbRatio,
      isf: d.mainEvent.isf,
    }));

    return {
      label,
      defaultHour,
      currentRatio: round(average(dayList.map((d) => d.currentRatio).filter((v): v is number => v != null)), 1),
      isf: round(average(dayList.map((d) => d.isf).filter((v): v is number => v != null)), 0),
      avgCarbs: round(average(dayList.map((d) => d.carbs)), 0),
      avgFiber: null,
      avgProtein: null,
      avgBolus: round(average(dayList.map((d) => d.bolus)), 1),
      sgAtBolus: round(average(dayList.map((d) => d.glucoseAtBolus).filter((v): v is number => v != null)), 0),
      sgAtTwoHour: round(average(dayList.map((d) => d.glucoseAtTwoHour).filter((v): v is number => v != null)), 0),
      dayCount: dayList.length > 0 ? dayList.length : null,
      days: dayList,
    };
  });
}

function computeStats(readings: Reading[]): StatsBlock | null {
  if (readings.length === 0) return null;

  const values = readings.map((r) => r.v);
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

const LOW_THRESHOLD = 70;
const HIGH_THRESHOLD = 180;
const SENSOR_INTERVAL_MINUTES = 5;

export function analyzeCareLinkCsv(rawText: string): AnalysisResult {
  const rows = parseCareLinkCsv(rawText);
  const readings = buildReadings(rows);
  const events = buildMealEvents(rows);

  const lowEpisodes = findLowEpisodes(readings, LOW_THRESHOLD, SENSOR_INTERVAL_MINUTES);
  const highEpisodes = findHighEpisodes(readings, HIGH_THRESHOLD, SENSOR_INTERVAL_MINUTES);

  return {
    stats: computeStats(readings),
    hypoglycemicPatterns: bucketByFourHourWindow(lowEpisodes.map((e) => e.hour)),
    hyperglycemicPatterns: bucketByFourHourWindow(highEpisodes.map((e) => e.hour)),
    mealDefaults: buildMealDefaults(events, readings),
  };
}
