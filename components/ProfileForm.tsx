'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileForm({
  initialFullName,
  initialDefaultTargetRise,
  initialPreferredIntensity,
  initialPreferredDurationMinutes,
  initialPreferredSetting,
}: {
  initialFullName: string;
  initialDefaultTargetRise: number;
  initialPreferredIntensity: number;
  initialPreferredDurationMinutes: number;
  initialPreferredSetting: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [defaultTargetRise, setDefaultTargetRise] = useState(initialDefaultTargetRise);
  const [preferredIntensity, setPreferredIntensity] = useState(initialPreferredIntensity);
  const [preferredDurationMinutes, setPreferredDurationMinutes] = useState(initialPreferredDurationMinutes);
  const [preferredSetting, setPreferredSetting] = useState(initialPreferredSetting);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('saving');

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        defaultTargetRise,
        preferredIntensity,
        preferredDurationMinutes,
        preferredSetting,
      }),
    });

    if (res.ok) {
      setStatus('saved');
      router.refresh();
    } else {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-600 mb-1">Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Default target 2h rise (mg/dL)</label>
        <input
          type="number"
          value={defaultTargetRise}
          onChange={(e) => setDefaultTargetRise(parseFloat(e.target.value) || 0)}
          className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
        />
        <p className="mt-1 text-xs text-slate-400">
          Pre-fills the carb-ratio worksheet&rsquo;s target rise every time you analyze a report.
        </p>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <p className="text-sm font-medium text-slate-700 mb-3">Dose Reduction Activity Coach defaults</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Comfortable activity intensity</label>
            <select
              value={preferredIntensity}
              onChange={(e) => setPreferredIntensity(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value={1}>Light</option>
              <option value={2}>Moderate</option>
              <option value={3}>Vigorous</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Usual time available (min, 5&ndash;45)</label>
            <input
              type="number"
              min={5}
              max={45}
              value={preferredDurationMinutes}
              onChange={(e) => setPreferredDurationMinutes(Math.min(45, Math.max(5, parseInt(e.target.value, 10) || 5)))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Setting</label>
            <select
              value={preferredSetting}
              onChange={(e) => setPreferredSetting(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="either">Either</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Used by the Dose Reduction Activity Coach on the home page to tailor its suggestions.
        </p>
      </div>

      <button
        type="submit"
        disabled={status === 'saving'}
        className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : 'Save changes'}
      </button>

      {status === 'saved' && <span className="ml-3 text-sm text-cyan-600">Saved.</span>}
      {status === 'error' && <span className="ml-3 text-sm text-rose-600">Couldn&rsquo;t save. Try again.</span>}
    </form>
  );
}
