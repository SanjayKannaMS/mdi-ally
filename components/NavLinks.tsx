'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, UtensilsCrossed, Activity, Menu, X, type LucideIcon } from 'lucide-react';

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/coach', label: 'Dose Reduction Coach', icon: Activity },
  { href: '/analyzer', label: 'Routine & Stress Correlator', icon: LineChart },
  { href: '/meals', label: 'Meal Planner', icon: UtensilsCrossed },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="hidden md:flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive(pathname, href) ? 'bg-sky-100 text-cyan-700' : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <nav className="absolute inset-x-0 top-full z-40 border-b border-slate-800 bg-slate-900 p-3 shadow-lg md:hidden">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive(pathname, href) ? 'bg-sky-100 text-cyan-700' : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
