"use client";

import { useDeferredValue, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, CirclePlus, Download, FileUp, Filter, Landmark, ReceiptText, RotateCcw, Search, Trash2, TrendingDown, WalletCards } from "lucide-react";
import { addExpense, addMonths, buildMonthlyEntries, createDefaultState, DEFAULT_CATEGORIES, deleteExpense, formatCurrency, getExpenseCategories, getScopeTitle, isValidMonthKey, monthLabel, nextMonth, normalizeState, resetScope, STORAGE_KEY, summarizeEntries, toggleExpensePaidMonth, updateMonthlyIncome, type ExpenseDraft, type ExpenseKind, type FilterKind, type FilterStatus, type FinanceState, type MonthKey, type MonthlyEntry, type ScopeKey, type SortMode } from "@/lib/finance";

type Props = { scope: ScopeKey; initialMonth: MonthKey };
type Filters = { search: string; kind: FilterKind; status: FilterStatus; category: string; sort: SortMode };

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500";

function createDraft(month: MonthKey): ExpenseDraft {
  return { name: "", category: "", amount: "", kind: "fixed", dueDay: "5", startMonth: month, endMonth: nextMonth(month), notes: "" };
}
function valueOf(entry: MonthlyEntry) { return entry.kind === "installment" ? entry.installmentValue ?? entry.amount : entry.amount; }
function status(entry: MonthlyEntry) {
  if (entry.paid) return ["Pago", "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"] as const;
  if (entry.overdue) return ["Atrasado", "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"] as const;
  return ["Pendente", "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"] as const;
}
function sortEntries(entries: MonthlyEntry[], sort: SortMode) {
  return [...entries].sort((a, b) => sort === "amount" ? valueOf(b) - valueOf(a) : sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : (a.dueDay ?? 99) - (b.dueDay ?? 99) || a.name.localeCompare(b.name, "pt-BR"));
}

