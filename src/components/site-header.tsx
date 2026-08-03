"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Banknote, BriefcaseBusiness, House, Moon, Sun } from "lucide-react";

const items = [
  { href: "/", label: "Visão geral", icon: House },
  { href: "/pessoal", label: "Pessoal", icon: Banknote },
  { href: "/empresarial", label: "Empresarial", icon: BriefcaseBusiness },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("finance-manager:theme");
    const shouldUseDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", shouldUseDark);
    const timer = window.setTimeout(() => setDark(shouldUseDark), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("finance-manager:theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-slate-950 dark:text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-sm font-bold text-white">F</span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">Financeiro</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Navegação principal">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}>
                <Icon className="h-4 w-4" /><span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={toggleTheme} className="ml-1 grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
