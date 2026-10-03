import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function parseJsonOrNull<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  return NextResponse.json({
    targetCarbs: user.mealTargetCarbs,
    targetFiber: user.mealTargetFiber,
    targetProtein: user.mealTargetProtein,
    weightLbs: user.mealWeightLbs,
    heightFt: user.mealHeightFt,
    heightIn: user.mealHeightIn,
    gender: user.mealGender,
    cuisines: parseJsonOrNull<string[]>(user.mealCuisines),
    dietSubtypes: parseJsonOrNull<Record<string, string[]>>(user.mealDietSubtypes),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const body = await req.json();
  const carbs = Number(body.targetCarbs);
  const fiber = Number(body.targetFiber);
  const protein = Number(body.targetProtein);

  if (!Number.isFinite(carbs) || carbs < 0 || !Number.isFinite(fiber) || fiber < 0 || !Number.isFinite(protein) || protein < 0) {
    return NextResponse.json({ error: 'Invalid targets.' }, { status: 400 });
  }

  const weightLbs = Number.isFinite(Number(body.weightLbs)) ? Number(body.weightLbs) : 0;
  const heightFt = Number.isFinite(Number(body.heightFt)) ? Number(body.heightFt) : 0;
  const heightIn = Number.isFinite(Number(body.heightIn)) ? Number(body.heightIn) : 0;
  const gender = typeof body.gender === 'string' ? body.gender : null;
  const cuisines = Array.isArray(body.cuisines) ? body.cuisines.filter((c: unknown) => typeof c === 'string') : [];
  const dietSubtypes =
    body.dietSubtypes && typeof body.dietSubtypes === 'object'
      ? Object.fromEntries(
          Object.entries(body.dietSubtypes as Record<string, unknown>).map(([diet, subtypes]) => [
            diet,
            Array.isArray(subtypes) ? subtypes.filter((s: unknown) => typeof s === 'string') : [],
          ])
        )
      : {};

  db.prepare(
    `UPDATE users SET
      meal_target_carbs = ?, meal_target_fiber = ?, meal_target_protein = ?,
      meal_weight_lbs = ?, meal_height_ft = ?, meal_height_in = ?, meal_gender = ?,
      meal_cuisines = ?, meal_diet_subtypes = ?
    WHERE id = ?`
  ).run(carbs, fiber, protein, weightLbs, heightFt, heightIn, gender, JSON.stringify(cuisines), JSON.stringify(dietSubtypes), user.id);

  return NextResponse.json({ ok: true });
}