export function FinanceDashboard({ scope, initialMonth }: Props) {
  const [state, setState] = useState<FinanceState>(createDefaultState);
  const [month, setMonth] = useState<MonthKey>(initialMonth);
  const [draft, setDraft] = useState<ExpenseDraft>(() => createDraft(initialMonth));
  const [filters, setFilters] = useState<Filters>({ search: "", kind: "all", status: "all", category: "all", sort: "due" });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const search = useDeferredValue(filters.search).trim().toLocaleLowerCase();
  const scopeState = state.scopes[scope];
  const entries = buildMonthlyEntries(state, scope, month);
  const summary = summarizeEntries(entries, scopeState.monthlyIncome);
  const categories = getExpenseCategories(state, scope);
  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const local = window.localStorage.getItem(STORAGE_KEY);
        if (local) { if (!cancelled) setState(normalizeState(JSON.parse(local))); return; }
        const response = await fetch("/api/state", { cache: "no-store" });
        if (response.ok && !cancelled) setState(normalizeState(await response.json()));
      } catch { /* a aplicação continua funcionando apenas com armazenamento local */ }
      finally { if (!cancelled) setReady(true); }
    }
    void load(); return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (!ready) return; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); void fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) }).catch(() => {}); }, [ready, state]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(null), 3000); return () => window.clearTimeout(timer); }, [notice]);

  const visible = sortEntries(entries.filter((entry) => {
    const matchesSearch = !search || [entry.name, entry.category, entry.notes].some((item) => item.toLocaleLowerCase().includes(search));
    const matchesKind = filters.kind === "all" || entry.kind === filters.kind;
    const matchesStatus = filters.status === "all" || (filters.status === "paid" && entry.paid) || (filters.status === "open" && !entry.paid) || (filters.status === "overdue" && entry.overdue);
    return matchesSearch && matchesKind && matchesStatus && (filters.category === "all" || entry.category === filters.category);
  }), filters.sort);
  const grouped = visible.reduce<Record<string, MonthlyEntry[]>>((groups, entry) => { (groups[entry.category] ??= []).push(entry); return groups; }, {});
  const categoryTotals = entries.reduce<Record<string, number>>((totals, entry) => { totals[entry.category] = (totals[entry.category] ?? 0) + valueOf(entry); return totals; }, {});

  function update(updater: (current: FinanceState) => FinanceState, message?: string) { setState(updater); if (message) setNotice(message); }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const amount = Number(draft.amount); const day = Number(draft.dueDay);
    if (!draft.name.trim() || !draft.category.trim() || !Number.isFinite(amount) || amount <= 0) return setNotice("Informe nome, categoria e um valor válido.");
    if (draft.kind === "fixed" && (!Number.isInteger(day) || day < 1 || day > 31)) return setNotice("Informe um vencimento entre os dias 1 e 31.");
    const startsFirst = draft.startMonth <= draft.endMonth;
    update((current) => addExpense(current, scope, { ...draft, name: draft.name.trim(), category: draft.category.trim(), dueDay: draft.kind === "fixed" ? draft.dueDay : "0", startMonth: startsFirst ? draft.startMonth : draft.endMonth, endMonth: startsFirst ? draft.endMonth : draft.startMonth }), "Despesa adicionada.");
    setDraft(createDraft(month));
  }
  function exportData() { const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `financeiro-${scope}-${month}.json`; anchor.click(); URL.revokeObjectURL(url); }
  async function importData(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { setState(normalizeState(JSON.parse(await file.text()))); setNotice("Backup importado."); } catch { setNotice("Não foi possível ler este backup."); } }

  const metrics = [
    ["Receita", formatCurrency(summary.income), "Valor disponível no mês", Landmark, "text-sky-600 dark:text-sky-300"],
    ["Planejado", formatCurrency(summary.forecast), `${entries.length} lançamento(s)`, ReceiptText, "text-slate-700 dark:text-slate-200"],
    ["Pago", formatCurrency(summary.paid), `${summary.paidCount} confirmado(s)`, Check, "text-emerald-600 dark:text-emerald-300"],
    ["Em aberto", formatCurrency(summary.pending), `${summary.overdueCount} em atraso`, TrendingDown, "text-rose-600 dark:text-rose-300"],
  ] as const;

  return <div className="space-y-6">
    <section className="rounded-2xl bg-slate-950 px-5 py-7 text-white sm:px-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div><p className="text-sm font-medium text-emerald-300">{getScopeTitle(scope)}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Seu mês, com clareza.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Organize despesas recorrentes, parcelas e categorias em um único lugar.</p></div>
        <div className="flex flex-wrap items-center gap-2"><button onClick={() => setMonth((current) => addMonths(current, -1))} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Anterior</button><label className="rounded-lg border border-white/15 px-3 py-2 text-sm">{monthLabel(month)}<input aria-label="Selecionar mês" type="month" value={month} onChange={(event) => isValidMonthKey(event.target.value) && setMonth(event.target.value)} className="ml-2 w-5 bg-transparent text-transparent outline-none [color-scheme:dark]" /></label><button onClick={() => setMonth((current) => addMonths(current, 1))} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10">Próximo<ArrowRight className="h-4 w-4" /></button></div>
      </div>
    </section>
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{notice}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, helper, Icon, tone]) => <article key={label} className={card}><div className="flex justify-between"><div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p></div><Icon className={`h-5 w-5 ${tone}`} /></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{helper}</p></article>)}</section>
    <section className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <div className={card}><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Receita mensal</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Usada no saldo projetado do mês.</p><input type="number" min="0" step="0.01" value={scopeState.monthlyIncome || ""} onChange={(event) => setState((current) => updateMonthlyIncome(current, scope, Number(event.target.value) || 0))} placeholder="0,00" className={input} /></div>
        <div className={card}><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nova despesa</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Classifique para acompanhar melhor.</p></div><CirclePlus className="h-5 w-5 text-emerald-600" /></div>
          <form onSubmit={add} className="mt-5 space-y-3"><Field label="Nome"><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Aluguel" className={input} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Categoria"><input required list="categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Selecione" className={input} /><datalist id="categories">{allCategories.map((category) => <option key={category} value={category} />)}</datalist></Field><Field label="Tipo"><select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ExpenseKind })} className={input}><option value="fixed">Fixa</option><option value="installment">Parcelada</option></select></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Valor"><input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0,00" className={input} /></Field>{draft.kind === "fixed" ? <Field label="Vencimento"><input type="number" min="1" max="31" value={draft.dueDay} onChange={(e) => setDraft({ ...draft, dueDay: e.target.value })} className={input} /></Field> : <Field label="Início"><input type="month" value={draft.startMonth} onChange={(e) => isValidMonthKey(e.target.value) && setDraft({ ...draft, startMonth: e.target.value })} className={input} /></Field>}</div>{draft.kind === "installment" && <Field label="Última parcela"><input type="month" value={draft.endMonth} onChange={(e) => isValidMonthKey(e.target.value) && setDraft({ ...draft, endMonth: e.target.value })} className={input} /></Field>}<Field label="Observações (opcional)"><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} className={input} /></Field><button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"><CirclePlus className="h-4 w-4" />Adicionar despesa</button></form></div>
        <div className={card}><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Dados</p><div className="mt-3 grid gap-2"><button onClick={exportData} className="secondary"><Download className="h-4 w-4" />Exportar backup</button><button onClick={() => importRef.current?.click()} className="secondary"><FileUp className="h-4 w-4" />Importar backup</button><input ref={importRef} type="file" accept="application/json" onChange={importData} className="hidden" /><button onClick={() => window.confirm("Limpar todos os lançamentos desta área?") && update((current) => resetScope(current, scope), "Área limpa.")} className="secondary text-rose-700 dark:text-rose-300"><RotateCcw className="h-4 w-4" />Limpar área</button></div></div>
      </aside>
      <main className="space-y-6">
        <div className={card}><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Visão por categoria</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A distribuição das despesas de {monthLabel(month).toLowerCase()}.</p></div><WalletCards className="h-5 w-5 text-slate-400" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).map(([category, total]) => <button key={category} onClick={() => setFilters((current) => ({ ...current, category }))} className="rounded-xl bg-slate-50 p-3 text-left transition hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950"><p className="truncate text-xs text-slate-500 dark:text-slate-400">{category}</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(total)}</p></button>)}{!entries.length && <p className="text-sm text-slate-500 dark:text-slate-400">Adicione despesas para visualizar suas categorias.</p>}</div></div>
        <div className={card}><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Lançamentos</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{visible.length} item(ns) em {Object.keys(grouped).length} categoria(s).</p></div><div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CalendarDays className="h-4 w-4" />{monthLabel(month)}</div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Field label="Buscar"><div className="relative"><Search className="absolute left-3 top-4 h-4 w-4 text-slate-400" /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Nome ou nota" className={`${input} pl-9`} /></div></Field><Select label="Status" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value as FilterStatus })} options={[["all", "Todos"], ["open", "Em aberto"], ["paid", "Pagos"], ["overdue", "Atrasados"]]} /><Select label="Categoria" value={filters.category} onChange={(value) => setFilters({ ...filters, category: value })} options={[["all", "Todas"], ...categories.map((category) => [category, category])]} /><Select label="Ordenar" value={filters.sort} onChange={(value) => setFilters({ ...filters, sort: value as SortMode })} options={[["due", "Vencimento"], ["amount", "Maior valor"], ["name", "Nome"]]} /></div>
          <div className="mt-4 flex gap-2"><button onClick={() => setFilters({ search: "", kind: "all", status: "all", category: "all", sort: "due" })} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300">Limpar filtros</button><span className="text-slate-300 dark:text-slate-700">•</span><button onClick={() => setFilters((current) => ({ ...current, kind: current.kind === "fixed" ? "all" : "fixed" }))} className={`text-xs font-medium ${filters.kind === "fixed" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>Somente fixas</button></div>
          <div className="mt-5 space-y-6">{Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b, "pt-BR")).map(([category, items]) => <section key={category}><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{category}</h2><span className="text-xs text-slate-400">{items.length} item(ns)</span></div><div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">{items.map((entry) => <EntryRow key={`${entry.id}-${entry.month}`} entry={entry} onToggle={() => update((current) => toggleExpensePaidMonth(current, scope, entry.id, month), entry.paid ? "Pagamento desfeito." : "Pagamento confirmado.")} onDelete={() => window.confirm(`Excluir “${entry.name}”?`) && update((current) => deleteExpense(current, scope, entry.id), "Despesa excluída.")} />)}</div></section>)}{!visible.length && <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400"><Filter className="mx-auto mb-3 h-5 w-5" />Nenhum lançamento encontrado para estes filtros.</div>}</div>
        </div>
      </main>
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">{label}{children}</label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <Field label={label}><div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className={`${input} appearance-none pr-8`}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-4 h-4 w-4 text-slate-400" /></div></Field>; }
function EntryRow({ entry, onToggle, onDelete }: { entry: MonthlyEntry; onToggle: () => void; onDelete: () => void }) { const [label, tone] = status(entry); return <article className="flex flex-col gap-3 border-b border-slate-200 p-4 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-slate-900 dark:text-white">{entry.name}</h3><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>{entry.kind === "installment" && <span className="text-xs text-slate-500 dark:text-slate-400">{entry.installmentNumber}/{entry.installmentTotal}</span>}</div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Vence dia {entry.dueDay ?? "—"} · {entry.kind === "fixed" ? "Recorrente" : "Parcelada"}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(valueOf(entry))}</p><button onClick={onToggle} className={`rounded-lg px-3 py-2 text-xs font-medium ${entry.paid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-900 text-white dark:bg-white dark:text-slate-950"}`}>{entry.paid ? "Desfazer" : "Pagar"}</button><button onClick={onDelete} aria-label={`Excluir ${entry.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button></div></article>; }
