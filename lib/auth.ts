import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { db, type UserRow } from '@/lib/db';

export const SESSION_COOKIE = 'session';
const SESSION_LENGTH_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(userId: number): string {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);

  return token;
}

export function destroySession(token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export interface CurrentUser {
  id: number;
  email: string;
  fullName: string;
  defaultTargetRise: number;
  preferredIntensity: number;
  preferredDurationMinutes: number;
  preferredSetting: string;
  mealTargetCarbs: number | null;
  mealTargetFiber: number | null;
  mealTargetProtein: number | null;
  mealWeightLbs: number | null;
  mealHeightFt: number | null;
  mealHeightIn: number | null;
  mealGender: string | null;
  mealCuisines: string | null;
  mealDietSubtypes: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as
    | { user_id: number; expires_at: string }
    | undefined;

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    destroySession(token);
    return null;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as UserRow | undefined;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    defaultTargetRise: user.default_target_rise,
    preferredIntensity: user.preferred_intensity,
    preferredDurationMinutes: user.preferred_duration_minutes,
    preferredSetting: user.preferred_setting,
    mealTargetCarbs: user.meal_target_carbs,
    mealTargetFiber: user.meal_target_fiber,
    mealTargetProtein: user.meal_target_protein,
    mealWeightLbs: user.meal_weight_lbs,
    mealHeightFt: user.meal_height_ft,
    mealHeightIn: user.meal_height_in,
    mealGender: user.meal_gender,
    mealCuisines: user.meal_cuisines,
    mealDietSubtypes: user.meal_diet_subtypes,
  };
}
