"use client";

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChartColumnBig,
  CirclePlus,
  Download,
  FileUp,
  Filter,
  RotateCcw,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  addExpense,
  addMonths,
  buildMonthlyEntries,
  createDefaultState,
  deleteExpense,
  formatCurrency,
  getExpenseCategories,
  getScopeTitle,
  isValidMonthKey,
  monthLabel,
  nextMonth,
  normalizeState,
  resetScope,
  STORAGE_KEY,
  summarizeEntries,
  toggleExpensePaidMonth,
  updateMonthlyIncome,
  type ExpenseDraft,
  type ExpenseKind,
  type FilterKind,
  type FilterStatus,
  type FinanceState,
  type MonthKey,
  type MonthlyEntry,
  type ScopeKey,
  type SortMode,
} from "@/lib/finance";

type FinanceDashboardProps = {
  scope: ScopeKey;
  initialMonth: MonthKey;
};

type DraftState = ExpenseDraft;

type FilterState = {
  search: string;
  kind: FilterKind;
  status: FilterStatus;
  category: string;
  sort: SortMode;
};

const panelClass =
  "rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.45)] backdrop-blur-xl";

const statClass =
  "rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm";

function createDraft(month: MonthKey): DraftState {
  return {
    name: "",
    category: "",
    amount: "",
    kind: "fixed",
    dueDay: "5",
    startMonth: month,
    endMonth: nextMonth(month),
    notes: "",
  };
}

function entryValue(entry: MonthlyEntry) {
  return entry.kind === "installment"
    ? entry.installmentValue ?? entry.amount
    : entry.amount;
}

