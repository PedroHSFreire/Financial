import Link from "next/link";
import { ArrowRight, Banknote, BriefcaseBusiness, CalendarRange, ShieldCheck } from "lucide-react";

const highlights = [
  {
    icon: CalendarRange,
    title: "Despesas fixas recorrentes",
    text: "Marque como pago neste mês e continue vendo o lançamento automaticamente nos meses seguintes.",
  },
  {
    icon: Banknote,
    title: "Compra parcelada",
    text: "Defina o mês inicial e final para acompanhar cada parcela com status próprio.",
  },
  {
    icon: ShieldCheck,
    title: "Backup local e exportação",
    text: "Os dados ficam salvos no navegador e podem ser exportados/importados em JSON.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700">
              Sistema financeiro pessoal e empresarial
            </div>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Next.js + Vercel
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                Uma base simples para controlar finanças pessoais e do negócio sem virar uma
                planilha interminável.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                O projeto já separa a gestão em duas páginas, trata despesas fixas como
                recorrentes, acompanha compras parceladas por mês e traz filtros, balanço e
                backup para você usar no dia a dia.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/pessoal"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Abrir gestão pessoal
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/empresarial"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Abrir gestão empresarial
                <BriefcaseBusiness className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-slate-950 p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
