import type { Metadata } from 'next';
import MealPlanner from '@/components/MealPlanner';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Meal Planner on MDI Ally',
};

function parseJsonOrNull<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default async function MealsPage() {
  const user = await getCurrentUser();

  return (
    <MealPlanner
      loggedIn={!!user}
      initialTargetCarbs={user?.mealTargetCarbs ?? null}
      initialTargetFiber={user?.mealTargetFiber ?? null}
      initialTargetProtein={user?.mealTargetProtein ?? null}
      initialWeightLbs={user?.mealWeightLbs ?? null}
      initialHeightFt={user?.mealHeightFt ?? null}
      initialHeightIn={user?.mealHeightIn ?? null}
      initialGender={user?.mealGender ?? null}
      initialCuisines={parseJsonOrNull<string[]>(user?.mealCuisines)}
      initialDietSubtypes={parseJsonOrNull<Record<string, string[]>>(user?.mealDietSubtypes)}
    />
  );
}
