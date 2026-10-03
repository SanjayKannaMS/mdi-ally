'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CUISINES,
  CUISINE_STYLES,
  DIET_SUBTYPES,
  MEAL_TYPES,
  RECIPES,
  type Diet,
  type MealSlot,
  type Recipe,
} from '@/lib/mealPlannerData';
import { computeBodyStatsTargets, type Gender } from '@/lib/bodyStats';
import { carbEffectFromRatio, simulateMealCurve, summarizeCurve, type CurvePoint } from '@/lib/glucoseMath';
import { readAnalyzerSession } from '@/lib/analyzerSession';
import { readMealPlannerImport, mapToRecipeMealType } from '@/lib/mealImport';
import type { MealDefault } from '@/lib/types';
import { Check } from 'lucide-react';

interface PlanItem extends Recipe {
  assignedMealType: string;
}

type PlanMode = 'day' | 'meal';

function allTrue(keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((k) => [k, true]));
}

const DEFAULT_TARGET_CARBS = 200;
const DEFAULT_TARGET_FIBER = 35;
const DEFAULT_TARGET_PROTEIN = 140;

function cuisinesFromSaved(saved: string[] | null): Record<string, boolean> {
  if (!saved) return allTrue(CUISINES);
  const savedSet = new Set(saved);
  return Object.fromEntries(CUISINES.map((c) => [c, savedSet.has(c)]));
}

function subtypesFromSaved(saved: Record<string, string[]> | null): Record<Diet, Record<string, boolean>> {
  const diets = Object.keys(DIET_SUBTYPES) as Diet[];
  return Object.fromEntries(
    diets.map((diet) => {
      const savedForDiet = saved?.[diet];
      if (!savedForDiet) return [diet, allTrue(DIET_SUBTYPES[diet])];
      const savedSet = new Set(savedForDiet);
      return [diet, Object.fromEntries(DIET_SUBTYPES[diet].map((s) => [s, savedSet.has(s)]))];
    })
  ) as Record<Diet, Record<string, boolean>>;
}

