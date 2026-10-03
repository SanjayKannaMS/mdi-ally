import Link from 'next/link';

export default function WorksheetTutorialPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6 text-sm leading-relaxed">
        <Link href="/tutorials" className="text-cyan-600 hover:underline">
          ← All tutorials
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Reading the results &amp; using the worksheet</h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">What&rsquo;s filled in automatically</h2>
          <p>
            After you upload your CSV, the overall stats (average glucose, GMI, coefficient of variation) and the
            hypo/hyperglycemic pattern counts (grouped into 4-hour blocks of the day rather than by exact hour) are
            computed directly from your sensor readings. The worksheet&rsquo;s carbs, bolus, current ratio, and
            glucose-at-bolus are averaged from your real bolus-wizard events in each meal&rsquo;s time window, and
            glucose-at-2h comes from the sensor reading closest to two hours after each of those boluses, marked
            with a small &ldquo;avg&rdquo; badge. ISF is used behind the scenes to compute the Suggested Carb Ratio
            but isn&rsquo;t shown as its own field. None of this needs to be typed in by hand.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Switching between meals</h2>
          <p>
            The &ldquo;Meal type&rdquo; dropdown above the card switches between Breakfast, Lunch, Dinner, and
            Overnight. Whichever one you pick shows its full card, day-by-day breakdown, and simulated glucose curve
            together, with nothing separate to expand or collapse.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Why some fields are read-only</h2>
          <p>
            Carbs, bolus, current ratio, and the glucose readings are read-only, since they&rsquo;re your real analyzed
            data, not something to edit here. A field shows &ldquo;0&rdquo; when there&rsquo;s nothing safe to fill
            it with, for example if no bolus-wizard event fell in that meal&rsquo;s time window, or a sensor
            reading two hours after a bolus wasn&rsquo;t available (a sensor gap). &ldquo;Experiment ratio&rdquo; is
            the one field you can change, since it&rsquo;s a sandbox for the simulated glucose curve, letting you try out
            a ratio against this same meal&rsquo;s real numbers without touching the recommendation itself.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">What the formula does with it</h2>
          <p className="font-mono text-xs bg-white border border-slate-200 rounded-xl p-3">
            extra units = max(0, 2h rise − target rise) ÷ ISF
            <br />
            suggested ratio = carbs ÷ (bolus + extra units)
          </p>
          <p>
            It looks at how much your glucose rose in the two hours after that meal, compares it to the target
            rise you set, and works out how much more (or less) insulin would have been needed to hit that
            target, then converts that into a suggested carb ratio for that meal.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Saving it for later</h2>
          <p>
            If you&rsquo;re logged in, a &ldquo;Save to history&rdquo; button appears above the results. This
            keeps the computed data and your worksheet entries so you can revisit them from{' '}
            <Link href="/reports" className="text-cyan-600 hover:underline">
              your history page
            </Link>{' '}
            later, without re-uploading the CSV.
          </p>
        </section>
      </div>
    </main>
  );
}
