import { MEAL_TYPES, type ExtractedLogEntry } from './manualMealLog';
import { openAiStructured } from './openai';

export { OpenAiUnavailableError } from './openai';

const DEFAULT_MODEL = 'gpt-4o';

const MEAL_TYPE_LABELS = MEAL_TYPES.map((m) => m.label);

const nullableNumber = { type: ['number', 'null'] };

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['entries', 'warnings'],
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'mealType', 'carbs', 'bolus', 'glucoseAtBolus', 'carbRatio', 'isf'],
        properties: {
          date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
          mealType: { type: 'string', enum: MEAL_TYPE_LABELS },
          carbs: nullableNumber,
          bolus: nullableNumber,
          glucoseAtBolus: nullableNumber,
          carbRatio: nullableNumber,
          isf: nullableNumber,
        },
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
};

function systemPrompt(year: string): string {
  return [
    'You read photos of handwritten or printed insulin/glucose log sheets for people on multiple daily injections (MDI).',
    'Extract one entry per meal slot that has any recorded value.',
    `Meal types must be one of: ${MEAL_TYPE_LABELS.join(', ')}. Map synonyms (e.g. "supper" -> Dinner, "HS" -> Bedtime, "bfast" -> Breakfast).`,
    `Dates must be YYYY-MM-DD. If a date on the sheet has no year, use ${year}. Dates on these sheets are US-style month/day.`,
    'Fields: carbs = grams of carbohydrate; bolus = rapid-acting insulin units given for that meal (meal + correction combined if only a total is shown);',
    'glucoseAtBolus = blood glucose in mg/dL measured before the meal; carbRatio = grams of carb per unit (e.g. "1:10" -> 10); isf = insulin sensitivity / correction factor in mg/dL per unit.',
    'If a carb ratio or ISF is written once for the day or sheet, apply it to every entry it covers.',
    'Use null for any value that is blank or not written. Never guess or invent numbers.',
    'Add a short warning string for anything illegible, ambiguous, or that you were unsure about, naming the date and meal type.',
    'If the image is not a glucose/insulin log, return no entries and a warning saying so.',
  ].join('\n');
}

export interface OpenAiExtractResult {
  entries: ExtractedLogEntry[];
  warnings: string[];
}

function sanitizeEntry(raw: unknown): ExtractedLogEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null;
  const mealType = typeof r.mealType === 'string' && MEAL_TYPE_LABELS.includes(r.mealType) ? r.mealType : null;
  if (!date || !mealType) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  return {
    date,
    mealType,
    carbs: num(r.carbs),
    bolus: num(r.bolus),
    glucoseAtBolus: num(r.glucoseAtBolus),
    carbRatio: num(r.carbRatio),
    isf: num(r.isf),
  };
}

export async function extractLogWithOpenAi(image: Blob, year: string): Promise<OpenAiExtractResult> {
  const base64 = Buffer.from(await image.arrayBuffer()).toString('base64');
  const dataUrl = `data:${image.type || 'image/jpeg'};base64,${base64}`;

  const parsed = await openAiStructured<{ entries?: unknown[]; warnings?: unknown[] }>({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    schemaName: 'manual_glucose_log',
    schema: RESPONSE_SCHEMA,
    messages: [
      { role: 'system', content: systemPrompt(year) },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract every logged meal entry from this log sheet.' },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
  });

  const rawEntries: unknown[] = Array.isArray(parsed.entries) ? parsed.entries : [];
  const entries = rawEntries.map(sanitizeEntry).filter((e): e is ExtractedLogEntry => e !== null);
  const warnings: string[] = Array.isArray(parsed.warnings) ? parsed.warnings.filter((w): w is string => typeof w === 'string') : [];

  if (entries.length < rawEntries.length) {
    warnings.push(`Dropped ${rawEntries.length - entries.length} row(s) with an unreadable date or meal type.`);
  }

  return { entries, warnings };
}
