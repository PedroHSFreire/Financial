"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, BriefcaseBusiness, House } from "lucide-react";

const items = [
  {
    href: "/",
    label: "Início",
    icon: House,
  },
  {
    href: "/pessoal",
    label: "Pessoal",
    icon: Banknote,
  },
  {
    href: "/empresarial",
    label: "Empresarial",
    icon: BriefcaseBusiness,
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-lg shadow-slate-950/20 transition-transform group-hover:-rotate-6 group-hover:scale-105">
            FM
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[0.3em] text-slate-500 uppercase">
              Finance Manager
            </p>
            <p className="text-sm text-slate-600">
              Controle simples, recorrente e parcelado
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap gap-2">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                    : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-950"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
