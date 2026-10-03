import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Reduce Insulin on MDI Ally',
};

export default function WhyInsulinReductionPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6 text-sm leading-relaxed">
        <Link href="/" className="text-cyan-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Why reducing insulin, safely, is a real health benefit</h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Too much insulin is its own risk</h2>
          <p>
            Taking a full dose before activity, when your body will need less insulin to handle the same carbs,
            doesn&rsquo;t just risk a low. It risks a severe one. Exercising muscle pulls in glucose through a
            pathway that doesn&rsquo;t need insulin at all, stacking on top of whatever insulin is already working.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Lows have real costs beyond the moment</h2>
          <p>
            A bad low can mean confusion, needing help from someone else, or in a serious case, a seizure or loss of
            consciousness. Even mild, frequent lows train a habit of over-treating with extra carbs &ldquo;just in
            case,&rdquo; which then pushes glucose high again later, turning into a cycle of swings instead of
            a steady line.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">The goal isn&rsquo;t less insulin: it&rsquo;s matched insulin</h2>
          <p>
            This app doesn&rsquo;t suggest skipping insulin. It calculates how much less is actually justified by a
            specific, sized activity, using the same math a bolus calculator already uses (food dose,
            correction, and insulin still active from an earlier dose), so the reduction is sized to the real
            gap it needs to cover, not a guess.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Why this is worth bringing to your care team</h2>
          <p>
            None of this replaces your prescribed ratios. It&rsquo;s a way to arrive at a discussion with your
            doctor or educator with an actual number and the reasoning behind it, instead of &ldquo;I feel like I
            should take less before I work out.&rdquo;
          </p>
        </section>

        <Link href="/coach" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:underline">
          Open the Dose Reduction Coach →
        </Link>
      </div>
    </main>
  );
}
