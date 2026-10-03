
import type { PatternOccurrence } from './types';

export interface Reading {
  t: Date;
  v: number;
}

const PATTERN_BUCKET_HOURS = 4;

export function bucketByFourHourWindow(hours: number[]): PatternOccurrence[] {
  const counts = new Map<number, number>();
  for (const hour of hours) {
    const bucketStart = Math.floor(hour / PATTERN_BUCKET_HOURS) * PATTERN_BUCKET_HOURS;
    counts.set(bucketStart, (counts.get(bucketStart) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucketStart, occurrences]) => ({
      window: `${bucketStart}:00 - ${bucketStart + PATTERN_BUCKET_HOURS - 1}:59`,
      occurrences,
    }));
}

export interface LowEpisode {
  start: Date;
  end: Date;
  durationMin: number;
  nadir: number;
  hour: number;
}

export interface HighEpisode {
  start: Date;
  end: Date;
  durationMin: number;
  peak: number;
  hour: number;
}

interface RawEpisode {
  start: Date;
  end: Date;
  points: Reading[];
}

function groupConsecutive(readings: Reading[], intervalMinutes: number, isFlagged: (v: number) => boolean): RawEpisode[] {
  const episodes: RawEpisode[] = [];
  let current: RawEpisode | null = null;
  const maxGapMinutes = intervalMinutes * 3;

  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];

    if (isFlagged(r.v)) {
      if (current === null) {
        current = { start: r.t, end: r.t, points: [r] };
      } else {
        const gapMinutes = (r.t.getTime() - current.end.getTime()) / 60000;
        if (gapMinutes <= maxGapMinutes) {
          current.end = r.t;
          current.points.push(r);
        } else {
          episodes.push(current);
          current = { start: r.t, end: r.t, points: [r] };
        }
      }
    } else {
      if (current !== null) {
        episodes.push(current);
        current = null;
      }
    }
  }
  if (current !== null) {
    episodes.push(current);
  }
  return episodes;
}

export function findLowEpisodes(readings: Reading[], lowLimit: number, intervalMinutes: number): LowEpisode[] {
  const episodes = groupConsecutive(readings, intervalMinutes, (v) => v < lowLimit);

  const result: LowEpisode[] = [];
  for (const e of episodes) {
    const durationMin = (e.end.getTime() - e.start.getTime()) / 60000 + intervalMinutes;
    if (durationMin >= 15) {
      const nadir = Math.min(...e.points.map((p) => p.v));
      result.push({ start: e.start, end: e.end, durationMin, nadir, hour: e.start.getHours() });
    }
  }
  return result;
}

export function findHighEpisodes(readings: Reading[], highLimit: number, intervalMinutes: number): HighEpisode[] {
  const episodes = groupConsecutive(readings, intervalMinutes, (v) => v > highLimit);

  const result: HighEpisode[] = [];
  for (const e of episodes) {
    const durationMin = (e.end.getTime() - e.start.getTime()) / 60000 + intervalMinutes;
    if (durationMin >= 15) {
      const peak = Math.max(...e.points.map((p) => p.v));
      result.push({ start: e.start, end: e.end, durationMin, peak, hour: e.start.getHours() });
    }
  }
  return result;
}

export interface MealSuggestionResult {
  rise: number;
  extraUnits: number;
  suggestedRatio: number;
}

export function computeMealSuggestion(
  carbs: number,
  bolus: number,
  glucoseAtBolus: number,
  glucoseAt2h: number,
  isf: number,
  targetRise: number
): MealSuggestionResult {
  const rise = glucoseAt2h - glucoseAtBolus;
  const excess = Math.max(0, rise - targetRise);
  const extraUnits = isf > 0 ? excess / isf : 0;
  const newBolus = bolus + extraUnits;
  const suggestedRatio = newBolus > 0 ? carbs / newBolus : carbs;

  return { rise, extraUnits, suggestedRatio };
}

