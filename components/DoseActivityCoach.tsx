'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  calculateBolus,
  carbEffectFromRatio,
  exerciseReductionUnits,
  factorsFromTdd,
  linearInsulinOnBoard,
  maxSafeReduction,
  requiredExerciseMinutes,
} from '@/lib/glucoseMath';
import { recommendActivities, type Setting } from '@/lib/activityRecommender';
import type { Activity, ActivityCategory } from '@/lib/activityData';
import { Footprints, Dumbbell, PersonStanding, Music, Sparkles, Home, Zap, Video } from 'lucide-react';

const TOTAL_MINUTES = 240;
const STEP_MINUTES = 10;
const HIGH_TARGET = 180;

const REDUCTION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 45;

function clampDuration(minutes: number): number {
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, minutes));
}

interface CoachForm {
  carbs: number;
  isf: number;
  carbRatio: number;
  startGlucose: number;
  targetGlucose: number;
  reductionUnits: number;
  tdd: number;
  previousDoseUnits: number;
  previousDoseMinutesAgo: number;
  dia: number;
  preferredIntensity: 1 | 2 | 3;
  preferredDurationMinutes: number;
  preferredSetting: Setting;
}

function buildDefaultForm(initialPreferredIntensity: number, initialPreferredDurationMinutes: number, initialPreferredSetting: string): CoachForm {
  const base: CoachForm = {
    carbs: 45,
    isf: 50,
    carbRatio: 15,
    startGlucose: 110,
    targetGlucose: 120,
    reductionUnits: 0.5,
    tdd: 0,
    previousDoseUnits: 0,
    previousDoseMinutesAgo: 0,
    dia: 4,
    preferredIntensity: (initialPreferredIntensity as 1 | 2 | 3) || 2,
    preferredDurationMinutes: clampDuration(initialPreferredDurationMinutes || 15),
    preferredSetting: (initialPreferredSetting as Setting) || 'either',
  };
  const suggestion = exerciseReductionUnits(doseFor(base).normalUnits, base.preferredIntensity, base.preferredDurationMinutes, base.isf);
  return { ...base, reductionUnits: suggestion.suggestedUnits };
}

type IntensityLabel = 'light' | 'moderate' | 'vigorous';
const INTENSITY_LABEL: Record<1 | 2 | 3, IntensityLabel> = { 1: 'light', 2: 'moderate', 3: 'vigorous' };
const INTENSITY_BADGE: Record<IntensityLabel, string> = {
  light: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  vigorous: 'bg-rose-100 text-rose-700',
};

const TIER_EXAMPLE_ACTIVITIES: Record<1 | 2 | 3, { outdoor: string[]; indoor: string[] }> = {
  1: {
    outdoor: ['Casual neighborhood walk', 'Light flat-ground cycling'],
    indoor: ['Indoor slow treadmill walk', 'Standing mobility & stretching'],
  },
  2: {
    outdoor: ['Power walking / steady jog', 'Outdoor bicycle commute'],
    indoor: ['Steady stationary cycling', 'Low-impact aerobics / elliptical'],
  },
  3: {
    outdoor: ['Trail running / hill sprints', 'Rigorous road cycling'],
    indoor: ['High-intensity interval training (HIIT)', 'Heavy resistance circuit'],
  },
};

interface DisplayActivity {
  id: string;
  name: string;
  durationMinutes: number;
  intensity: IntensityLabel;
  description: string;
  whyItWorks: string;
  tip: string;
  category?: ActivityCategory;
}

function localToDisplayActivity(a: Activity): DisplayActivity {
  return {
    id: a.id,
    name: a.name,
    durationMinutes: a.durationMinutes,
    intensity: INTENSITY_LABEL[a.intensity],
    description: a.description,
    whyItWorks: a.whyItWorks,
    tip: a.tip,
    category: a.category,
  };
}

function doseFor(f: CoachForm) {
  const hasPreviousDose = f.previousDoseUnits > 0 && f.previousDoseMinutesAgo > 0;
  const iob = hasPreviousDose ? linearInsulinOnBoard(f.previousDoseUnits, f.previousDoseMinutesAgo, f.dia * 60) : 0;
  const bolus = calculateBolus({ currentBG: f.startGlucose, targetBG: f.targetGlucose, carbs: f.carbs, icr: f.carbRatio, isf: f.isf, iob });
  const normalUnits = bolus.totalDose;
  const reductionExceedsNormal = f.reductionUnits > normalUnits && normalUnits > 0;
  const effectiveReduction = Math.max(0, Math.min(f.reductionUnits, normalUnits));
  const plannedUnits = Math.max(0, normalUnits - effectiveReduction);
  return { iob, bolus, normalUnits, reductionExceedsNormal, effectiveReduction, plannedUnits };
}

