export interface StatsBlock {
  averageSG?: number;
  gmi?: number;
  estimatedA1c?: number;
  coefficientOfVariation?: number;
}

export interface PatternOccurrence {
  window: string;
  occurrences: number;
}

export interface DayMealData {
  date: string;
  carbs: number;
  fiber: number | null;
  protein: number | null;
  bolus: number;
  glucoseAtBolus: number | null;
  glucoseAtTwoHour: number | null;
  currentRatio: number | null;
  isf: number | null;
}

export interface MealDefault {
  label: string;
  defaultHour: number;
  currentRatio: number | null;
  isf: number | null;
  avgCarbs: number | null;
  avgFiber: number | null;
  avgProtein: number | null;
  avgBolus: number | null;
  sgAtBolus: number | null;
  sgAtTwoHour: number | null;
  dayCount: number | null;
  days: DayMealData[];
}

export interface AnalysisResult {
  stats: StatsBlock | null;
  hypoglycemicPatterns: PatternOccurrence[];
  hyperglycemicPatterns: PatternOccurrence[];
  mealDefaults: MealDefault[];
}

export interface MealRowState {
  label: string;
  time: string;
  carbs: number;
  fiber: number;
  protein: number;
  bolus: number;
  glucoseAtBolus: number;
  glucoseAt2h: number;
  isf: number;
  currentRatio: number;
  experimentRatio: number;
  autoFilled: boolean;
  dayCount: number | null;
  days: DayMealData[];
}

export interface WorksheetSnapshot {
  targetRise: number;
  rows: MealRowState[];
}
