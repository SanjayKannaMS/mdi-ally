import { createHash } from 'crypto';
import { db } from './db';
import { openAiPost, openAiStructured } from './openai';
import { CUISINES, DIET_SUBTYPES, MEAL_TYPES, type Diet, type MealSlot, type Recipe } from './mealPlannerData';

const RECIPE_MODEL = () => process.env.OPENAI_RECIPE_MODEL || 'gpt-4.1';
const IMAGE_MODEL = () => process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
// 'medium' is ~3x faster than 'high' (~35s vs ~100s per photo) and visually identical at card size.
const IMAGE_QUALITY = () => process.env.OPENAI_IMAGE_QUALITY || 'medium';
const IMAGE_SIZE = '1536x1024';

const DIETS = Object.keys(DIET_SUBTYPES) as Diet[];
const ALL_SUBTYPES = [...new Set(DIETS.flatMap((d) => DIET_SUBTYPES[d]))];

export interface MealPlanRequest {
  slots: MealSlot[];
  cuisines: string[];
  dietSubtypes: Partial<Record<Diet, string[]>>;
}

type RecipeFilters = Pick<MealPlanRequest, 'cuisines' | 'dietSubtypes'>;

function parseFilters(body: any): RecipeFilters | null {
  const cuisines = Array.isArray(body?.cuisines) ? body.cuisines.filter((c: unknown) => (CUISINES as readonly unknown[]).includes(c)) : [];
  const dietSubtypes: Partial<Record<Diet, string[]>> = {};
  for (const diet of DIETS) {
    const picked = body?.dietSubtypes?.[diet];
    if (Array.isArray(picked)) {
      const valid = picked.filter((s: unknown) => typeof s === 'string' && DIET_SUBTYPES[diet].includes(s));
      if (valid.length > 0) dietSubtypes[diet] = valid;
    }
  }
  if (cuisines.length === 0 || Object.keys(dietSubtypes).length === 0) return null;
  return { cuisines, dietSubtypes };
}

function num(v: unknown, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), max) : 0;
}

/** Validates an untrusted request body against the planner's known meal types, cuisines and diets. */
export function parseMealPlanRequest(body: any): MealPlanRequest | null {
  const filters = parseFilters(body);
  const slots: MealSlot[] = Array.isArray(body?.slots)
    ? body.slots
        .filter((s: any) => (MEAL_TYPES as readonly unknown[]).includes(s?.mealType))
        .slice(0, MEAL_TYPES.length)
        .map((s: any) => ({
          mealType: s.mealType,
          carbs: num(s.carbs, 400),
          fiber: num(s.fiber, 100),
          protein: num(s.protein, 300),
          count: Math.max(1, Math.min(5, num(s.count, 5))),
        }))
    : [];

  if (!filters || slots.length === 0) return null;
  return { slots, ...filters };
}

function recipeSchema(cuisines: string[], diets: Diet[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['recipes'],
    properties: {
      recipes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'cuisine', 'diet', 'subtype', 'emoji', 'desc', 'ingredients', 'steps'],
          properties: {
            name: { type: 'string' },
            cuisine: { type: 'string', enum: cuisines },
            diet: { type: 'string', enum: diets },
            subtype: { type: 'string', enum: ALL_SUBTYPES },
            emoji: { type: 'string', description: 'One food emoji' },
            desc: { type: 'string', description: 'One appetizing sentence' },
            ingredients: {
              type: 'array',
              description: 'Every ingredient for one serving, with its own nutrition for exactly that quantity',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['item', 'carbs', 'fiber', 'protein'],
                properties: {
                  item: { type: 'string', description: 'Quantity and ingredient, e.g. "100g cooked brown rice"' },
                  carbs: { type: 'number', description: 'Total carbohydrate grams in this quantity' },
                  fiber: { type: 'number', description: 'Dietary fiber grams in this quantity' },
                  protein: { type: 'number', description: 'Protein grams in this quantity' },
                },
              },
            },
            steps: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  };
}