function sortEntries(entries: MonthlyEntry[], sort: SortMode) {
  const copy = [...entries];

  if (sort === "amount") {
    return copy.sort(
      (left, right) =>
        entryValue(right) - entryValue(left) || left.name.localeCompare(right.name, "pt-BR"),
    );
  }

  if (sort === "name") {
    return copy.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }

  return copy.sort(
    (left, right) =>
      (left.dueDay ?? 99) - (right.dueDay ?? 99) ||
      entryValue(right) - entryValue(left) ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
}

function statusLabel(entry: MonthlyEntry) {
  if (entry.paid) {
    return {
      text: "Pago",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (entry.overdue) {
    return {
      text: "Atrasado",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    text: "Pendente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function cardIcon(kind: ExpenseKind) {
  return kind === "fixed" ? WalletCards : ChartColumnBig;
}

export function FinanceDashboard({ scope, initialMonth }: FinanceDashboardProps) {
  const [state, setState] = useState<FinanceState>(() => createDefaultState());
  const [month, setMonth] = useState<MonthKey>(initialMonth);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(initialMonth));
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    kind: "all",
    status: "all",
    category: "all",
    sort: "due",
  });
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(filters.search);
  const scopeLabel = getScopeTitle(scope);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const rawLocal = window.localStorage.getItem(STORAGE_KEY);
        if (rawLocal) {
          const parsedLocal = normalizeState(JSON.parse(rawLocal));
          if (!cancelled) {
            setState(parsedLocal);
            setReady(true);
            return;
          }
        }
      } catch {
        // Ignore local storage corruption and fall back to the server snapshot.
      }

      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (response.ok) {
          const serverState = normalizeState(await response.json());
          if (!cancelled) {
            setState(serverState);
          }
        }
      } catch {
        // The app still works locally even if the optional server backup is unavailable.
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Browser storage can fail in private mode or when quota is exceeded.
    }

    void fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(state),
    }).catch(() => {
      // Optional server backup only.
    });
  }, [ready, state]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const scopeState = state.scopes[scope];
  const currentEntries = buildMonthlyEntries(state, scope, month);
  const nextEntries = buildMonthlyEntries(state, scope, nextMonth(month));
  const summary = summarizeEntries(currentEntries, scopeState.monthlyIncome);
  const nextSummary = summarizeEntries(nextEntries, scopeState.monthlyIncome);
  const categories = getExpenseCategories(state, scope);
  const filteredEntries = sortEntries(
    currentEntries.filter((entry) => {
      const search = deferredSearch.trim().toLowerCase();
      const matchesSearch =
        search.length === 0 ||
        entry.name.toLowerCase().includes(search) ||
        entry.category.toLowerCase().includes(search) ||
        entry.notes.toLowerCase().includes(search) ||
        formatCurrency(entryValue(entry)).toLowerCase().includes(search);

      const matchesKind = filters.kind === "all" || entry.kind === filters.kind;
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "paid" && entry.paid) ||
        (filters.status === "open" && !entry.paid) ||
        (filters.status === "overdue" && entry.overdue);
      const matchesCategory = filters.category === "all" || entry.category === filters.category;

      return matchesSearch && matchesKind && matchesStatus && matchesCategory;
    }),
    filters.sort,
  );

  const handleStateUpdate = (
    updater: (current: FinanceState) => FinanceState,
    notice?: string,
  ) => {
    setState((current) => updater(current));
    if (notice) {
      setFeedback(notice);
    }
  };

  const handleDraftChange = (field: keyof DraftState, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAddExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = draft.name.trim();
    const category = draft.category.trim();
    const amount = Number(draft.amount);
    const dueDay = Number(draft.dueDay);

    if (!name || !category || !Number.isFinite(amount) || amount <= 0) {
      setFeedback("Preencha nome, categoria e valor antes de salvar.");
      return;
    }

    if (draft.kind === "fixed" && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
      setFeedback("Para despesa fixa, informe um dia de vencimento entre 1 e 31.");
      return;
    }

    const startBeforeEnd =
      isValidMonthKey(draft.startMonth) &&
      isValidMonthKey(draft.endMonth) &&
      draft.startMonth <= draft.endMonth;

    handleStateUpdate(
      (current) =>
        addExpense(current, scope, {
          ...draft,
          name,
          category,
          amount: draft.amount,
          kind: draft.kind,
          dueDay: draft.kind === "fixed" ? draft.dueDay : "0",
          startMonth: startBeforeEnd ? draft.startMonth : draft.endMonth,
          endMonth: startBeforeEnd ? draft.endMonth : draft.startMonth,
          notes: draft.notes,
        }),
      "Despesa adicionada.",
    );

    setDraft(createDraft(month));
  };

  const handleTogglePaid = (expenseId: string) => {
    handleStateUpdate(
      (current) => toggleExpensePaidMonth(current, scope, expenseId, month),
      "Status atualizado para o mês selecionado.",
    );
  };

  const handleDelete = (expenseId: string) => {
    const confirmed = window.confirm("Remover esta despesa deste painel?");
    if (!confirmed) {
      return;
    }

    handleStateUpdate(
      (current) => deleteExpense(current, scope, expenseId),
      "Despesa removida.",
    );
  };

  const handleIncomeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setState((current) => updateMonthlyIncome(current, scope, Number.isFinite(value) ? value : 0));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `finance-manager-${scope}-${month}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback("Backup exportado em JSON.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = normalizeState(JSON.parse(text));
      setState(parsed);
      setFeedback("Backup importado com sucesso.");
    } catch {
      setFeedback("Não consegui ler esse arquivo de backup.");
    }
  };

  const handleResetScope = () => {
    const confirmed = window.confirm(
      `Isso vai limpar toda a área de ${scopeLabel.toLowerCase()}. Deseja continuar?`,
    );
    if (!confirmed) {
      return;
    }

    handleStateUpdate((current) => resetScope(current, scope), "Área redefinida.");
    setDraft(createDraft(month));
  };

  const metricCards = [
    {
      label: "Receita do mês",
      value: formatCurrency(summary.income),
      helper: scope === "personal" ? "Renda disponível" : "Faturamento previsto",
      icon: Banknote,
      tone: "from-sky-500 to-cyan-500",
    },
    {
      label: "Despesas previstas",
      value: formatCurrency(summary.forecast),
      helper: `${currentEntries.length} itens na planilha`,
      icon: TrendingUp,
      tone: "from-amber-500 to-orange-500",
    },
    {
      label: "Já pagas",
      value: formatCurrency(summary.paid),
      helper: `${summary.paidCount} confirmadas`,
      icon: BadgeCheck,
      tone: "from-emerald-500 to-teal-500",
    },
    {
      label: "Pendentes",
      value: formatCurrency(summary.pending),
      helper: `${summary.openCount} em aberto`,
      icon: TrendingDown,
      tone: "from-rose-500 to-pink-500",
    },
  ] as const;

  const nextMonthLabel = monthLabel(nextMonth(month));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-slate-950 p-6 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)] sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100">
              <Sparkline />
              {scopeLabel}
            </div>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-300">
                Planejamento financeiro mensal
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                Controle despesas fixas, parcelas e saldo do mês sem planilha pesada.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Marque como pago, acompanhe o próximo mês automaticamente e filtre por
                status, categoria e tipo sem sair desta página.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setMonth((current) => addMonths(current, -1))}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Mês anterior
              </button>
              <label className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white">
                <span>Mês</span>
                <input
                  type="month"
                  value={month}
                  onChange={(event) => {
                    if (isValidMonthKey(event.target.value)) {
                      setMonth(event.target.value);
                    }
                  }}
                  className="rounded-full border-0 bg-transparent px-2 py-0 text-sm text-white outline-none [color-scheme:dark]"
                />
              </label>
              <button
                type="button"
                onClick={() => setMonth((current) => addMonths(current, 1))}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Próximo mês
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                Exibindo {monthLabel(month)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5">
              <p className="text-sm text-slate-300">Próximo mês</p>
              <p className="mt-2 text-3xl font-semibold">{monthLabel(nextMonth(month))}</p>
              <p className="mt-2 text-sm text-slate-300">
                {nextEntries.length} lançamentos previstos, sendo{" "}
                <strong className="text-white">{nextSummary.openCount}</strong> ainda em aberto.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5">
              <p className="text-sm text-slate-300">Balanço rápido</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">Saldo projetado</p>
                  <p className="text-3xl font-semibold">{formatCurrency(summary.balanceForecast)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <ChartColumnBig className="h-6 w-6 text-cyan-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.label} className={statClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</p>
                </div>
                <div className={`rounded-2xl bg-gradient-to-br p-3 text-white ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">{card.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className={panelClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                  Receita
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Receita / faturamento mensal
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <Banknote className="h-5 w-5" />
              </div>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-600">
              Valor mensal
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={scopeState.monthlyIncome || ""}
              onChange={handleIncomeChange}
              placeholder="0,00"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <p className="mt-3 text-sm text-slate-500">
              Esse valor serve para comparar o que entra com o que sai.
            </p>
          </div>

          <div className={panelClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                  Nova despesa
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Adicionar despesa fixa ou parcelada
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <CirclePlus className="h-5 w-5" />
              </div>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleAddExpense}>
              <div>
                <label className="text-sm font-medium text-slate-600">Nome</label>
                <input
                  value={draft.name}
                  onChange={(event) => handleDraftChange("name", event.target.value)}
                  placeholder="Ex.: aluguel, internet, notebook"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Categoria</label>
                  <input
                    value={draft.category}
                    onChange={(event) => handleDraftChange("category", event.target.value)}
                    placeholder="Moradia, serviço, compra..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Tipo</label>
                  <select
                    value={draft.kind}
                    onChange={(event) => {
                      const kind = event.target.value as ExpenseKind;
                      setDraft((current) => ({
                        ...current,
                        kind,
                        dueDay: kind === "fixed" ? current.dueDay || "5" : current.dueDay,
                      }));
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="fixed">Despesa fixa</option>
                    <option value="installment">Compra parcelada</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Valor</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.amount}
                    onChange={(event) => handleDraftChange("amount", event.target.value)}
                    placeholder="0,00"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {draft.kind === "fixed" ? (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Dia de vencimento
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={draft.dueDay}
                      onChange={(event) => handleDraftChange("dueDay", event.target.value)}
                      placeholder="5"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Mês inicial</label>
                      <input
                        type="month"
                        value={draft.startMonth}
                        onChange={(event) => {
                          if (isValidMonthKey(event.target.value)) {
                            handleDraftChange("startMonth", event.target.value);
                          }
                        }}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Mês final</label>
                      <input
                        type="month"
                        value={draft.endMonth}
                        onChange={(event) => {
                          if (isValidMonthKey(event.target.value)) {
                            handleDraftChange("endMonth", event.target.value);
                          }
                        }}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Observações</label>
                <textarea
                  value={draft.notes}
                  onChange={(event) => handleDraftChange("notes", event.target.value)}
                  placeholder="Opcional: contrato, forma de pagamento, alerta..."
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
              >
                <CirclePlus className="h-4 w-4" />
                Salvar despesa
              </button>
            </form>
          </div>

          <div className={panelClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                  Backup
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Exportar ou importar seus dados
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <FileUp className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Baixar backup JSON
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <FileUp className="h-4 w-4" />
                Importar backup JSON
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleResetScope}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-medium text-rose-700 transition hover:bg-rose-100"
              >
                <RotateCcw className="h-4 w-4" />
                Limpar esta página
              </button>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <div className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                  Filtros
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Refine a planilha do mês
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <Filter className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <label className="text-sm font-medium text-slate-600">Buscar</label>
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  placeholder="Nome, categoria, observações..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Tipo</label>
                <select
                  value={filters.kind}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      kind: event.target.value as FilterKind,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="all">Todos</option>
                  <option value="fixed">Fixas</option>
                  <option value="installment">Parceladas</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Status</label>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as FilterStatus,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="all">Todos</option>
                  <option value="open">Em aberto</option>
                  <option value="paid">Pagos</option>
                  <option value="overdue">Atrasados</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Categoria</label>
                <select
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({ search: "", kind: "all", status: "all", category: "all", sort: "due" })}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  Limpar filtros
                </button>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                  {filteredEntries.length} resultado(s)
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Ordenar por</label>
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      sort: event.target.value as SortMode,
                    }))
                  }
                  className="ml-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="due">Vencimento</option>
                  <option value="amount">Valor</option>
                  <option value="name">Nome</option>
                </select>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                  Balanço
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  O que entra, o que sai e o que sobra
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <ChartColumnBig className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Saldo realizado</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatCurrency(summary.balanceRealized)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Receita menos o que já está pago
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Saldo projetado</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatCurrency(summary.balanceForecast)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Considera tudo que está previsto no mês
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Atrasado</p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">
                  {formatCurrency(summary.overdue)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {summary.overdueCount} item(ns) fora do prazo
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Mês anterior / próximo</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {monthLabel(addMonths(month, -1))} / {nextMonthLabel}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Fixo continua e parcela avança automaticamente
                </p>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                  Lançamentos
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Lista do mês selecionado
                </h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                {monthLabel(month)} · {filteredEntries.length} visíveis
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {filteredEntries.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <ShieldAlert className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-4 text-lg font-semibold text-slate-950">
                    Nada para mostrar neste filtro.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Tente limpar os filtros ou adicionar a primeira despesa.
                  </p>
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const status = statusLabel(entry);
                  const Icon = cardIcon(entry.kind);

                  return (
                    <article
                      key={`${entry.id}-${entry.month}`}
                      className={`rounded-3xl border p-5 transition ${
                        entry.overdue
                          ? "border-rose-200 bg-rose-50/70"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
                              <Icon className="h-3.5 w-3.5" />
                              {entry.kind === "fixed" ? "Fixa" : "Parcelada"}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
                              {status.text}
                            </span>
                            {entry.kind === "installment" ? (
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                Parcela {entry.installmentNumber}/{entry.installmentTotal}
                              </span>
                            ) : null}
                          </div>

                          <div>
                            <h3 className="text-xl font-semibold text-slate-950">{entry.name}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {entry.category}
                              {entry.notes ? ` · ${entry.notes}` : ""}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                              Vencimento: {entry.dueDate}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                              Valor:{" "}
                              {formatCurrency(
                                entry.kind === "installment"
                                  ? entry.installmentValue ?? entry.amount
                                  : entry.amount,
                              )}
                            </span>
                            {entry.kind === "fixed" ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                Recorrente mensal
                              </span>
                            ) : (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                {entry.startMonth} até {entry.endMonth}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
                          <button
                            type="button"
                            onClick={() => handleTogglePaid(entry.id)}
                            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                              entry.paid
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border border-slate-200 bg-slate-950 text-white hover:bg-slate-800"
                            }`}
                          >
                            <BadgeCheck className="h-4 w-4" />
                            {entry.paid ? "Desfazer pagamento" : "Marcar como pago"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}

function Sparkline() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.8)]" />
    </span>
  );
}
