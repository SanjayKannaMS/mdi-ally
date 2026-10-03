export type Gender = 'Male' | 'Female' | 'Other';

export interface BodyStatsTargets {
  carbs: number;
  fiber: number;
  protein: number;
}

const LBS_TO_KG = 0.453592;
const INCHES_TO_CM = 2.54;
const ASSUMED_AGE = 30;
const ACTIVITY_MULTIPLIER = 1.375;
const DIABETES_CARB_CALORIE_SHARE = 0.4;

export function computeBodyStatsTargets(weightLbs: number, heightInches: number, gender: Gender): BodyStatsTargets {
  const weightKg = weightLbs * LBS_TO_KG;
  const heightCm = heightInches * INCHES_TO_CM;

  const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * ASSUMED_AGE;
  const bmr = gender === 'Male' ? bmrBase + 5 : gender === 'Female' ? bmrBase - 161 : bmrBase - 78;

  const calories = bmr * ACTIVITY_MULTIPLIER;
  const carbs = (calories * DIABETES_CARB_CALORIE_SHARE) / 4;
  const protein = weightKg * 1.0;
  const fiber = gender === 'Male' ? 38 : gender === 'Female' ? 25 : 31.5;

  return {
    carbs: Math.round(carbs),
    fiber: Math.round(fiber),
    protein: Math.round(protein),
  };
}