function filterLines(req: RecipeFilters): string[] {
  const dietLines = Object.entries(req.dietSubtypes)
    .map(([diet, subtypes]) => `- ${diet}: ${subtypes!.join(', ')}`)
    .join('\n');
  return [
    `Allowed cuisines (spread recipes across them): ${req.cuisines.join(', ')}.`,
    `Allowed diets and protein subtypes (each recipe's diet + subtype must be one of these pairs):\n${dietLines}`,
    'Use realistic, home-cookable dishes with 4-8 ingredients and 3-6 clear steps.',
  ];
}

// Extra candidates are generated so the honest-but-off-target ones can be dropped.
const EXTRA_CANDIDATES = 3;

function slotPrompt(slot: MealSlot, req: MealPlanRequest): string {
  return [
    `Create ${slot.count + EXTRA_CANDIDATES} genuinely different ${slot.mealType.toLowerCase()} recipes, each a single serving.`,
    `Macro targets per serving to aim near: ${slot.carbs}g total carbs, ${slot.fiber}g fiber, ${slot.protein}g protein.`,
    'Choose portion sizes so each recipe lands close to the targets (carbs within about 15%), but do NOT force every recipe to the same numbers.',
    'For each ingredient, give the carbs, fiber and protein contained in exactly the quantity listed, using standard USDA FoodData Central values.',
    'Report the true values for the quantities you chose, even if that puts a recipe off target; never adjust nutrition numbers to match the targets.',
    'Include every ingredient that contributes carbs or protein (oils and spices can be listed with 0 where appropriate).',
    ...filterLines(req),
  ].join('\n');
}

/** Squared relative distance from the targets; carbs weigh most since insulin doses come from them. */
function targetDistance(r: Recipe, slot: MealSlot): number {
  const rel = (value: number, target: number) => (target > 0 ? (value - target) / target : 0);
  return 2 * rel(r.carbs, slot.carbs) ** 2 + rel(r.fiber, slot.fiber) ** 2 + rel(r.protein, slot.protein) ** 2;
}

function recipeId(r: Pick<Recipe, 'name' | 'cuisine' | 'mealType'>): string {
  return `ai-${createHash('sha256').update(`${r.mealType}|${r.cuisine}|${r.name}`).digest('hex').slice(0, 12)}`;
}

function sanitizeRecipe(raw: any, mealType: string, req: RecipeFilters): Recipe | null {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const diet = raw.diet as Diet;
  if (!req.cuisines.includes(raw.cuisine) || !req.dietSubtypes[diet]?.includes(raw.subtype)) return null;
  const grams = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : []);

  // Totals are summed here from the per-ingredient values rather than trusted as a single headline number.
  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : []).filter(
    (i: any) => i && typeof i.item === 'string' && i.item.trim()
  );
  if (ingredients.length === 0) return null;
  const sum = (key: 'carbs' | 'fiber' | 'protein') => Math.round(ingredients.reduce((t: number, i: any) => t + grams(i[key]), 0));

  const recipe: Recipe = {
    id: '',
    name: raw.name.trim(),
    cuisine: raw.cuisine,
    mealType,
    diet,
    subtype: raw.subtype,
    carbs: sum('carbs'),
    fiber: sum('fiber'),
    protein: sum('protein'),
    emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji : '🍽️',
    desc: typeof raw.desc === 'string' ? raw.desc : '',
    ingredients: ingredients.map((i: any) => i.item.trim()),
    steps: strings(raw.steps),
  };
  recipe.id = recipeId(recipe);
  return recipe;
}

async function generateRecipes(prompt: string, slot: MealSlot, req: RecipeFilters): Promise<Recipe[]> {
  const diets = Object.keys(req.dietSubtypes) as Diet[];
  const parsed = await openAiStructured<{ recipes?: unknown[] }>({
    model: RECIPE_MODEL(),
    temperature: 0.9,
    schemaName: 'meal_recipes',
    schema: recipeSchema(req.cuisines, diets),
    messages: [
      {
        role: 'system',
        content:
          'You are a registered dietitian and recipe developer creating meals for adults with type 1 diabetes on multiple daily injections. Nutrition numbers must be honest and accurate for the stated quantities, because they are used to estimate insulin doses.',
      },
      { role: 'user', content: prompt },
    ],
  });
  const raw = Array.isArray(parsed.recipes) ? parsed.recipes : [];
  const seen = new Set<string>();
  return raw
    .map((r) => sanitizeRecipe(r, slot.mealType, req))
    .filter((r): r is Recipe => r !== null && !seen.has(r.id) && !!seen.add(r.id))
    .sort((a, b) => targetDistance(a, slot) - targetDistance(b, slot))
    .slice(0, slot.count);
}