const CARB_PEAK_MINUTES = 45;
const CARB_DURATION_MINUTES = 180;
const INSULIN_PEAK_MINUTES = 75;
const INSULIN_DURATION_MINUTES = 240;

function cumulativeTriangleFraction(minute: number, peakMinutes: number, durationMinutes: number): number {
  if (minute <= 0) {
    return 0;
  }
  if (minute >= durationMinutes) {
    return 1;
  }

  const totalArea = durationMinutes / 2;
  let areaSoFar: number;

  if (minute <= peakMinutes) {
    const heightAtMinute = minute / peakMinutes;
    areaSoFar = 0.5 * minute * heightAtMinute;
  } else {
    const risingArea = 0.5 * peakMinutes;
    const fallingDuration = durationMinutes - peakMinutes;
    const elapsedAfterPeak = minute - peakMinutes;
    const heightAtMinute = 1 - elapsedAfterPeak / fallingDuration;
    const fallingArea = 0.5 * (1 + heightAtMinute) * elapsedAfterPeak;
    areaSoFar = risingArea + fallingArea;
  }

  return areaSoFar / totalArea;
}

export function carbEffectFromRatio(carbs: number, isf: number, ratio: number): number {
  if (ratio <= 0) {
    return 0;
  }
  return carbs * (isf / ratio);
}

export interface CurvePoint {
  minute: number;
  glucose: number;
}

export interface SimEvent {
  label: string;
  minuteOffset: number;
  totalCarbEffect: number;
  totalInsulinEffect: number;
}

export function simulateMultiEventCurve(
  startGlucose: number,
  events: SimEvent[],
  totalMinutes: number,
  stepMinutes: number
): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let minute = 0; minute <= totalMinutes; minute += stepMinutes) {
    let glucose = startGlucose;
    for (const event of events) {
      const elapsed = minute - event.minuteOffset;
      if (elapsed < 0) continue;
      const carbFraction = cumulativeTriangleFraction(elapsed, CARB_PEAK_MINUTES, CARB_DURATION_MINUTES);
      const insulinFraction = cumulativeTriangleFraction(elapsed, INSULIN_PEAK_MINUTES, INSULIN_DURATION_MINUTES);
      glucose += event.totalCarbEffect * carbFraction - event.totalInsulinEffect * insulinFraction;
    }
    points.push({ minute, glucose: Math.max(0, glucose) });
  }
  return points;
}

export function simulateMealCurve(
  startGlucose: number,
  totalCarbEffect: number,
  totalInsulinEffect: number,
  totalMinutes: number,
  stepMinutes: number
): CurvePoint[] {
  return simulateMultiEventCurve(
    startGlucose,
    [{ label: '', minuteOffset: 0, totalCarbEffect, totalInsulinEffect }],
    totalMinutes,
    stepMinutes
  );
}

const EXPERIMENT_INSULIN_TAU_MINUTES = 75;

function cumulativeInsulinActionFraction(minute: number, tau: number): number {
  if (minute <= 0) return 0;
  const ratio = minute / tau;
  return 1 - (1 + ratio) * Math.exp(-ratio);
}

export function simulateExperimentCurve(
  baseline: CurvePoint[],
  carbs: number,
  currentRatio: number,
  experimentRatio: number,
  isf: number
): CurvePoint[] {
  const baselineBolus = currentRatio > 0 ? carbs / currentRatio : 0;
  const experimentBolus = experimentRatio > 0 ? carbs / experimentRatio : 0;
  const insulinDelta = baselineBolus - experimentBolus;
  const maxGlucoseShift = insulinDelta * isf;

  return baseline.map((point) => {
    const actionFraction = cumulativeInsulinActionFraction(point.minute, EXPERIMENT_INSULIN_TAU_MINUTES);
    return { minute: point.minute, glucose: Math.max(0, point.glucose + maxGlucoseShift * actionFraction) };
  });
}

