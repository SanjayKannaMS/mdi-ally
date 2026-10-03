'use client';

import { useState } from 'react';
import type { AnalysisResult } from '@/lib/types';
import { buildManualLogResult, MEAL_TYPES, nextEntryId, type ManualMealEntry } from '@/lib/manualMealLog';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormState {
  date: string;
  mealType: string;
  carbs: string;
  fiber: string;
  protein: string;
  bolus: string;
  carbRatio: string;
  isf: string;
  glucoseAtBolus: string;
  glucoseAtTwoHour: string;
}

function defaultForm(): FormState {
  return {
    date: todayDateString(),
    mealType: MEAL_TYPES[0].label,
    carbs: '',
    fiber: '',
    protein: '',
    bolus: '',
    carbRatio: '',
    isf: '',
    glucoseAtBolus: '',
    glucoseAtTwoHour: '',
  };
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function ManualMealLog({
  initialEntries,
  sourceNote,
  onBuildResult,
  onCancel,
}: {
  initialEntries?: ManualMealEntry[];
  sourceNote?: string;
  onBuildResult: (result: AnalysisResult) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [entries, setEntries] = useState<ManualMealEntry[]>(initialEntries ?? []);
  const [error, setError] = useState<string | null>(null);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleAddEntry() {
    const carbs = toNumberOrNull(form.carbs);
    const bolus = toNumberOrNull(form.bolus);
    if (!form.date || !carbs || carbs <= 0 || bolus == null || bolus < 0) {
      setError('Date, carbs, and units given are required to add an entry.');
      return;
    }
    setError(null);
    setEntries((prev) => [
      ...prev,
      {
        id: nextEntryId(),
        date: form.date,
        mealType: form.mealType,
        carbs,
        fiber: toNumberOrNull(form.fiber),
        protein: toNumberOrNull(form.protein),
        bolus,
        carbRatio: toNumberOrNull(form.carbRatio),
        isf: toNumberOrNull(form.isf),
        glucoseAtBolus: toNumberOrNull(form.glucoseAtBolus),
        glucoseAtTwoHour: toNumberOrNull(form.glucoseAtTwoHour),
      },
    ]);
    setForm((f) => ({ ...f, carbs: '', fiber: '', protein: '', bolus: '', glucoseAtBolus: '', glucoseAtTwoHour: '' }));
  }

  function updateEntry(id: string, field: keyof ManualMealEntry, rawValue: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === 'date' || field === 'mealType') return { ...e, [field]: rawValue };
        const parsed = toNumberOrNull(rawValue);
        if (field === 'carbs' || field === 'bolus') return { ...e, [field]: parsed ?? 0 };
        return { ...e, [field]: parsed };
      })
    );
  }

  function handleRemoveEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleBuild() {
    onBuildResult(buildManualLogResult(entries));
  }

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.mealType.localeCompare(b.mealType));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{sourceNote ? 'Review extracted meals' : 'Log your meals by hand'}</h2>
          <button type="button" onClick={onCancel} className="text-xs font-medium text-slate-500 hover:underline">
            ← Back
          </button>
        </div>
        {sourceNote ? (
          <p className="text-sm text-slate-500">{sourceNote}</p>
        ) : (
          <p className="text-sm text-slate-500">
            Add one meal at a time. A single day is fine, or log several days to get a day-by-day breakdown
            and best/worst-day comparison, the same as a real CareLink export gives you.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <label className="block">
            <span className="block text-xs uppercase font-semibold text-slate-400 mb-1.5">Date</span>
            <input
              type="date"
              value={form.date}
              max={todayDateString()}
              onChange={(e) => updateForm('date', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="block text-xs uppercase font-semibold text-slate-400 mb-1.5">Meal type</span>
            <select
              value={form.mealType}
              onChange={(e) => updateForm('mealType', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {MEAL_TYPES.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Carbs (g)" value={form.carbs} onChange={(v) => updateForm('carbs', v)} />
          <TextField label="Fiber (g)" value={form.fiber} onChange={(v) => updateForm('fiber', v)} />
          <TextField label="Protein (g)" value={form.protein} onChange={(v) => updateForm('protein', v)} />
          <TextField label="Units given" value={form.bolus} onChange={(v) => updateForm('bolus', v)} />
          <TextField label="Carb ratio used (g/U)" value={form.carbRatio} onChange={(v) => updateForm('carbRatio', v)} />
          <TextField label="ISF (mg/dL per U)" value={form.isf} onChange={(v) => updateForm('isf', v)} />
          <TextField label="Glucose at meal" value={form.glucoseAtBolus} onChange={(v) => updateForm('glucoseAtBolus', v)} />
          <TextField label="Glucose 2h later" value={form.glucoseAtTwoHour} onChange={(v) => updateForm('glucoseAtTwoHour', v)} />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={handleAddEntry}
          className="rounded-xl border border-cyan-600 px-4 py-2 text-sm font-medium text-cyan-600 hover:bg-cyan-50"
        >
          + Add entry
        </button>
      </div>

      {sortedEntries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Logged meals ({sortedEntries.length})</h3>
          <p className="text-xs text-slate-400 mb-3">Every field here is editable, so fix anything before building the worksheet.</p>
          <div className="space-y-2">
            {sortedEntries.map((e) => (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                  <MiniField label="Date" type="date" value={e.date} onChange={(v) => updateEntry(e.id, 'date', v)} />
                  <label className="block">
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Meal</span>
                    <select
                      value={e.mealType}
                      onChange={(ev) => updateEntry(e.id, 'mealType', ev.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      {MEAL_TYPES.map((m) => (
                        <option key={m.label} value={m.label}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <MiniField label="Carbs (g)" value={e.carbs} onChange={(v) => updateEntry(e.id, 'carbs', v)} />
                  <MiniField label="Fiber (g)" value={e.fiber ?? ''} onChange={(v) => updateEntry(e.id, 'fiber', v)} />
                  <MiniField label="Protein (g)" value={e.protein ?? ''} onChange={(v) => updateEntry(e.id, 'protein', v)} />
                  <MiniField label="Units" value={e.bolus} onChange={(v) => updateEntry(e.id, 'bolus', v)} />
                  <MiniField label="Ratio (g/U)" value={e.carbRatio ?? ''} onChange={(v) => updateEntry(e.id, 'carbRatio', v)} />
                  <MiniField label="ISF" value={e.isf ?? ''} onChange={(v) => updateEntry(e.id, 'isf', v)} />
                  <MiniField label="Gluc@meal" value={e.glucoseAtBolus ?? ''} onChange={(v) => updateEntry(e.id, 'glucoseAtBolus', v)} />
                  <MiniField label="Gluc@2h" value={e.glucoseAtTwoHour ?? ''} onChange={(v) => updateEntry(e.id, 'glucoseAtTwoHour', v)} />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEntry(e.id)}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleBuild}
        className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-700"
      >
        {entries.length > 0 ? `Build worksheet from ${entries.length} logged meal${entries.length === 1 ? '' : 's'}` : 'Build a blank worksheet'}
      </button>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase font-semibold text-slate-400 mb-1.5">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
        placeholder="0"
      />
    </label>
  );
}

function MiniField({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: 'date' | 'number';
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">{label}</span>
      <input
        type={type ?? 'number'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono"
        placeholder="0"
      />
    </label>
  );
}
