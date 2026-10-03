'use client';

import { useState } from 'react';
import {
  carbEffectFromRatio,
  insulinOnBoard,
  simulateMultiEventCurve,
  summarizeCurve,
  type CurvePoint,
  type SimEvent,
} from '@/lib/glucoseMath';

interface EventInput {
  id: string;
  label: string;
  time: string;
  carbs: number;
  units: number;
}

function nextId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

const TOTAL_MINUTES = 480;
const STEP_MINUTES = 10;
const MAX_EVENTS = 4;

function scenarioA(): EventInput[] {
  return [{ id: nextId(), label: 'Meal bolus', time: '08:00', carbs: 60, units: 6 }];
}

function scenarioB(): EventInput[] {
  return [
    { id: nextId(), label: 'Meal bolus', time: '08:00', carbs: 60, units: 6 },
    { id: nextId(), label: 'Correction', time: '10:00', carbs: 0, units: 2 },
  ];
}

function buildSimEvents(events: EventInput[], startTime: string, isf: number, carbRatio: number): SimEvent[] {
  const startMinutes = timeToMinutes(startTime);
  return events.map((e) => ({
    label: e.label,
    minuteOffset: Math.max(0, timeToMinutes(e.time) - startMinutes),
    totalCarbEffect: carbEffectFromRatio(e.carbs, isf, carbRatio),
    totalInsulinEffect: e.units * isf,
  }));
}

interface StackingWarning {
  earlierLabel: string;
  laterLabel: string;
  iobUnits: number;
}

function findStackingWarnings(events: EventInput[], simEvents: SimEvent[], isf: number): StackingWarning[] {
  const combined = events.map((e, i) => ({ label: e.label || 'Event', sim: simEvents[i] })).sort((a, b) => a.sim.minuteOffset - b.sim.minuteOffset);
  const warnings: StackingWarning[] = [];
  for (let i = 0; i < combined.length; i++) {
    if (combined[i].sim.totalInsulinEffect <= 0) continue;
    for (let j = i + 1; j < combined.length; j++) {
      const elapsed = combined[j].sim.minuteOffset - combined[i].sim.minuteOffset;
      const iob = insulinOnBoard(combined[i].sim, elapsed, isf);
      if (iob > 0.5) {
        warnings.push({ earlierLabel: combined[i].label, laterLabel: combined[j].label, iobUnits: iob });
      }
    }
  }
  return warnings;
}

