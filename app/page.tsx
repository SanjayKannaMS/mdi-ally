import Link from 'next/link';
import { UtensilsCrossed, Activity, LineChart, ArrowRight, Info } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-slate-50">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="max-w-2xl text-2xl font-bold tracking-tight">
            Reduce your insulin intake safely. You can preview your meal before you eat it and see what actually
            changes your glucose.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Built for Type 1 and Type 2 diabetics who may or may not have insulin pumps or CGMs. It shows you the
            math behind every calculation and simulation. You can verify your hunches with our correlation matrix.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/coach"
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-400"
            >
              Reduce insulin safely <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/meals"
              className="rounded-lg border border-white/40 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
            >
              Simulate a meal
            </Link>
            <Link
              href="/routine"
              className="rounded-lg border border-white/40 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
            >
              See your correlations
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <section className="grid grid-cols-1 items-center gap-5 lg:grid-cols-2">
          <div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
              <Activity className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <h2 className="mt-2.5 flex items-center gap-1.5 text-base font-bold text-slate-900">
              Dose Reduction Coach
              <Link
                href="/why/insulin-reduction"
                aria-label="Why reducing insulin is a health benefit"
                title="Why this matters"
                className="text-slate-400 transition hover:text-cyan-600"
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Enter your upcoming meal and how many units you want to reduce and take a look at the food,
              correction, and insulin on board along with activities that can help you reduce the desired amount
              reasonably.
            </p>
            <Link href="/coach" className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:underline">
              Open the Dose Reduction Coach <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> Standard bolus math: food, correction, and insulin-on-board
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> 9 hand-picked activities, filtered by intensity, time, and indoor/outdoor
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> Automatically caps intensity when insulin is still active from an earlier dose
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> Every suggestion explains the actual physiology behind it
              </li>
            </ul>
          </div>
        </section>

        <section className="grid grid-cols-1 items-center gap-5 lg:grid-cols-2">
          <div className="order-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:order-1">
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" /> Log stress, sleep, exercise, and meal-timing consistency, day by day
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" /> A real Pearson correlation method used to verify your hunches and to point out more
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" /> Waits for enough logged days before drawing any conclusion
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" /> Built into the same worksheet as your CSV, photo, or manual log
              </li>
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <LineChart className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <h2 className="mt-2.5 flex items-center gap-1.5 text-base font-bold text-slate-900">
              Routine & Stress Correlator
              <Link
                href="/why/routine-correlation"
                aria-label="Why routine and stress correlation matters for glucose"
                title="Why this matters"
                className="text-slate-400 transition hover:text-violet-600"
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Log stress, sleep, exercise, and routine consistency alongside your glucose, and this tool runs an
              actual Pearson correlation to show what really tends to move together, turning a hunch like
              &ldquo;I think stress spikes my numbers&rdquo; into a number you can bring to your care team.
            </p>
            <Link href="/routine" className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:underline">
              Open the Routine Correlator <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 items-center gap-5 lg:grid-cols-2">
          <div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
              <UtensilsCrossed className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <h2 className="mt-2.5 flex items-center gap-1.5 text-base font-bold text-slate-900">
              Meal Planner
              <Link
                href="/why/meal-simulation"
                aria-label="Why simulating a meal before eating helps"
                title="Why this matters"
                className="text-slate-400 transition hover:text-cyan-600"
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Plan the entire day or just one meal, then you can simulate a graph of your glucose curve for any kind
              of food you will eat on the same screen. You can visualize what would happen to your glucose if you
              take just a bite, or a dose for it.
            </p>
            <Link href="/meals" className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:underline">
              Open the Meal Planner <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> ~70 recipes filtered by cuisine, diet, and meal type
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> Simulate any food&rsquo;s projected glucose curve before you eat it
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> Pre-fills your own logged carb ratio, ISF, and glucose when available
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /> Diabetes-aware carb/fiber/protein targets from your body stats
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
