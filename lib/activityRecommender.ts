import { ACTIVITIES, type Activity } from './activityData';

export type Setting = 'indoor' | 'outdoor' | 'either';
export type Severity = 'none' | 'small' | 'moderate' | 'large';

export interface RecommendationInput {
  extraRise: number;
  preferredIntensity: 1 | 2 | 3;
  preferredDurationMinutes: number;
  preferredSetting: Setting;
  priorInsulinOnBoard?: number;
}

export interface Recommendation {
  severity: Severity;
  targetIntensity: 1 | 2 | 3;
  activities: Activity[];
  intensityCappedByIOB: boolean;
}

export function severityFromExtraRise(extraRise: number): Severity {
  if (extraRise <= 0) return 'none';
  if (extraRise < 30) return 'small';
  if (extraRise <= 70) return 'moderate';
  return 'large';
}

function intensityCapFromIOB(priorInsulinOnBoard: number): 1 | 2 | 3 {
  if (priorInsulinOnBoard > 1) return 1;
  if (priorInsulinOnBoard > 0.3) return 2;
  return 3;
}

function matchesSetting(activity: Activity, setting: Setting): boolean {
  if (setting === 'either') return true;
  return setting === 'indoor' ? activity.indoor : activity.outdoor;
}

function scoreActivity(activity: Activity, targetIntensity: number, preferredDurationMinutes: number): number {
  const intensityDiff = Math.abs(activity.intensity - targetIntensity);
  const durationDiff = Math.abs(activity.durationMinutes - preferredDurationMinutes) / Math.max(preferredDurationMinutes, 1);
  return intensityDiff * 2 + durationDiff;
}

const MAX_SUGGESTIONS = 9;

export function recommendActivities(input: RecommendationInput): Recommendation {
  const severity = severityFromExtraRise(input.extraRise);
  const iobCap = input.priorInsulinOnBoard ? intensityCapFromIOB(input.priorInsulinOnBoard) : 3;
  const targetIntensity = Math.min(input.preferredIntensity, iobCap) as 1 | 2 | 3;
  const intensityCappedByIOB = iobCap < input.preferredIntensity;

  const withinComfort = ACTIVITIES.filter((a) => matchesSetting(a, input.preferredSetting) && a.intensity <= input.preferredIntensity);
  const pool = withinComfort.length > 0 ? withinComfort : ACTIVITIES.filter((a) => matchesSetting(a, input.preferredSetting));

  const activities = [...pool]
    .sort((a, b) => scoreActivity(a, targetIntensity, input.preferredDurationMinutes) - scoreActivity(b, targetIntensity, input.preferredDurationMinutes))
    .slice(0, MAX_SUGGESTIONS);

  return { severity, targetIntensity, activities, intensityCappedByIOB };
}