export function maxSafeReduction(
  startGlucose: number,
  totalCarbEffect: number,
  normalUnits: number,
  isf: number,
  highThreshold: number,
  totalMinutes: number,
  stepMinutes: number
): number {
  const REDUCTION_STEP = 0.1;
  let safeReduction = 0;

  for (let reduction = 0; reduction <= normalUnits; reduction += REDUCTION_STEP) {
    const plannedUnits = Math.max(0, normalUnits - reduction);
    const curve = simulateMealCurve(startGlucose, totalCarbEffect, plannedUnits * isf, totalMinutes, stepMinutes);
    const peak = Math.max(...curve.map((p) => p.glucose));
    if (peak > highThreshold) break;
    safeReduction = reduction;
  }

  return safeReduction;
}

export interface CurveStats {
  minGlucose: number;
  maxGlucose: number;
  percentInRange: number;
  minutesLow: number;
  minutesHigh: number;
}

export function summarizeCurve(points: CurvePoint[], stepMinutes: number): CurveStats {
  let minGlucose = Infinity;
  let maxGlucose = -Infinity;
  let inRangeCount = 0;
  let minutesLow = 0;
  let minutesHigh = 0;

  for (const p of points) {
    if (p.glucose < minGlucose) minGlucose = p.glucose;
    if (p.glucose > maxGlucose) maxGlucose = p.glucose;
    if (p.glucose >= 70 && p.glucose <= 180) inRangeCount++;
    if (p.glucose < 70) minutesLow += stepMinutes;
    if (p.glucose > 180) minutesHigh += stepMinutes;
  }

  return {
    minGlucose,
    maxGlucose,
    percentInRange: points.length > 0 ? (inRangeCount / points.length) * 100 : 0,
    minutesLow,
    minutesHigh,
  };
}

export function insulinOnBoard(event: SimEvent, minutesSinceEvent: number, isf: number): number {
  if (minutesSinceEvent < 0 || isf <= 0) return 0;
  const insulinFraction = cumulativeTriangleFraction(minutesSinceEvent, INSULIN_PEAK_MINUTES, INSULIN_DURATION_MINUTES);
  const remainingEffect = event.totalInsulinEffect * (1 - insulinFraction);
  return remainingEffect / isf;
}

export function linearInsulinOnBoard(previousDoseUnits: number, minutesElapsed: number, diaMinutes: number): number {
  if (previousDoseUnits <= 0 || diaMinutes <= 0 || minutesElapsed < 0 || minutesElapsed >= diaMinutes) return 0;
  return previousDoseUnits * ((diaMinutes - minutesElapsed) / diaMinutes);
}

export interface BolusCalculatorInput {
  currentBG: number;
  targetBG: number;
  carbs: number;
  icr: number;
  isf: number;
  iob: number;
}

export interface BolusCalculatorResult {
  foodBolus: number;
  rawCorrection: number;
  netCorrection: number;
  totalDose: number;
  isReverseCorrection: boolean;
}

export function calculateBolus(input: BolusCalculatorInput): BolusCalculatorResult {
  const foodBolus = input.icr > 0 ? input.carbs / input.icr : 0;
  const rawCorrection = input.isf > 0 ? (input.currentBG - input.targetBG) / input.isf : 0;

  if (rawCorrection < 0) {
    const reverseAmount = Math.abs(rawCorrection);
    return {
      foodBolus,
      rawCorrection,
      netCorrection: rawCorrection,
      totalDose: Math.max(0, foodBolus - reverseAmount),
      isReverseCorrection: true,
    };
  }

  const netCorrection = Math.max(0, rawCorrection - input.iob);
  return {
    foodBolus,
    rawCorrection,
    netCorrection,
    totalDose: Math.max(0, foodBolus + netCorrection),
    isReverseCorrection: false,
  };
}

export interface TddDerivedFactors {
  carbRatio: number;
  isf: number;
}

