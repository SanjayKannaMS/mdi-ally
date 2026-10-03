import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Simulate a Meal First on MDI Ally',
};

export default function WhyMealSimulationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6 text-sm leading-relaxed">
        <Link href="/" className="text-cyan-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Why previewing a meal beats finding out after</h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Once you eat and dose, you can&rsquo;t undo it</h2>
          <p>
            After insulin is injected and food is eaten, any mismatch between the two has to be managed after the
            fact, not prevented. Seeing a projected curve first turns a meal into a plan instead of a live
            experiment.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Different foods behave differently, even at the same carb count</h2>
          <p>
            Fiber and protein slow down how carbs are absorbed, which is why two meals with the same carb count can
            produce very different curves. Simulating a specific food, not just a carb number, makes
            that visible before it matters.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">It builds real intuition over time</h2>
          <p>
            Comparing a few options side by side before choosing what to eat is how people actually learn which foods
            run higher or lower for them, the same self-management skill a diabetes educator would try to
            teach, just available on demand.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Same math as the rest of the app</h2>
          <p>
            The simulator uses the same carbs × ISF ÷ ratio model used in the Dose Coach and the worksheet.
            Nothing here is a separate, unverified guess.
          </p>
        </section>

        <Link href="/meals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:underline">
          Open the Meal Planner →
        </Link>
      </div>
    </main>
  );
}
