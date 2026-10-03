const STORAGE_KEY = 't1d:mealPlannerImport';

export interface MealPlannerImport {
  totalCarbs: number;
  source: string;
  savedAt: string;
  mealType?: string;
}

export function saveMealPlannerImport(data: MealPlannerImport) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function readMealPlannerImport(): MealPlannerImport | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MealPlannerImport;
  } catch {
    return null;
  }
}

const MEAL_TYPE_MAP: Record<string, string> = {
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Overnight: 'Snack',
  'AM Snack': 'Snack',
  'PM Snack': 'Snack',
  Bedtime: 'Snack',
  '2am': 'Snack',
};

export function mapToRecipeMealType(analyzerMealType: string): string {
  return MEAL_TYPE_MAP[analyzerMealType] ?? 'Snack';
}