export function factorsFromTdd(tdd: number): TddDerivedFactors | null {
  if (tdd <= 0) return null;
  return {
    carbRatio: 500 / tdd,
    isf: 1800 / tdd,
  };
}

const EXERCISE_MAX_REDUCTION_PERCENT: Record<1 | 2 | 3, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
};
const EXERCISE_BENCHMARK_MINUTES = 45;
const MIN_EXERCISE_MINUTES = 5;
const MAX_EXERCISE_MINUTES = 45;

const SMALL_DOSE_THRESHOLD_UNITS = 2;
const INTENSITY_BURN_RATE_MG_DL_PER_MINUTE: Record<1 | 2 | 3, number> = {
  1: 1.5,
  2: 2.5,
  3: 4,
};

function usesPointsEngine(standardMealDose: number): boolean {
  return standardMealDose > 0 && standardMealDose <= SMALL_DOSE_THRESHOLD_UNITS;
}

export interface ExerciseReductionSuggestion {
  usedPointsEngine: boolean;
  scaledPercent: number;
  rawReductionUnits: number;
  quantizedUnits: number;
  suggestedUnits: number;
}

export function exerciseReductionUnits(standardMealDose: number, intensity: 1 | 2 | 3, exerciseMinutes: number, isf: number): ExerciseReductionSuggestion {
  const usedPointsEngine = usesPointsEngine(standardMealDose);
  const rawReductionUnits = usedPointsEngine
    ? isf > 0
      ? (INTENSITY_BURN_RATE_MG_DL_PER_MINUTE[intensity] * exerciseMinutes) / isf
      : 0
    : standardMealDose * (EXERCISE_MAX_REDUCTION_PERCENT[intensity] * (exerciseMinutes / EXERCISE_BENCHMARK_MINUTES));
  const quantizedUnits = Math.round(rawReductionUnits * 2) / 2;
  const suggestedUnits = Math.max(0.5, Math.min(5, quantizedUnits));
  const scaledPercent = standardMealDose > 0 ? rawReductionUnits / standardMealDose : 0;
  return { usedPointsEngine, scaledPercent, rawReductionUnits, quantizedUnits, suggestedUnits };
}

export interface RequiredExerciseTime {
  intensity: 1 | 2 | 3;
  usedPointsEngine: boolean;
  rMax: number;
  burnRate: number;
  rawMinutes: number;
  minutes: number | null;
  feasible: boolean;
  belowMinimum: boolean;
}

export function requiredExerciseMinutes(targetReductionUnits: number, standardMealDose: number, intensity: 1 | 2 | 3, isf: number): RequiredExerciseTime {
  const rMax = EXERCISE_MAX_REDUCTION_PERCENT[intensity];
  const burnRate = INTENSITY_BURN_RATE_MG_DL_PER_MINUTE[intensity];
  const usedPointsEngine = usesPointsEngine(standardMealDose);

  if (standardMealDose <= 0 || targetReductionUnits <= 0 || (usedPointsEngine && isf <= 0)) {
    return { intensity, usedPointsEngine, rMax, burnRate, rawMinutes: 0, minutes: null, feasible: false, belowMinimum: false };
  }

  const rawMinutes = usedPointsEngine
    ? (targetReductionUnits * isf) / burnRate
    : (targetReductionUnits / (standardMealDose * rMax)) * EXERCISE_BENCHMARK_MINUTES;
  if (rawMinutes > MAX_EXERCISE_MINUTES) {
    return { intensity, usedPointsEngine, rMax, burnRate, rawMinutes, minutes: null, feasible: false, belowMinimum: false };
  }

  return {
    intensity,
    usedPointsEngine,
    rMax,
    burnRate,
    rawMinutes,
    minutes: Math.max(MIN_EXERCISE_MINUTES, rawMinutes),
    feasible: true,
    belowMinimum: rawMinutes < MIN_EXERCISE_MINUTES,
  };
}
