import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Layers3 } from "lucide-react";

const features = [
  { title: "Despesas recorrentes", text: "Cada mês tem seu próprio status de pagamento, sem confundir o próximo vencimento.", icon: CheckCircle2 },
  { title: "Categorias úteis", text: "Agrupe, filtre e compare rapidamente onde o dinheiro está concentrado.", icon: Layers3 },
];

export default function HomePage() {
  return <div className="space-y-6">
    <section className="rounded-2xl bg-slate-950 px-6 py-12 text-white sm:px-10 sm:py-16">
      <p className="text-sm font-medium text-emerald-300">CONTROLE FINANCEIRO</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Finanças organizadas, decisões mais tranquilas.</h1>
      <p className="mt-5 max-w-2xl leading-7 text-slate-300">Uma visão simples para acompanhar seu dinheiro pessoal e empresarial, sem excesso de informação.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/pessoal" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-400">Abrir área pessoal <ArrowRight className="h-4 w-4" /></Link><Link href="/empresarial" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-medium hover:bg-white/10">Abrir área empresarial <BriefcaseBusiness className="h-4 w-4" /></Link></div>
    </section>
    <section className="grid gap-4 md:grid-cols-2">{features.map((feature) => { const Icon = feature.icon; return <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{feature.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{feature.text}</p></article>; })}</section>
  </div>;
}
