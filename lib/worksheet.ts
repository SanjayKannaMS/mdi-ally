import type { MealDefault, MealRowState } from './types';

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function toRowState(m: MealDefault): MealRowState {
  const autoFilled = m.avgCarbs != null && m.avgBolus != null && m.sgAtBolus != null && m.sgAtTwoHour != null;
  return {
    label: m.label,
    time: formatHour(m.defaultHour),
    carbs: m.avgCarbs ?? 0,
    fiber: m.avgFiber ?? 0,
    protein: m.avgProtein ?? 0,
    bolus: m.avgBolus ?? 0,
    glucoseAtBolus: m.sgAtBolus ?? 0,
    glucoseAt2h: m.sgAtTwoHour ?? 0,
    isf: m.isf ?? 100,
    currentRatio: m.currentRatio ?? 0,
    experimentRatio: m.currentRatio ?? 0,
    autoFilled,
    dayCount: m.dayCount,
    days: m.days,
  };
}
