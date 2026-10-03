import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Routine & Stress Correlation Matters on MDI Ally',
};

export default function WhyRoutineCorrelationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6 text-sm leading-relaxed">
        <Link href="/" className="text-violet-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Why stress, sleep, and routine actually move your glucose</h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Stress hormones raise glucose on their own</h2>
          <p>
            Adrenaline and cortisol, the hormones your body releases under stress, signal your liver to
            release stored glucose, independent of anything you ate or any insulin you took. A stressful day can push
            glucose up even when your carbs and dose were identical to a calm day.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Poor sleep changes how well insulin works the next day</h2>
          <p>
            Sleep loss is linked to reduced insulin sensitivity, so the same dose that worked yesterday may not
            cover the same meal today, purely because of how you slept, not because your ratio is wrong.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Irregular routines make patterns harder to see</h2>
          <p>
            When meal timing, activity, and sleep shift around day to day, glucose swings look random. Logging them
            next to your glucose is what turns &ldquo;random&rdquo; into a pattern you can actually name.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Why a real correlation, not just a feeling</h2>
          <p>
            It&rsquo;s easy to blame a bad number on the wrong thing. Changing a carb ratio because of a high
            that was actually caused by a stressful day risks making the ratio wrong on every calm day afterward.
            This tool waits until you&rsquo;ve logged enough days, then runs an actual statistical correlation, so
            the pattern it shows is backed by your own numbers, not a guess.
          </p>
        </section>

        <Link href="/routine" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:underline">
          Open the Routine Correlator →
        </Link>
      </div>
    </main>
  );
}