export default function MealPlanner({
  loggedIn,
  initialTargetCarbs,
  initialTargetFiber,
  initialTargetProtein,
  initialWeightLbs,
  initialHeightFt,
  initialHeightIn,
  initialGender,
  initialCuisines,
  initialDietSubtypes,
}: {
  loggedIn: boolean;
  initialTargetCarbs: number | null;
  initialTargetFiber: number | null;
  initialTargetProtein: number | null;
  initialWeightLbs: number | null;
  initialHeightFt: number | null;
  initialHeightIn: number | null;
  initialGender: string | null;
  initialCuisines: string[] | null;
  initialDietSubtypes: Record<string, string[]> | null;
}) {
  const router = useRouter();
  const [targetCarbs, setTargetCarbs] = useState(initialTargetCarbs ?? DEFAULT_TARGET_CARBS);
  const [targetFiber, setTargetFiber] = useState(initialTargetFiber ?? DEFAULT_TARGET_FIBER);
  const [targetProtein, setTargetProtein] = useState(initialTargetProtein ?? DEFAULT_TARGET_PROTEIN);
  const [carbsLocked, setCarbsLocked] = useState(initialTargetCarbs != null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [weightLbs, setWeightLbs] = useState(initialWeightLbs ?? 0);
  const [heightFt, setHeightFt] = useState(initialHeightFt ?? 0);
  const [heightIn, setHeightIn] = useState(initialHeightIn ?? 0);
  const [gender, setGender] = useState<Gender | null>((initialGender as Gender) ?? null);

  const [cuisineChecked, setCuisineChecked] = useState<Record<string, boolean>>(() => cuisinesFromSaved(initialCuisines));
  const [mealTypeChecked, setMealTypeChecked] = useState<Record<string, boolean>>(() => allTrue(MEAL_TYPES));
  const [subtypeChecked, setSubtypeChecked] = useState<Record<Diet, Record<string, boolean>>>(() => subtypesFromSaved(initialDietSubtypes));

  useEffect(() => {
    setTargetCarbs(initialTargetCarbs ?? DEFAULT_TARGET_CARBS);
    setTargetFiber(initialTargetFiber ?? DEFAULT_TARGET_FIBER);
    setTargetProtein(initialTargetProtein ?? DEFAULT_TARGET_PROTEIN);
    setCarbsLocked(initialTargetCarbs != null);
  }, [initialTargetCarbs, initialTargetFiber, initialTargetProtein]);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    fetch('/api/meal-preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.targetCarbs != null) {
          setTargetCarbs(data.targetCarbs);
          setCarbsLocked(true);
        }
        if (data.targetFiber != null) setTargetFiber(data.targetFiber);
        if (data.targetProtein != null) setTargetProtein(data.targetProtein);
        if (data.weightLbs) setWeightLbs(data.weightLbs);
        if (data.heightFt) setHeightFt(data.heightFt);
        if (data.heightIn) setHeightIn(data.heightIn);
        if (data.gender) setGender(data.gender);
        if (Array.isArray(data.cuisines) && data.cuisines.length > 0) setCuisineChecked(cuisinesFromSaved(data.cuisines));
        if (data.dietSubtypes && typeof data.dietSubtypes === 'object') setSubtypeChecked(subtypesFromSaved(data.dietSubtypes));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  const [planMode, setPlanMode] = useState<PlanMode>('day');
  const [selectedMealType, setSelectedMealType] = useState<string>(MEAL_TYPES[0]);

  const [simulateRecipe, setSimulateRecipe] = useState<Recipe | null>(null);
  const [simCarbRatio, setSimCarbRatio] = useState(10);
  const [simIsf, setSimIsf] = useState(40);
  const [simCurrentGlucose, setSimCurrentGlucose] = useState(120);
  const [simFromHistory, setSimFromHistory] = useState<string | null>(null);
  const [historyDefaults, setHistoryDefaults] = useState<MealDefault[]>([]);

  useEffect(() => {
    const session = readAnalyzerSession();
    if (session) setHistoryDefaults(session.result.mealDefaults);
  }, []);

  useEffect(() => {
    const totalHeightInches = heightFt * 12 + heightIn;
    if (weightLbs <= 0 || totalHeightInches <= 0 || !gender) return;

    const targets = computeBodyStatsTargets(weightLbs, totalHeightInches, gender);
    setTargetFiber(targets.fiber);
    setTargetProtein(targets.protein);
    if (!carbsLocked) setTargetCarbs(targets.carbs);
  }, [weightLbs, heightFt, heightIn, gender, carbsLocked]);

  function handleCarbsInput(value: number) {
    setCarbsLocked(true);
    setTargetCarbs(value);
  }

  const [plan, setPlan] = useState<Record<string, PlanItem[]>>({});
  const [search, setSearch] = useState('');
  const [modalRecipeId, setModalRecipeId] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  // Per-recipe AI photo state: an image URL once ready, or 'loading' / 'error'.
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const planRequestRef = useRef(0);

  function toggleCuisine(cuisine: string) {
    setCuisineChecked((prev) => ({ ...prev, [cuisine]: !prev[cuisine] }));
  }

  function toggleMealType(type: string) {
    setMealTypeChecked((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  function toggleDietGroup(diet: Diet) {
    const allOn = DIET_SUBTYPES[diet].every((s) => subtypeChecked[diet][s]);
    setSubtypeChecked((prev) => ({ ...prev, [diet]: Object.fromEntries(DIET_SUBTYPES[diet].map((s) => [s, !allOn])) }));
  }

  function toggleSubtype(diet: Diet, subtype: string) {
    setSubtypeChecked((prev) => ({ ...prev, [diet]: { ...prev[diet], [subtype]: !prev[diet][subtype] } }));
  }

  const availableRecipes = useMemo(() => {
    return RECIPES.filter((r) => cuisineChecked[r.cuisine] && subtypeChecked[r.diet]?.[r.subtype]);
  }, [cuisineChecked, subtypeChecked]);

  function recipeScore(r: Recipe, carbsTarget: number, fiberTarget: number, proteinTarget: number): number {
    let score = 0;
    if (carbsTarget > 0) score += ((r.carbs - carbsTarget) / carbsTarget) ** 2;
    if (fiberTarget > 0) score += ((r.fiber - fiberTarget) / fiberTarget) ** 2;
    if (proteinTarget > 0) score += ((r.protein - proteinTarget) / proteinTarget) ** 2;
    return score;
  }

  function topMatches(pool: Recipe[], carbsTarget: number, fiberTarget: number, proteinTarget: number, limit: number): Recipe[] {
    return [...pool]
      .sort((a, b) => recipeScore(a, carbsTarget, fiberTarget, proteinTarget) - recipeScore(b, carbsTarget, fiberTarget, proteinTarget))
      .slice(0, limit);
  }

  const MEAL_SUGGESTION_LIMIT = 5;
  const DAY_SUGGESTION_LIMIT = 3;
  const MEALS_PER_DAY_FOR_ONE_MEAL = 4;
  const PHOTO_CONCURRENCY = 4;

  function buildSlots(carbsOverride?: number, mealTypeOverride?: string): MealSlot[] {
    if (planMode === 'meal' || mealTypeOverride) {
      return [
        {
          mealType: mealTypeOverride ?? selectedMealType,
          carbs: carbsOverride ?? Math.round(targetCarbs / MEALS_PER_DAY_FOR_ONE_MEAL),
          fiber: Math.round(targetFiber / MEALS_PER_DAY_FOR_ONE_MEAL),
          protein: Math.round(targetProtein / MEALS_PER_DAY_FOR_ONE_MEAL),
          count: MEAL_SUGGESTION_LIMIT,
        },
      ];
    }
    const selectedTypes = MEAL_TYPES.filter((t) => mealTypeChecked[t]);
    const carbsTarget = carbsOverride ?? targetCarbs;
    return selectedTypes.map((mealType) => ({
      mealType,
      carbs: Math.round(carbsTarget / selectedTypes.length),
      fiber: Math.round(targetFiber / selectedTypes.length),
      protein: Math.round(targetProtein / selectedTypes.length),
      count: DAY_SUGGESTION_LIMIT,
    }));
  }

  /** Picks the closest matches from the built-in recipe library; returns an error message if nothing fits. */
  function generateLocalPlan(slots: MealSlot[], singleMeal: boolean): Record<string, PlanItem[]> | string {
    if (availableRecipes.length === 0) return 'Pick at least one cuisine, one meal type, and one dietary option first.';
    const next: Record<string, PlanItem[]> = {};
    for (const slot of slots) {
      const pool = availableRecipes.filter((r) => r.mealType === slot.mealType);
      if (pool.length === 0 && singleMeal) return 'No recipes match your diet/cuisine filters for this meal type.';
      const matches = topMatches(pool.length > 0 ? pool : availableRecipes, slot.carbs, slot.fiber, slot.protein, slot.count);
      next[slot.mealType] = matches.map((r) => ({ ...r, assignedMealType: slot.mealType }));
    }
    return next;
  }

  function selectedDietSubtypes(): Record<string, string[]> {
    return Object.fromEntries(
      (Object.keys(DIET_SUBTYPES) as Diet[])
        .map((diet) => [diet, DIET_SUBTYPES[diet].filter((s) => subtypeChecked[diet][s])] as const)
        .filter(([, subtypes]) => subtypes.length > 0)
    );
  }

  async function generatePlan(carbsOverride?: number, mealTypeOverride?: string) {
    setFormError(null);
    setAiNote(null);

    const singleMeal = planMode === 'meal' || !!mealTypeOverride;
    const slots = buildSlots(carbsOverride, mealTypeOverride);
    const cuisines = CUISINES.filter((c) => cuisineChecked[c]);
    const dietSubtypes = selectedDietSubtypes();
    if (slots.length === 0 || cuisines.length === 0 || Object.keys(dietSubtypes).length === 0) {
      setFormError('Pick at least one cuisine, one meal type, and one dietary option first.');
      setPlan({});
      return;
    }

    const requestId = ++planRequestRef.current;
    let fallbackReason: string | null = null;

    if (loggedIn) {
      setGenerating(true);
      try {
        const res = await fetch('/api/meal-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slots, cuisines, dietSubtypes }),
        });
        const body = await res.json().catch(() => ({}));
        if (requestId !== planRequestRef.current) return;
        if (res.ok) {
          const next: Record<string, PlanItem[]> = Object.fromEntries(
            Object.entries(body.plan as Record<string, Recipe[]>).map(([type, recipes]) => [
              type,
              recipes.map((r) => ({ ...r, assignedMealType: type })),
            ])
          );
          setPlan(next);
          if (Array.isArray(body.warnings) && body.warnings.length > 0) setAiNote(body.warnings.join(' '));
          void loadPhotos(topOptionsFirst(next), () => requestId === planRequestRef.current);
          return;
        }
        if (res.status === 400) {
          setFormError(body.error ?? 'Check your filters and try again.');
          setPlan({});
          return;
        }
        fallbackReason = body.error ?? `AI meal planning failed (HTTP ${res.status}).`;
      } catch {
        if (requestId !== planRequestRef.current) return;
        fallbackReason = 'Could not reach the AI meal planner.';
      } finally {
        if (requestId === planRequestRef.current) setGenerating(false);
      }
    }

    const local = generateLocalPlan(slots, singleMeal);
    if (typeof local === 'string') {
      setFormError(local);
      setPlan({});
      return;
    }
    setPlan(local);
    if (fallbackReason) setAiNote(`${fallbackReason} Showing matches from the built-in recipe library instead.`);
  }

  /** Generates dish photos for AI recipes a few at a time, dropping the queue once isCurrent() says it was superseded. */
  async function loadPhotos(recipes: Recipe[], isCurrent: () => boolean) {
    const queue = recipes.filter((r) => !r.imageUrl && !photos[r.id]?.startsWith('/'));
    if (queue.length === 0) return;
    setPhotos((prev) => ({ ...prev, ...Object.fromEntries(queue.map((r) => [r.id, 'loading'])) }));

    const worker = async () => {
      while (queue.length > 0 && isCurrent()) {
        const r = queue.shift()!;
        let result = 'error';
        try {
          const res = await fetch('/api/meal-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: r.name, cuisine: r.cuisine, desc: r.desc, ingredients: r.ingredients }),
          });
          if (res.ok) result = (await res.json()).url ?? 'error';
        } catch {}
        setPhotos((prev) => ({ ...prev, [r.id]: result }));
      }
    };
    await Promise.all(Array.from({ length: PHOTO_CONCURRENCY }, worker));
    // Anything left unstarted because a newer request took over shouldn't spin forever.
    if (queue.length > 0) {
      setPhotos((prev) => {
        const next = { ...prev };
        for (const r of queue) if (next[r.id] === 'loading') delete next[r.id];
        return next;
      });
    }
  }

  /** Orders recipes as every meal type's #1 option, then every #2, and so on, so the top picks get photos first. */
  function topOptionsFirst(byType: Record<string, PlanItem[]>): PlanItem[] {
    const lists = Object.values(byType);
    const longest = Math.max(0, ...lists.map((l) => l.length));
    return Array.from({ length: longest }, (_, i) => lists.map((l) => l[i]).filter(Boolean)).flat();
  }

  function withPhoto<T extends Recipe>(recipe: T): T {
    const photo = photos[recipe.id];
    return photo?.startsWith('/') ? { ...recipe, imageUrl: photo } : recipe;
  }

  function historyDefaultFor(recipeMealType: string): MealDefault | null {
    const candidates = historyDefaults.filter(
      (m) => mapToRecipeMealType(m.label) === recipeMealType && m.currentRatio != null && m.isf != null
    );
    return candidates.find((m) => m.label === recipeMealType) ?? candidates[0] ?? null;
  }

  function handleSimulate(recipe: Recipe) {
    const match = historyDefaultFor(recipe.mealType);
    if (match) {
      setSimCarbRatio(match.currentRatio!);
      setSimIsf(match.isf!);
      if (match.sgAtBolus != null) setSimCurrentGlucose(match.sgAtBolus);
      setSimFromHistory(match.label);
    } else {
      setSimFromHistory(null);
    }
    setSimulateRecipe(recipe);
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('autoplan') !== '1') return;
    const data = readMealPlannerImport();
    if (!data) return;
    setCarbsLocked(true);
    setTargetCarbs(data.totalCarbs);

    if (data.mealType) {
      const recipeMealType = mapToRecipeMealType(data.mealType);
      setPlanMode('meal');
      setSelectedMealType(recipeMealType);
      setImportNote(`Imported ${data.totalCarbs}g from ${data.source} and auto-suggested a matching ${recipeMealType.toLowerCase()} below.`);
      generatePlan(data.totalCarbs, recipeMealType);
    } else {
      setImportNote(`Imported a ${data.totalCarbs}g target from ${data.source} and auto-suggested foods matching it below.`);
      generatePlan(data.totalCarbs);
    }
  }, []);

  async function handleSavePreferences() {
    setSaveStatus('saving');
    const cuisines = CUISINES.filter((c) => cuisineChecked[c]);
    const dietSubtypes = Object.fromEntries(
      (Object.keys(DIET_SUBTYPES) as Diet[]).map((diet) => [diet, DIET_SUBTYPES[diet].filter((s) => subtypeChecked[diet][s])])
    );
    const res = await fetch('/api/meal-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCarbs, targetFiber, targetProtein, weightLbs, heightFt, heightIn, gender, cuisines, dietSubtypes }),
    });
    setSaveStatus(res.ok ? 'saved' : 'error');
    if (res.ok) router.refresh();
  }

  const simCurve = useMemo(() => {
    if (!simulateRecipe || simCarbRatio <= 0) return null;
    const totalCarbEffect = carbEffectFromRatio(simulateRecipe.carbs, simIsf, simCarbRatio);
    const bolusUnits = simulateRecipe.carbs / simCarbRatio;
    const points = simulateMealCurve(simCurrentGlucose, totalCarbEffect, bolusUnits * simIsf, 240, 10);
    return { points, bolusUnits, stats: summarizeCurve(points, 10) };
  }, [simulateRecipe, simCarbRatio, simIsf, simCurrentGlucose]);

  const planEntries = Object.entries(plan);
  const totals = planEntries.reduce(
    (acc, [, items]) => {
      const top = items[0];
      if (!top) return acc;
      return { carbs: acc.carbs + top.carbs, fiber: acc.fiber + top.fiber, protein: acc.protein + top.protein };
    },
    { carbs: 0, fiber: 0, protein: 0 }
  );

  const explorerRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableRecipes;
    return availableRecipes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)
    );
  }, [availableRecipes, search]);

  const modalRecipe = useMemo(() => {
    if (!modalRecipeId) return null;
    const found = Object.values(plan).flat().find((r) => r.id === modalRecipeId) ?? RECIPES.find((r) => r.id === modalRecipeId);
    return found ? withPhoto(found) : null;
  }, [modalRecipeId, plan, photos]);

  const selectedCuisineCount = CUISINES.filter((c) => cuisineChecked[c]).length;
  const selectedMealTypeCount = MEAL_TYPES.filter((t) => mealTypeChecked[t]).length;
  const dietList = Object.keys(DIET_SUBTYPES) as Diet[];
  const selectedSubtypeCount = dietList.reduce((sum, d) => sum + DIET_SUBTYPES[d].filter((s) => subtypeChecked[d][s]).length, 0);
  const totalSubtypeCount = dietList.reduce((sum, d) => sum + DIET_SUBTYPES[d].length, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meal Planner</h1>
            <p className="mt-1 text-sm text-slate-400 max-w-prose">
              Set your carb/fiber/protein targets and filters, then generate a sample day of meals.
              {loggedIn
                ? ' Recipes and dish photos are created by AI to fit your targets.'
                : ' Log in to get AI-created recipes and photos tailored to your targets.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {loggedIn && (
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={saveStatus === 'saving'}
                className="whitespace-nowrap rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 px-4 py-2.5 text-sm font-medium backdrop-blur-sm transition disabled:opacity-50"
              >
                {saveStatus === 'saving' ? 'Saving…' : 'Save preferences'}
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {importNote && (
          <p className="text-sm text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-2.5">
            {importNote}
          </p>
        )}
        {aiNote && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">{aiNote}</p>
        )}
        {saveStatus === 'saved' && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
            Saved your target carbs/fiber/protein as defaults, so they&rsquo;ll be here next time you visit.
          </p>
        )}
        {saveStatus === 'error' && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
            Couldn&rsquo;t save your preferences. Try again.
          </p>
        )}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-1">Configure your daily plan</h2>
          <p className="text-xs text-slate-500 mb-4">
            Macro targets, dietary preferences, cuisines, and meal types to include.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <NumberField label="Target Carbs (g)" value={targetCarbs} onChange={handleCarbsInput} />
                {carbsLocked && (
                  <p className="text-[11px] text-cyan-600 mt-1.5">
                    Set from your analyzer import or a manual edit, so your body stats won&rsquo;t override this number.
                  </p>
                )}
              </div>
              <NumberField label="Target Fiber (g)" value={targetFiber} onChange={setTargetFiber} />
              <NumberField label="Target Protein (g)" value={targetProtein} onChange={setTargetProtein} />

              <details className="group pt-1">
                <summary className="cursor-pointer text-[11px] font-semibold text-cyan-700 uppercase tracking-wider">
                  Estimate from body stats (optional)
                </summary>
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Fills in starting targets from your weight, height, and gender, a simplified estimate, not
                    a prescription.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Weight (lb)" value={weightLbs} onChange={setWeightLbs} />
                    <NumberField label="Height (ft)" value={heightFt} onChange={setHeightFt} />
                    <NumberField label="Height (in)" value={heightIn} onChange={setHeightIn} />
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Gender</label>
                      <div className="flex gap-1">
                        {(['Male', 'Female', 'Other'] as Gender[]).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`flex-1 rounded-lg border px-1.5 py-2 text-[11px] font-semibold transition ${
                              gender === g ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <FilterSectionHeader
                label="Select cuisines"
                count={selectedCuisineCount}
                total={CUISINES.length}
                onSelectAll={() => setCuisineChecked(allTrue(CUISINES))}
                onClear={() => setCuisineChecked(Object.fromEntries(CUISINES.map((c) => [c, false])))}
              />
              <div className="flex flex-wrap gap-2">
                {CUISINES.map((cuisine) => (
                  <FilterChip key={cuisine} label={cuisine} checked={cuisineChecked[cuisine]} onToggle={() => toggleCuisine(cuisine)} />
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Plan for
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPlanMode('day')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    planMode === 'day' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Whole day
                </button>
                <button
                  type="button"
                  onClick={() => setPlanMode('meal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    planMode === 'meal' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  One meal
                </button>
              </div>

              {planMode === 'day' ? (
                <>
                  <FilterSectionHeader
                    label="Meal types"
                    count={selectedMealTypeCount}
                    total={MEAL_TYPES.length}
                    onSelectAll={() => setMealTypeChecked(allTrue(MEAL_TYPES))}
                    onClear={() => setMealTypeChecked(Object.fromEntries(MEAL_TYPES.map((t) => [t, false])))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {MEAL_TYPES.map((type) => (
                      <FilterChip key={type} label={type} checked={mealTypeChecked[type]} onToggle={() => toggleMealType(type)} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-slate-500 mb-2">Scored against its own carb target instead of the whole day&rsquo;s.</p>
                  <select
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {MEAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="mb-4 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100">
            <FilterSectionHeader
              label="Dietary preferences & subtypes"
              count={selectedSubtypeCount}
              total={totalSubtypeCount}
              onSelectAll={() =>
                setSubtypeChecked({
                  Vegetarian: allTrue(DIET_SUBTYPES.Vegetarian),
                  'Non-Vegetarian': allTrue(DIET_SUBTYPES['Non-Vegetarian']),
                  Vegan: allTrue(DIET_SUBTYPES.Vegan),
                })
              }
              onClear={() =>
                setSubtypeChecked({
                  Vegetarian: Object.fromEntries(DIET_SUBTYPES.Vegetarian.map((s) => [s, false])),
                  'Non-Vegetarian': Object.fromEntries(DIET_SUBTYPES['Non-Vegetarian'].map((s) => [s, false])),
                  Vegan: Object.fromEntries(DIET_SUBTYPES.Vegan.map((s) => [s, false])),
                })
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dietList.map((diet) => {
                const subtypes = DIET_SUBTYPES[diet];
                const dietSelectedCount = subtypes.filter((s) => subtypeChecked[diet][s]).length;
                const allOn = dietSelectedCount === subtypes.length;
                const noneOn = dietSelectedCount === 0;
                return (
                  <div key={diet} className="bg-white p-3 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => toggleDietGroup(diet)}
                      className={`mb-2.5 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        allOn ? 'bg-cyan-600 text-white' : noneOn ? 'bg-slate-100 text-slate-500' : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      <span>{diet}</span>
                      <span className="font-mono font-normal">{dietSelectedCount}/{subtypes.length}</span>
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {subtypes.map((subtype) => (
                        <FilterChip
                          key={subtype}
                          label={subtype}
                          checked={subtypeChecked[diet][subtype]}
                          onToggle={() => toggleSubtype(diet, subtype)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {formError && <p className="text-sm text-rose-600 mb-3">{formError}</p>}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => generatePlan()}
              disabled={generating}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium px-6 py-3 rounded-xl shadow-md transition disabled:opacity-60 disabled:cursor-wait"
            >
              {generating ? 'Creating your recipes with AI…' : 'Generate plan'}
            </button>
          </div>
        </section>

        <details className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 group">
          <summary className="cursor-pointer text-base font-bold text-slate-900">Your upcoming meal (for simulation)</summary>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Used to simulate a projected glucose curve for any suggested or generated food below, so no need to
            re-enter it per food.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
            <InlineField label="Carb ratio (g per U)" value={simCarbRatio} onChange={setSimCarbRatio} step={0.1} />
            <InlineField label="ISF (mg/dL per U)" value={simIsf} onChange={setSimIsf} />
            <InlineField label="Current glucose (mg/dL)" value={simCurrentGlucose} onChange={setSimCurrentGlucose} />
          </div>
        </details>

        {planMode === 'day' && planEntries.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-900 mb-1">Macro fulfillment summary</h3>
            <p className="text-xs text-slate-500 mb-4">Based on the top-ranked suggestion for each meal type below.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ProgressStat label="Total Carbs" value={totals.carbs} target={targetCarbs} tone="indigo" />
              <ProgressStat label="Total Fiber" value={totals.fiber} target={targetFiber} tone="emerald" />
              <ProgressStat label="Total Protein" value={totals.protein} target={targetProtein} tone="cyan" />
            </div>
          </section>
        )}

        {planEntries.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {planMode === 'meal' ? `Suggested ${selectedMealType.toLowerCase()}` : 'Suggested schedule'}
              </h3>
              <span className="text-xs bg-cyan-100 text-cyan-800 font-semibold px-3 py-1 rounded-full">
                {planEntries.reduce((sum, [, items]) => sum + items.length, 0)} option{planEntries.reduce((sum, [, items]) => sum + items.length, 0) === 1 ? '' : 's'}
              </span>
            </div>
            {planEntries.some(([, items]) => items.some((r) => r.id.startsWith('ai-'))) && (
              <p className="text-xs text-slate-500 -mt-3">
                AI-created recipes and photos. Macros are AI estimates for the listed quantities, so check food labels
                before dosing from them.
              </p>
            )}
            {planEntries.map(([mealType, items]) => (
              <div key={mealType}>
                {planMode === 'day' && (
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">{mealType}</h4>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item, i) => (
                    <RecipeCard
                      key={`${item.id}-${i}`}
                      recipe={withPhoto(item)}
                      photoLoading={photos[item.id] === 'loading'}
                      badge={item.assignedMealType}
                      onView={() => setModalRecipeId(item.id)}
                      onSimulate={() => handleSimulate(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Suggested foods explorer</h3>
              <p className="text-xs text-slate-500 mt-0.5">Browse everything matching your current filters.</p>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search foods or ingredients..."
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-48 sm:w-64"
            />
          </div>
          {explorerRecipes.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400">No matching food items found with current filters.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {explorerRecipes.map((item) => (
                <ExplorerCard key={item.id} recipe={item} onView={() => setModalRecipeId(item.id)} onSimulate={() => handleSimulate(item)} />
              ))}
            </div>
          )}
        </section>
      </main>

      {modalRecipe && <RecipeModal recipe={modalRecipe} onClose={() => setModalRecipeId(null)} />}

      {simulateRecipe && simCurve && (
        <SimulateModal
          recipe={simulateRecipe}
          carbRatio={simCarbRatio}
          isf={simIsf}
          currentGlucose={simCurrentGlucose}
          onChangeCarbRatio={setSimCarbRatio}
          onChangeIsf={setSimIsf}
          onChangeCurrentGlucose={setSimCurrentGlucose}
          bolusUnits={simCurve.bolusUnits}
          points={simCurve.points}
          stats={simCurve.stats}
          fromHistory={simFromHistory}
          onClose={() => setSimulateRecipe(null)}
        />
      )}
    </div>
  );
}

function InlineField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        step={step ?? 1}
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder="0"
      />
    </label>
  );
}

function FilterChip({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        checked ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700'
      }`}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      {label}
    </button>
  );
}

function FilterSectionHeader({
  label,
  count,
  total,
  onSelectAll,
  onClear,
}: {
  label: string;
  count: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex justify-between items-center mb-2">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label} <span className="normal-case font-medium text-slate-400">({count}/{total})</span>
      </label>
      <div className="space-x-2 text-xs">
        <button type="button" onClick={onSelectAll} className="text-cyan-600 hover:underline font-semibold">
          Select all
        </button>
        <span className="text-slate-300">|</span>
        <button type="button" onClick={onClear} className="text-slate-500 hover:underline font-semibold">
          Clear
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
      />
    </div>
  );
}

function ProgressStat({ label, value, target, tone }: { label: string; value: number; target: number; tone: 'indigo' | 'emerald' | 'cyan' }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const barClass = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', cyan: 'bg-cyan-500' }[tone];
  const textClass = { indigo: 'text-indigo-600', emerald: 'text-emerald-600', cyan: 'text-cyan-600' }[tone];
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <span className={`text-sm font-bold ${textClass}`}>
          {value}g / {target}g
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div className={`${barClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmojiTile({ recipe, className }: { recipe: Recipe; className?: string }) {
  const style = CUISINE_STYLES[recipe.cuisine] ?? 'bg-slate-100 text-slate-700';
  return <div className={`flex items-center justify-center ${style} ${className ?? ''}`}>{recipe.emoji}</div>;
}

function DishImage({ recipe, className, loading }: { recipe: Recipe; className?: string; loading?: boolean }) {
  const [errored, setErrored] = useState(false);
  if (loading) {
    return (
      <div className={`relative ${className ?? ''}`}>
        <EmojiTile recipe={recipe} className="h-full w-full animate-pulse" />
        <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2.5 py-1 text-[10px] font-medium text-white">
          Creating photo…
        </span>
      </div>
    );
  }
  if (!recipe.imageUrl || errored) {
    return <EmojiTile recipe={recipe} className={className} />;
  }
  return (
    <img
      src={recipe.imageUrl}
      alt={recipe.name}
      onError={() => setErrored(true)}
      className={`object-cover ${className ?? ''}`}
    />
  );
}

function RecipeCard({
  recipe,
  photoLoading,
  badge,
  onView,
  onSimulate,
}: {
  recipe: Recipe;
  photoLoading?: boolean;
  badge: string;
  onView: () => void;
  onSimulate: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-300">
      <div>
        <div className="relative h-48 w-full">
          <DishImage recipe={recipe} loading={photoLoading} className="h-full w-full text-6xl" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span className="bg-cyan-700/90 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">{badge}</span>
            <span className="bg-slate-900/80 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full">{recipe.cuisine}</span>
          </div>
        </div>
        <div className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-md">
            {recipe.diet} &bull; {recipe.subtype}
          </span>
          <h4 className="text-lg font-bold text-slate-900 mt-1 mb-1">{recipe.name}</h4>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">{recipe.desc}</p>
          <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <MacroStat label="Carbs" value={recipe.carbs} tone="text-cyan-600" />
            <MacroStat label="Fiber" value={recipe.fiber} tone="text-emerald-600" />
            <MacroStat label="Protein" value={recipe.protein} tone="text-cyan-600" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 pt-2 flex flex-wrap gap-2">
        <button type="button" onClick={onView} className="flex-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold py-2.5 rounded-xl transition">
          View recipe
        </button>
        <button type="button" onClick={onSimulate} className="flex-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold py-2.5 rounded-xl transition">
          Simulate
        </button>
      </div>
    </div>
  );
}

function ExplorerCard({ recipe, onView, onSimulate }: { recipe: Recipe; onView: () => void; onSimulate: () => void }) {
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-sm transition">
      <DishImage recipe={recipe} className="h-24 w-full text-4xl" />
      <div className="p-3">
        <div className="text-[9px] font-bold text-cyan-700 uppercase mb-0.5">
          {recipe.diet} &bull; {recipe.subtype}
        </div>
        <h5 className="font-bold text-slate-900 text-xs mb-1 line-clamp-1">{recipe.name}</h5>
        <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{recipe.desc}</p>
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
          <span className="text-cyan-600">C: {recipe.carbs}g</span>
          <span className="text-emerald-600">F: {recipe.fiber}g</span>
          <span className="text-cyan-600">P: {recipe.protein}g</span>
        </div>
      </div>
      <div className="px-3 pb-3 flex gap-1.5">
        <button type="button" onClick={onView} className="flex-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold py-2 rounded-xl transition">
          View details
        </button>
        <button type="button" onClick={onSimulate} className="flex-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold py-2 rounded-xl transition">
          Simulate
        </button>
      </div>
    </div>
  );
}

function MacroStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <span className="block text-[10px] uppercase font-semibold text-slate-400">{label}</span>
      <span className={`text-sm font-bold ${tone}`}>{value}g</span>
    </div>
  );
}

function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs bg-cyan-100 text-cyan-800 font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                {recipe.cuisine} &bull; {recipe.mealType} &bull; {recipe.diet}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{recipe.name}</h3>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition">
              ✕
            </button>
          </div>

          <DishImage recipe={recipe} className="w-full h-56 rounded-xl mb-4 text-7xl" />

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">{recipe.desc}</p>

          <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <MacroStat label="Carbs" value={recipe.carbs} tone="text-cyan-600" />
            <MacroStat label="Fiber" value={recipe.fiber} tone="text-emerald-600" />
            <MacroStat label="Protein" value={recipe.protein} tone="text-cyan-600" />
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Ingredients</h4>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-sm text-slate-700">
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Preparation steps</h4>
            <ol className="space-y-3">
              {recipe.steps.map((step, idx) => (
                <li key={idx} className="flex items-start space-x-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="bg-cyan-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 text-center">
            <button type="button" onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulateModal({
  recipe,
  carbRatio,
  isf,
  currentGlucose,
  onChangeCarbRatio,
  onChangeIsf,
  onChangeCurrentGlucose,
  bolusUnits,
  points,
  stats,
  fromHistory,
  onClose,
}: {
  recipe: Recipe;
  carbRatio: number;
  isf: number;
  currentGlucose: number;
  onChangeCarbRatio: (v: number) => void;
  onChangeIsf: (v: number) => void;
  onChangeCurrentGlucose: (v: number) => void;
  bolusUnits: number;
  points: CurvePoint[];
  stats: ReturnType<typeof summarizeCurve>;
  fromHistory: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-1">
            <div>
              <span className="text-xs bg-cyan-100 text-cyan-800 font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Simulate
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">{recipe.name}</h3>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition">
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {recipe.carbs}g carbs from this recipe, projected forward as a food-only bolus (no correction factor,
            since that&rsquo;s the Dose Reduction Coach&rsquo;s job, not this planner&rsquo;s).
          </p>

          {fromHistory ? (
            <p className="text-xs text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-xl px-3 py-2 mb-4">
              Carb ratio, ISF, and glucose pre-filled from your logged {fromHistory} history in the Report Analyzer,
              so edit any of them to try a different scenario.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mb-4">
              No matching logged history found for this meal type yet, so these are just starting assumptions. Edit
              them to match your own numbers.
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            <NumberField label="Carb ratio (g/U)" value={carbRatio} onChange={onChangeCarbRatio} />
            <NumberField label="ISF (mg/dL/U)" value={isf} onChange={onChangeIsf} />
            <NumberField label="Current glucose" value={currentGlucose} onChange={onChangeCurrentGlucose} />
          </div>

          <p className="text-xs text-slate-500 mb-4">
            {recipe.carbs}g ÷ {carbRatio.toFixed(1)} g/U = <span className="font-mono font-semibold text-slate-700">{bolusUnits.toFixed(1)}U</span> bolus
          </p>

          <SimulateChart points={points} />

          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            Projected peak <span className="font-mono font-semibold">{Math.round(stats.maxGlucose)} mg/dL</span>,{' '}
            in range (70&ndash;180) for about <span className="font-mono font-semibold">{Math.round(stats.percentInRange)}%</span> of
            the 4 hours
            {stats.minutesLow > 0 ? (
              <>
                , dips as low as <span className="font-mono font-semibold">{Math.round(stats.minGlucose)} mg/dL</span>
              </>
            ) : (
              ', never drops below 70'
            )}
            . This is an illustration of the same carbs×ISF÷ratio model used elsewhere in this app, not a medical
            prediction.
          </p>
        </div>
      </div>
    </div>
  );
}

function SimulateChart({ points }: { points: CurvePoint[] }) {
  const width = 480;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allGlucose = points.map((p) => p.glucose).concat([70, 180]);
  const minY = Math.min(...allGlucose) - 10;
  const maxY = Math.max(...allGlucose) + 10;
  const maxMinute = points[points.length - 1]?.minute ?? 240;

  function x(minute: number) {
    return padding.left + (minute / maxMinute) * plotWidth;
  }
  function y(glucose: number) {
    return padding.top + plotHeight - ((glucose - minY) / (maxY - minY)) * plotHeight;
  }
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.minute).toFixed(1)} ${y(p.glucose).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Simulated glucose curve for this recipe">
      <line x1={padding.left} x2={width - padding.right} y1={y(70)} y2={y(70)} stroke="#fda4af" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={padding.left} x2={width - padding.right} y1={y(180)} y2={y(180)} stroke="#fcd34d" strokeWidth={1} strokeDasharray="4 3" />
      <text x={2} y={y(70) - 2} fontSize={9} fill="#e11d48">70</text>
      <text x={2} y={y(180) - 2} fontSize={9} fill="#b45309">180</text>
      {[0, 60, 120, 180, 240].filter((m) => m <= maxMinute).map((m) => (
        <text key={m} x={x(m)} y={height - 4} fontSize={9} fill="#94a3b8" textAnchor="middle">
          {m === 120 ? '2h' : `${m}m`}
        </text>
      ))}
      <path d={path} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
    </svg>
  );
}