export default function DoseActivityCoach({
  loggedIn,
  initialPreferredIntensity,
  initialPreferredDurationMinutes,
  initialPreferredSetting,
}: {
  loggedIn: boolean;
  initialPreferredIntensity: number;
  initialPreferredDurationMinutes: number;
  initialPreferredSetting: string;
}) {
  const defaultForm = useMemo(
    () => buildDefaultForm(initialPreferredIntensity, initialPreferredDurationMinutes, initialPreferredSetting),
    [initialPreferredIntensity, initialPreferredDurationMinutes, initialPreferredSetting]
  );

  const [form, setForm] = useState<CoachForm>(defaultForm);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function updateForm<K extends keyof CoachForm>(key: K, value: CoachForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const liveDose = useMemo(() => doseFor(form), [form]);
  const { normalUnits, plannedUnits, iob: liveIOB, reductionExceedsNormal: liveReductionExceedsNormal } = liveDose;
  const extraRise = liveDose.effectiveReduction * form.isf;
  const hasPreviousDoseInfo = form.previousDoseUnits > 0 && form.previousDoseMinutesAgo > 0;

  useEffect(() => {
    const suggestion = exerciseReductionUnits(liveDose.normalUnits, form.preferredIntensity, form.preferredDurationMinutes, form.isf);
    setForm((f) => ({ ...f, reductionUnits: suggestion.suggestedUnits }));
  }, [form.preferredIntensity, form.preferredDurationMinutes]);

  const reverseExerciseTimes = ([1, 2, 3] as const).map((intensity) =>
    requiredExerciseMinutes(form.reductionUnits, liveDose.normalUnits, intensity, form.isf)
  );

  const tddFactors = form.tdd > 0 ? factorsFromTdd(form.tdd) : null;
  function handleApplyTdd() {
    if (!tddFactors) return;
    setForm((f) => ({ ...f, carbRatio: Math.round(tddFactors.carbRatio * 10) / 10, isf: Math.round(tddFactors.isf) }));
  }

  const carbEffect = carbEffectFromRatio(form.carbs, form.isf, form.carbRatio);
  const safeReduction = useMemo(() => {
    const curveCeiling = maxSafeReduction(form.startGlucose, carbEffect, liveDose.normalUnits, form.isf, HIGH_TARGET, TOTAL_MINUTES, STEP_MINUTES);
    const activityCeiling = exerciseReductionUnits(liveDose.normalUnits, form.preferredIntensity, form.preferredDurationMinutes, form.isf).rawReductionUnits;
    return Math.min(curveCeiling, activityCeiling);
  }, [form.startGlucose, carbEffect, liveDose.normalUnits, form.isf, form.preferredIntensity, form.preferredDurationMinutes]);

  const recommendation = useMemo(
    () =>
      recommendActivities({
        extraRise,
        preferredIntensity: form.preferredIntensity,
        preferredDurationMinutes: form.preferredDurationMinutes,
        preferredSetting: form.preferredSetting,
        priorInsulinOnBoard: hasPreviousDoseInfo ? liveIOB : undefined,
      }),
    [extraRise, form.preferredIntensity, form.preferredDurationMinutes, form.preferredSetting, hasPreviousDoseInfo, liveIOB]
  );

  async function handleSavePreferences() {
    setSaveStatus('saving');
    const res = await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferredIntensity: form.preferredIntensity,
        preferredDurationMinutes: form.preferredDurationMinutes,
        preferredSetting: form.preferredSetting,
      }),
    });
    setSaveStatus(res.ok ? 'saved' : 'error');
  }

  const displayActivities = recommendation.activities.map(localToDisplayActivity);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dose Reduction Activity Coach</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-prose">
              Enter a meal and how many fewer units you&rsquo;re taking, and we&rsquo;ll suggest activities that can help.
            </p>
          </div>
          <p className="text-xs text-slate-400/80 md:max-w-[180px] md:text-right shrink-0">
            Keep an eye on your glucose during and after.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-1">Your upcoming meal</h2>
              <p className="text-xs text-slate-500 mb-3">The same numbers a bolus calculator would use, plus how much less you&rsquo;re planning to take.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InlineField label="Carbs (g)" value={form.carbs} onChange={(v) => updateForm('carbs', v)} />
                <InlineField label="ISF (mg/dL per U)" value={form.isf} onChange={(v) => updateForm('isf', v)} />
                <InlineField label="Carb ratio (g per U)" value={form.carbRatio} onChange={(v) => updateForm('carbRatio', v)} step={0.1} />
                <InlineField label="Current glucose (mg/dL)" value={form.startGlucose} onChange={(v) => updateForm('startGlucose', v)} />
                <InlineField label="Target glucose (mg/dL)" value={form.targetGlucose} onChange={(v) => updateForm('targetGlucose', v)} />
                <InlineSelect
                  label="Units you're reducing by"
                  value={form.reductionUnits}
                  onChange={(v) => updateForm('reductionUnits', parseFloat(v))}
                  options={REDUCTION_OPTIONS.map((v) => ({ value: v, label: `${v.toFixed(1)}U` }))}
                />
              </div>

              <details className="mt-3 group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Don&rsquo;t know your ISF or carb ratio?
                </summary>
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <InlineField label="Total Daily Dose (U)" value={form.tdd} onChange={(v) => updateForm('tdd', v)} />
                  {tddFactors && (
                    <p className="text-xs text-slate-600">
                      500 ÷ {form.tdd} = <span className="font-mono font-semibold">{tddFactors.carbRatio.toFixed(1)} g/U</span> carb ratio
                      &nbsp;&middot;&nbsp; 1800 ÷ {form.tdd} = <span className="font-mono font-semibold">{tddFactors.isf.toFixed(0)} mg/dL/U</span> ISF
                    </p>
                  )}
                  {tddFactors && (
                    <button
                      type="button"
                      onClick={handleApplyTdd}
                      className="rounded-xl border border-cyan-600 px-3 py-1.5 text-xs font-medium text-cyan-600 hover:bg-cyan-50"
                    >
                      Use these values
                    </button>
                  )}
                </div>
              </details>

              <p className="mt-3 text-xs text-slate-500">
                Recommended dose for this meal: <span className="font-mono">{normalUnits.toFixed(1)}U</span> &middot; planned
                dose: <span className="font-mono">{plannedUnits.toFixed(1)}U</span>
              </p>
              {liveReductionExceedsNormal && (
                <p className="mt-2 text-xs text-rose-600">
                  That&rsquo;s more than the full recommended dose for this meal ({normalUnits.toFixed(1)}U), showing
                  the impact of skipping insulin for this meal entirely.
                </p>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-1">Exercise time needed</h2>
              <p className="text-xs text-slate-500 mb-3">
                How long each intensity tier would take to reach the <span className="font-mono">{form.reductionUnits.toFixed(1)}U</span> selected above.
              </p>
              {normalUnits <= 0 ? (
                <p className="text-sm text-slate-500">Fill in carbs and a carb ratio to see this.</p>
              ) : (
                <div className="space-y-2">
                  {reverseExerciseTimes.map((t) => {
                    const label = INTENSITY_LABEL[t.intensity];
                    const examples = TIER_EXAMPLE_ACTIVITIES[t.intensity];
                    const showOutdoor = form.preferredSetting !== 'indoor';
                    const showIndoor = form.preferredSetting !== 'outdoor';
                    return (
                      <div key={t.intensity} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${INTENSITY_BADGE[label]}`}>
                            {label} &middot; {t.usedPointsEngine ? `${t.burnRate.toFixed(1)} mg/dL/min` : `up to ${Math.round(t.rMax * 100)}%`}
                          </span>
                          {t.minutes !== null ? (
                            <span className="text-sm font-mono font-semibold text-slate-700">
                              {Math.round(t.minutes)} min{t.belowMinimum ? ' (min.)' : ''}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-rose-600">Not enough even at 45 min</span>
                          )}
                        </div>
                        {t.minutes !== null && (showOutdoor || showIndoor) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                            {showOutdoor && (
                              <p>
                                <span className="font-semibold text-slate-500">Outdoor: </span>
                                {examples.outdoor.join(', ')}
                              </p>
                            )}
                            {showIndoor && (
                              <p>
                                <span className="font-semibold text-slate-500">Indoor: </span>
                                {examples.indoor.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {normalUnits > 0 && reverseExerciseTimes[0].usedPointsEngine && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Your recommended dose ({normalUnits.toFixed(1)}U) is small enough that this uses a fixed
                  mg/dL-per-minute burn rate per intensity instead of the usual percentage model.
                </p>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-1">Previous dose (optional)</h2>
              <p className="text-xs text-slate-500 mb-3">
                Helps account for insulin that might still be active. Leave blank if you&rsquo;re not sure.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InlineField label="Units given" value={form.previousDoseUnits} onChange={(v) => updateForm('previousDoseUnits', v)} step={0.5} />
                <InlineField label="Minutes since that dose" value={form.previousDoseMinutesAgo} onChange={(v) => updateForm('previousDoseMinutesAgo', v)} />
                <InlineField label="Duration of insulin action (hours)" value={form.dia} onChange={(v) => updateForm('dia', v)} step={0.5} />
              </div>
              {hasPreviousDoseInfo && (
                <p className="mt-3 text-xs text-slate-500">
                  Based on a previous dose of <span className="font-mono">{form.previousDoseUnits}U</span> about{' '}
                  <span className="font-mono">{form.previousDoseMinutesAgo}</span> minutes ago, with a{' '}
                  <span className="font-mono">{form.dia}h</span> duration of insulin action, an estimated{' '}
                  <span className="font-mono">{liveIOB.toFixed(1)}U</span> may still be active, which is factored
                  into the recommendation dose.
                </p>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-1">Your preferences</h2>
              <p className="text-xs text-slate-500 mb-3">
                {loggedIn ? 'Pre-filled from your profile, and everything below updates instantly as you change these.' : 'Log in to save these as defaults for next time.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InlineSelect
                  label="Comfortable intensity"
                  value={form.preferredIntensity}
                  onChange={(v) => updateForm('preferredIntensity', parseInt(v, 10) as 1 | 2 | 3)}
                  options={[
                    { value: 1, label: 'Light' },
                    { value: 2, label: 'Moderate' },
                    { value: 3, label: 'Vigorous' },
                  ]}
                />
                <InlineField
                  label={`Time available (min, ${MIN_DURATION_MINUTES}–${MAX_DURATION_MINUTES})`}
                  value={form.preferredDurationMinutes}
                  onChange={(v) => updateForm('preferredDurationMinutes', clampDuration(v || MIN_DURATION_MINUTES))}
                />
                <InlineSelect
                  label="Setting"
                  value={form.preferredSetting}
                  onChange={(v) => updateForm('preferredSetting', v as Setting)}
                  options={[
                    { value: 'indoor', label: 'Indoor' },
                    { value: 'outdoor', label: 'Outdoor' },
                    { value: 'either', label: 'Either' },
                  ]}
                />
              </div>
              {loggedIn && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    disabled={saveStatus === 'saving'}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {saveStatus === 'saving' ? 'Saving…' : 'Save as my defaults'}
                  </button>
                  {saveStatus === 'saved' && <span className="ml-3 text-sm text-cyan-600">Saved.</span>}
                  {saveStatus === 'error' && <span className="ml-3 text-sm text-rose-600">Couldn&rsquo;t save. Try again.</span>}
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-2">How much you could reasonably reduce</h2>
              {liveDose.normalUnits <= 0 ? (
                <p className="text-sm text-slate-500">Fill in carbs and a carb ratio to see an estimate.</p>
              ) : safeReduction > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Estimated reasonable reduction: up to <span className="font-mono font-semibold">{safeReduction.toFixed(1)}U</span> off
                  your usual <span className="font-mono">{liveDose.normalUnits.toFixed(1)}U</span> dose, capped by keeping the
                  projected peak at or under {HIGH_TARGET} mg/dL, and by how much your chosen activity (intensity and time) can
                  reasonably offset.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Even at your full recommended dose, this model already projects a peak above {HIGH_TARGET} mg/dL for this meal.
                </div>
              )}
              {liveDose.normalUnits > 0 && form.reductionUnits > safeReduction && (
                <p className="mt-2 text-sm text-amber-700">
                  Your planned reduction of {form.reductionUnits}U is {(form.reductionUnits - safeReduction).toFixed(1)}U more
                  than that estimate, so a glucose spike above {HIGH_TARGET} mg/dL is more likely with this model.
                </p>
              )}
            </section>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Suggested activities</h2>
          <p className="text-sm text-slate-500 mb-4">Picked for your gap and preferences above, and updates as you change them.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      </main>
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

function InlineSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const CATEGORY_ICON: Record<ActivityCategory, typeof Footprints> = {
  walk: Footprints,
  bodyweight: Dumbbell,
  stretch: PersonStanding,
  stairs: PersonStanding,
  dance: Music,
  chores: Home,
  cardio: Zap,
};

function activityIcon(activity: DisplayActivity) {
  if (activity.category) return CATEGORY_ICON[activity.category];
  return Sparkles;
}

function youtubeSearchUrl(activityName: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${activityName} exercise`)}`;
}

function ActivityCard({ activity }: { activity: DisplayActivity }) {
  const Icon = activityIcon(activity);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <h3 className="font-semibold text-slate-900">{activity.name}</h3>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] font-semibold text-slate-400">{activity.durationMinutes} min</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${INTENSITY_BADGE[activity.intensity]}`}>{activity.intensity}</span>
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-3">{activity.description}</p>
      <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3 mb-2">
        <p className="text-xs text-cyan-800">
          <span className="font-semibold">Why it helps: </span>
          {activity.whyItWorks}
        </p>
      </div>
      {activity.tip && <p className="text-xs text-slate-500 mb-2">{activity.tip}</p>}
      <a
        href={youtubeSearchUrl(activity.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:underline"
      >
        <Video className="h-3.5 w-3.5" /> Watch a demo
      </a>
    </div>
  );
}
