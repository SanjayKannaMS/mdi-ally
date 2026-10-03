import Link from 'next/link';
import { Activity } from 'lucide-react';

const FOOTER_GROUPS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Tools',
    links: [
      { href: '/coach', label: 'Dose Reduction Coach' },
      { href: '/analyzer', label: 'Routine & Stress Correlator' },
      { href: '/meals', label: 'Meal Planner' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Create an account' },
      { href: '/profile', label: 'Profile & preferences' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-white">
                <Activity className="h-4.5 w-4.5" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-bold tracking-tight text-slate-900">MDI Ally</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
              A discussion-prep tool for your care team, built as a student project. Nothing here is medical advice
              or an instruction to change your dosing.
            </p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{group.heading}</h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-600 hover:text-cyan-600 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-slate-100 pt-6 text-xs text-slate-400">
          Not affiliated with any medical device manufacturer or diabetes organization. Always talk to your care
          team before changing your insulin dosing.
        </div>
      </div>
    </footer>
  );
}