export interface MealPlanResult {
  plan: Record<string, Recipe[]>;
  warnings: string[];
}

export async function generateMealPlan(req: MealPlanRequest): Promise<MealPlanResult> {
  const results = await Promise.allSettled(req.slots.map((slot) => generateRecipes(slotPrompt(slot, req), slot, req)));
  const plan: Record<string, Recipe[]> = {};
  const warnings: string[] = [];
  results.forEach((result, i) => {
    const { mealType } = req.slots[i];
    if (result.status === 'fulfilled' && result.value.length > 0) {
      plan[mealType] = result.value;
    } else {
      if (result.status === 'rejected') console.error(`[meal-plan] ${mealType}`, result.reason);
      warnings.push(`Couldn't generate ${mealType.toLowerCase()} suggestions this time.`);
    }
  });
  if (Object.keys(plan).length === 0) throw new Error(warnings.join(' ') || 'No recipes generated.');
  return { plan, warnings };
}

// ---------- Dish photos ----------

export interface DishPhotoInput {
  name: string;
  cuisine: string;
  desc: string;
  ingredients: string[];
}

export function parseDishPhotoInput(body: any): DishPhotoInput | null {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = str(body?.name, 120);
  if (!name) return null;
  return {
    name,
    cuisine: str(body?.cuisine, 40),
    desc: str(body?.desc, 400),
    ingredients: Array.isArray(body?.ingredients) ? body.ingredients.slice(0, 12).map((i: unknown) => str(i, 80)).filter(Boolean) : [],
  };
}

export function dishPhotoKey(input: DishPhotoInput): string {
  return createHash('sha256')
    .update(`${IMAGE_MODEL()}|${IMAGE_QUALITY()}|${input.cuisine}|${input.name}|${input.desc}`)
    .digest('hex')
    .slice(0, 32);
}

function photoPrompt(input: DishPhotoInput): string {
  return [
    `Professional, high-resolution food photograph of "${input.name}"${input.cuisine ? `, a ${input.cuisine} dish` : ''}.`,
    input.desc,
    input.ingredients.length ? `Visible ingredients: ${input.ingredients.join('; ')}.` : '',
    'A single serving plated beautifully on a ceramic plate, styled for a premium cookbook.',
    'Soft natural window light, 45-degree angle, shallow depth of field, crisp sharp focus on the food, rich true-to-life colors and textures.',
    'No text, no labels, no watermarks, no hands or people.',
  ]
    .filter(Boolean)
    .join(' ');
}

const pendingPhotos = new Map<string, Promise<void>>();

export async function getCachedDishPhoto(key: string): Promise<{ mime: string; data: Buffer } | null> {
  return ((await db.prepare('SELECT mime, data FROM meal_images WHERE key = ?').get(key)) as { mime: string; data: Buffer } | undefined) ?? null;
}

/** Generates (or reuses a cached) photo for a dish and returns its cache key. */
export async function ensureDishPhoto(input: DishPhotoInput): Promise<string> {
  const key = dishPhotoKey(input);
  if (await db.prepare('SELECT 1 FROM meal_images WHERE key = ?').get(key)) return key;

  let pending = pendingPhotos.get(key);
  if (!pending) {
    pending = (async () => {
      const body = await openAiPost('/images/generations', {
        model: IMAGE_MODEL(),
        prompt: photoPrompt(input),
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY(),
        output_format: 'webp',
        output_compression: 90,
        n: 1,
      });
      const b64 = body?.data?.[0]?.b64_json;
      if (typeof b64 !== 'string') throw new Error('OpenAI returned no image.');
      await db.prepare('INSERT OR REPLACE INTO meal_images (key, mime, data) VALUES (?, ?, ?)').run(key, 'image/webp', Buffer.from(b64, 'base64'));
    })().finally(() => pendingPhotos.delete(key));
    pendingPhotos.set(key, pending);
  }
  await pending;
  return key;
}