export default function ScenarioSimulator() {
  const [startTime, setStartTime] = useState('08:00');
  const [startGlucose, setStartGlucose] = useState(140);
  const [isf, setIsf] = useState(50);
  const [carbRatio, setCarbRatio] = useState(10);

  const [eventsA, setEventsA] = useState<EventInput[]>(scenarioA);
  const [eventsB, setEventsB] = useState<EventInput[]>(scenarioB);

  function updateEvent(setter: typeof setEventsA, id: string, field: keyof EventInput, value: string | number) {
    setter((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function addEvent(setter: typeof setEventsA) {
    setter((prev) => (prev.length >= MAX_EVENTS ? prev : [...prev, { id: nextId(), label: 'New event', time: startTime, carbs: 0, units: 0 }]));
  }

  function removeEvent(setter: typeof setEventsA, id: string) {
    setter((prev) => (prev.length <= 1 ? prev : prev.filter((e) => e.id !== id)));
  }

  const simEventsA = buildSimEvents(eventsA, startTime, isf, carbRatio);
  const simEventsB = buildSimEvents(eventsB, startTime, isf, carbRatio);
  const curveA = simulateMultiEventCurve(startGlucose, simEventsA, TOTAL_MINUTES, STEP_MINUTES);
  const curveB = simulateMultiEventCurve(startGlucose, simEventsB, TOTAL_MINUTES, STEP_MINUTES);
  const statsA = summarizeCurve(curveA, STEP_MINUTES);
  const statsB = summarizeCurve(curveB, STEP_MINUTES);
  const warningsA = findStackingWarnings(eventsA, simEventsA, isf);
  const warningsB = findStackingWarnings(eventsB, simEventsB, isf);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight">What-If Scenario Simulator</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-prose">
            For manual/MDI dosing. Set up two dosing scenarios and compare the projected curves side by side,
            including whether either one stacks insulin on top of insulin that&rsquo;s still working.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-1">Shared starting point</h2>
          <p className="text-xs text-slate-500 mb-4">Both scenarios start from the same numbers, so the only difference is what you choose to inject and when.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TimeField label="Simulation starts at" value={startTime} onChange={setStartTime} />
            <NumberField label="Starting glucose (mg/dL)" value={startGlucose} onChange={setStartGlucose} />
            <NumberField label="ISF (mg/dL per U)" value={isf} onChange={setIsf} />
            <NumberField label="Carb ratio (g per U)" value={carbRatio} onChange={setCarbRatio} step={0.1} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScenarioEditor
            title="Scenario A"
            accent="indigo"
            events={eventsA}
            onUpdate={(id, field, value) => updateEvent(setEventsA, id, field, value)}
            onAdd={() => addEvent(setEventsA)}
            onRemove={(id) => removeEvent(setEventsA, id)}
          />
          <ScenarioEditor
            title="Scenario B"
            accent="cyan"
            events={eventsB}
            onUpdate={(id, field, value) => updateEvent(setEventsB, id, field, value)}
            onAdd={() => addEvent(setEventsB)}
            onRemove={(id) => removeEvent(setEventsB, id)}
          />
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-4">Projected curves</h2>
          <ScenarioChart curveA={curveA} curveB={curveB} />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <LineSwatch stroke="#4f46e5" width={3} /> Scenario A
            </span>
            <span className="flex items-center gap-1.5">
              <LineSwatch stroke="#7c3aed" dash="6 3" /> Scenario B
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full border border-amber-400" /> 180 mg/dL
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full border border-rose-400" /> 70 mg/dL
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ScenarioSummary label="Scenario A" stats={statsA} warnings={warningsA} tone="indigo" />
            <ScenarioSummary label="Scenario B" stats={statsB} warnings={warningsB} tone="cyan" />
          </div>

          <p className="mt-4 text-xs text-slate-500 leading-relaxed max-w-3xl">
            This uses the same simplified model as the analyzer&rsquo;s glucose curve: carbs and insulin each act
            gradually over time (carbs peak ~45 min and finish by 3h; insulin peaks ~75 min and finishes by 4h), and
            every event adds its own effect on top of whatever&rsquo;s already happening. It&rsquo;s not a
            prediction, since it ignores exercise, illness, and how this specific food digests, so use it to
            compare the <em>shape</em> of two choices, not to dose off of directly. Bring anything you learn here to
            your care team.
          </p>
        </section>
      </main>
    </div>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</span>
      <input
        type="number"
        step={step ?? 1}
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder="0"
      />
    </label>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </label>
  );
}

function ScenarioEditor({
  title,
  accent,
  events,
  onUpdate,
  onAdd,
  onRemove,
}: {
  title: string;
  accent: 'indigo' | 'cyan';
  events: EventInput[];
  onUpdate: (id: string, field: keyof EventInput, value: string | number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const accentClass = accent === 'indigo' ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-cyan-600 border-cyan-200 bg-cyan-50';
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-base font-bold text-slate-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {events.map((event, i) => (
          <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <input
                type="text"
                value={event.label}
                onChange={(e) => onUpdate(event.id, 'label', e.target.value)}
                className={`text-sm font-semibold rounded-lg border px-2 py-1 ${accentClass}`}
                placeholder={`Event ${i + 1}`}
              />
              {events.length > 1 && (
                <button type="button" onClick={() => onRemove(event.id)} className="text-xs text-rose-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <TimeField label="Time" value={event.time} onChange={(v) => onUpdate(event.id, 'time', v)} />
              <NumberField label="Carbs (g)" value={event.carbs} onChange={(v) => onUpdate(event.id, 'carbs', v)} />
              <NumberField label="Units (U)" value={event.units} onChange={(v) => onUpdate(event.id, 'units', v)} step={0.5} />
            </div>
          </div>
        ))}
      </div>
      {events.length < MAX_EVENTS && (
        <button type="button" onClick={onAdd} className="mt-4 text-sm font-medium text-cyan-600 hover:underline">
          + Add event
        </button>
      )}
    </section>
  );
}

function ScenarioSummary({
  label,
  stats,
  warnings,
  tone,
}: {
  label: string;
  stats: ReturnType<typeof summarizeCurve>;
  warnings: StackingWarning[];
  tone: 'indigo' | 'cyan';
}) {
  const toneClass = tone === 'indigo' ? 'text-indigo-700 bg-indigo-50 border-indigo-100' : 'text-cyan-700 bg-cyan-50 border-cyan-100';
  return (
    <div className={`rounded-xl border p-4 text-xs ${toneClass}`}>
      <div className="font-bold text-sm mb-1">{label}</div>
      <p>
        Peaks around {Math.round(stats.maxGlucose)} mg/dL, in range (70&ndash;180) for about{' '}
        {Math.round(stats.percentInRange)}% of the 8 hours
        {stats.minutesLow > 0 ? `, dips as low as ${Math.round(stats.minGlucose)} mg/dL` : ', never drops below 70'}.
      </p>
      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="text-rose-700">
              ⚠ &ldquo;{w.laterLabel}&rdquo; happens while about {w.iobUnits.toFixed(1)}U from &ldquo;{w.earlierLabel}&rdquo; is
              still on board.
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-slate-500">No meaningful insulin stacking between these events.</p>
      )}
    </div>
  );
}

function LineSwatch({ stroke, dash, width = 2 }: { stroke: string; dash?: string; width?: number }) {
  return (
    <svg width="20" height="8">
      <line x1="0" y1="4" x2="20" y2="4" stroke={stroke} strokeWidth={width} strokeDasharray={dash} />
    </svg>
  );
}

function ScenarioChart({ curveA, curveB }: { curveA: CurvePoint[]; curveB: CurvePoint[] }) {
  const width = 900;
  const height = 260;
  const padding = { top: 10, right: 12, bottom: 24, left: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allGlucose = [...curveA, ...curveB].map((p) => p.glucose).concat([70, 180]);
  const minY = Math.min(...allGlucose) - 10;
  const maxY = Math.max(...allGlucose) + 10;
  const maxMinute = curveA[curveA.length - 1]?.minute ?? TOTAL_MINUTES;

  function x(minute: number) {
    return padding.left + (minute / maxMinute) * plotWidth;
  }
  function y(glucose: number) {
    return padding.top + plotHeight - ((glucose - minY) / (maxY - minY)) * plotHeight;
  }
  function toPath(points: CurvePoint[]) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.minute).toFixed(1)} ${y(p.glucose).toFixed(1)}`).join(' ');
  }

  const ticks = [0, 60, 120, 180, 240, 300, 360, 420, 480].filter((m) => m <= maxMinute);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Projected glucose curves for Scenario A and Scenario B">
      <line x1={padding.left} x2={width - padding.right} y1={y(70)} y2={y(70)} stroke="#fda4af" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={padding.left} x2={width - padding.right} y1={y(180)} y2={y(180)} stroke="#fcd34d" strokeWidth={1} strokeDasharray="4 3" />
      <text x={2} y={y(70) - 2} fontSize={9} fill="#e11d48">70</text>
      <text x={2} y={y(180) - 2} fontSize={9} fill="#b45309">180</text>
      {ticks.map((m) => (
        <text key={m} x={x(m)} y={height - 6} fontSize={9} fill="#94a3b8" textAnchor="middle">
          {Math.floor(m / 60)}h
        </text>
      ))}
      <path d={toPath(curveA)} fill="none" stroke="#4f46e5" strokeWidth={3} />
      <path d={toPath(curveB)} fill="none" stroke="#7c3aed" strokeWidth={2} strokeDasharray="6 3" />
    </svg>
  );
}
