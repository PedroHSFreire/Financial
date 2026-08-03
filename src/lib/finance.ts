export type ScopeKey = "personal" | "business";

export type ExpenseKind = "fixed" | "installment";

export type FilterStatus = "all" | "paid" | "open" | "overdue";

export type FilterKind = "all" | ExpenseKind;

export type SortMode = "due" | "amount" | "name";

export type MonthKey = `${number}-${string}`;

export interface ExpenseRecord {
  id: string;
  kind: ExpenseKind;
  name: string;
  category: string;
  amount: number;
  dueDay: number | null;
  startMonth: MonthKey | null;
  endMonth: MonthKey | null;
  notes: string;
  paidMonths: MonthKey[];
  createdAt: string;
}

export interface ScopeState {
  title: string;
  monthlyIncome: number;
  expenses: ExpenseRecord[];
}

export interface FinanceState {
  version: 1;
  scopes: Record<ScopeKey, ScopeState>;
}

export interface ExpenseDraft {
  name: string;
  category: string;
  amount: string;
  kind: ExpenseKind;
  dueDay: string;
  startMonth: MonthKey;
  endMonth: MonthKey;
  notes: string;
}

export interface MonthlyEntry {
  id: string;
  kind: ExpenseKind;
  name: string;
  category: string;
  amount: number;
  dueDay: number | null;
  startMonth: MonthKey | null;
  endMonth: MonthKey | null;
  notes: string;
  paidMonths: MonthKey[];
  createdAt: string;
  month: MonthKey;
  paid: boolean;
  overdue: boolean;
  dueDate: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentValue: number | null;
}

export interface MonthlySummary {
  income: number;
  forecast: number;
  paid: number;
  pending: number;
  overdue: number;
  balanceForecast: number;
  balanceRealized: number;
  paidCount: number;
  openCount: number;
  overdueCount: number;
  fixedCount: number;
  installmentCount: number;
}

export const STORAGE_KEY = "finance-manager:v1";

export const DEFAULT_CATEGORIES = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Assinaturas",
  "Lazer",
  "Trabalho",
  "Impostos",
  "Outros",
] as const;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0);
}

export function isValidMonthKey(value: string | undefined | null): value is MonthKey {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}$/.test(value);
}

export function getCurrentMonthKey(date = new Date()): MonthKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}` as MonthKey;
}

export function addMonths(monthKey: MonthKey, offset: number): MonthKey {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const next = new Date(year, monthIndex + offset, 1);
  return getMonthKey(next);
}

export function getMonthKey(date: Date): MonthKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}` as MonthKey;
}

export function parseMonthKey(monthKey: MonthKey) {
  const [yearPart, monthPart] = monthKey.split("-");
  return {
    year: Number(yearPart),
    monthIndex: Number(monthPart) - 1,
  };
}

export function monthToDate(monthKey: MonthKey, day = 1) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return new Date(year, monthIndex, day);
}

export function monthLabel(monthKey: MonthKey) {
  const date = monthToDate(monthKey, 1);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthShortLabel(monthKey: MonthKey) {
  const date = monthToDate(monthKey, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function clampDayToMonth(monthKey: MonthKey, day: number) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.max(1, Math.min(day, lastDay));
}

export function monthDifference(start: MonthKey, end: MonthKey) {
  const startDate = monthToDate(start);
  const endDate = monthToDate(end);
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  );
}

export function isMonthWithinRange(
  month: MonthKey,
  startMonth: MonthKey,
  endMonth: MonthKey,
) {
  return monthDifference(startMonth, month) >= 0 && monthDifference(month, endMonth) >= 0;
}

export function rangeMonthCount(startMonth: MonthKey, endMonth: MonthKey) {
  return monthDifference(startMonth, endMonth) + 1;
}

export function getScopeTitle(scope: ScopeKey) {
  return scope === "personal" ? "Gestão pessoal" : "Gestão empresarial";
}

export function createEmptyScope(scope: ScopeKey): ScopeState {
  return {
    title: getScopeTitle(scope),
    monthlyIncome: 0,
    expenses: [],
  };
}

export function createDefaultState(): FinanceState {
  return {
    version: 1,
    scopes: {
      personal: createEmptyScope("personal"),
      business: createEmptyScope("business"),
    },
  };
}

function isExpenseKind(value: unknown): value is ExpenseKind {
  return value === "fixed" || value === "installment";
}

function normalizeExpense(value: unknown): ExpenseRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ExpenseRecord>;

  if (
    typeof candidate.id !== "string" ||
    !isExpenseKind(candidate.kind) ||
    typeof candidate.name !== "string" ||
    typeof candidate.category !== "string" ||
    typeof candidate.amount !== "number" ||
    typeof candidate.notes !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  const paidMonths = Array.isArray(candidate.paidMonths)
    ? candidate.paidMonths.filter((month): month is MonthKey => isValidMonthKey(month))
    : [];

  return {
    id: candidate.id,
    kind: candidate.kind,
    name: candidate.name,
    category: candidate.category,
    amount: candidate.amount,
    dueDay:
      typeof candidate.dueDay === "number" && Number.isFinite(candidate.dueDay)
        ? candidate.dueDay
        : null,
    startMonth: isValidMonthKey(candidate.startMonth) ? candidate.startMonth : null,
    endMonth: isValidMonthKey(candidate.endMonth) ? candidate.endMonth : null,
    notes: candidate.notes,
    paidMonths,
    createdAt: candidate.createdAt,
  };
}

function normalizeScope(scope: ScopeKey, value: unknown): ScopeState {
  const fallback = createEmptyScope(scope);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<ScopeState>;

  const expenses = Array.isArray(candidate.expenses)
    ? candidate.expenses
        .map(normalizeExpense)
        .filter((item): item is ExpenseRecord => item !== null)
    : [];

  return {
    title:
      typeof candidate.title === "string" && candidate.title.trim().length > 0
        ? candidate.title
        : fallback.title,
    monthlyIncome:
      typeof candidate.monthlyIncome === "number" && Number.isFinite(candidate.monthlyIncome)
        ? candidate.monthlyIncome
        : 0,
    expenses,
  };
}

export function normalizeState(value: unknown): FinanceState {
  if (!value || typeof value !== "object") {
    return createDefaultState();
  }

  const candidate = value as Partial<FinanceState>;

  return {
    version: 1,
    scopes: {
      personal: normalizeScope("personal", candidate.scopes?.personal),
      business: normalizeScope("business", candidate.scopes?.business),
    },
  };
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function updateMonthlyIncome(
  state: FinanceState,
  scope: ScopeKey,
  monthlyIncome: number,
) {
  return {
    ...state,
    scopes: {
      ...state.scopes,
      [scope]: {
        ...state.scopes[scope],
        monthlyIncome,
      },
    },
  };
}

export function addExpense(
  state: FinanceState,
  scope: ScopeKey,
  draft: ExpenseDraft,
) {
  const amount = Number(draft.amount);
  const dueDay = draft.kind === "fixed" ? Number(draft.dueDay) : null;
  const startMonth = draft.kind === "installment" ? draft.startMonth : null;
  const endMonth = draft.kind === "installment" ? draft.endMonth : null;
  const expense: ExpenseRecord = {
    id: createId("expense"),
    kind: draft.kind,
    name: draft.name.trim(),
    category: draft.category.trim(),
    amount,
    dueDay: Number.isFinite(dueDay ?? NaN) ? (dueDay as number) : null,
    startMonth,
    endMonth,
    notes: draft.notes.trim(),
    paidMonths: [],
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    scopes: {
      ...state.scopes,
      [scope]: {
        ...state.scopes[scope],
        expenses: [expense, ...state.scopes[scope].expenses],
      },
    },
  };
}

export function deleteExpense(state: FinanceState, scope: ScopeKey, expenseId: string) {
  return {
    ...state,
    scopes: {
      ...state.scopes,
      [scope]: {
        ...state.scopes[scope],
        expenses: state.scopes[scope].expenses.filter((expense) => expense.id !== expenseId),
      },
    },
  };
}

export function toggleExpensePaidMonth(
  state: FinanceState,
  scope: ScopeKey,
  expenseId: string,
  month: MonthKey,
) {
  return {
    ...state,
    scopes: {
      ...state.scopes,
      [scope]: {
        ...state.scopes[scope],
        expenses: state.scopes[scope].expenses.map((expense) => {
          if (expense.id !== expenseId) {
            return expense;
          }

          const hasMonth = expense.paidMonths.includes(month);
          return {
            ...expense,
            paidMonths: hasMonth
              ? expense.paidMonths.filter((item) => item !== month)
              : [...expense.paidMonths, month].sort(),
          };
        }),
      },
    },
  };
}

export function resetScope(state: FinanceState, scope: ScopeKey) {
  return {
    ...state,
    scopes: {
      ...state.scopes,
      [scope]: createEmptyScope(scope),
    },
  };
}

function buildDueDate(month: MonthKey, dueDay: number | null) {
  const { year, monthIndex } = parseMonthKey(month);
  if (!dueDay) {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const date = new Date(year, monthIndex, lastDay);
    return date.toISOString().slice(0, 10);
  }

  const safeDay = clampDayToMonth(month, dueDay);
  const date = new Date(year, monthIndex, safeDay);

  return date.toISOString().slice(0, 10);
}

function getEntryPaymentStatus(entry: MonthlyEntry, currentDate: Date) {
  const entryDate = new Date(`${entry.dueDate}T23:59:59`);
  const currentMonth = getMonthKey(currentDate);
  const entryMonth = entry.month;

  // Apenas meses passados ou uma data de vencimento já ultrapassada no mês atual
  // podem ficar atrasados. Meses futuros continuam pendentes, mesmo que a despesa
  // seja recorrente e já apareça antecipadamente na lista.
  return (
    !entry.paid &&
    (monthDifference(entryMonth, currentMonth) > 0 ||
      (entryMonth === currentMonth && currentDate > entryDate))
  );
}

function buildFixedEntry(expense: ExpenseRecord, month: MonthKey, currentDate: Date): MonthlyEntry {
  const dueDate = buildDueDate(month, expense.dueDay);
  const paid = expense.paidMonths.includes(month);
  const entry: MonthlyEntry = {
    ...expense,
    month,
    paid,
    overdue: false,
    dueDate,
    installmentNumber: null,
    installmentTotal: null,
    installmentValue: null,
  };

  return {
    ...entry,
    overdue: getEntryPaymentStatus(entry, currentDate),
  };
}

function buildInstallmentEntry(
  expense: ExpenseRecord,
  month: MonthKey,
  currentDate: Date,
): MonthlyEntry | null {
  if (!expense.startMonth || !expense.endMonth || !isMonthWithinRange(month, expense.startMonth, expense.endMonth)) {
    return null;
  }

  const totalInstallments = rangeMonthCount(expense.startMonth, expense.endMonth);
  const installmentNumber = monthDifference(expense.startMonth, month) + 1;
  const installmentValue = expense.amount / totalInstallments;
  const dueDate = buildDueDate(month, expense.dueDay);
  const paid = expense.paidMonths.includes(month);
  const entry: MonthlyEntry = {
    ...expense,
    month,
    paid,
    overdue: false,
    dueDate,
    installmentNumber,
    installmentTotal: totalInstallments,
    installmentValue,
  };

  return {
    ...entry,
    overdue: getEntryPaymentStatus(entry, currentDate),
  };
}

export function buildMonthlyEntries(
  state: FinanceState,
  scope: ScopeKey,
  month: MonthKey,
  currentDate = new Date(),
) {
  return state.scopes[scope].expenses
    .flatMap((expense) => {
      if (expense.kind === "fixed") {
        return [buildFixedEntry(expense, month, currentDate)];
      }

      const entry = buildInstallmentEntry(expense, month, currentDate);
      return entry ? [entry] : [];
    })
    .sort((left, right) => {
      const leftOrder = left.dueDay ?? 0;
      const rightOrder = right.dueDay ?? 0;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      if (left.kind !== right.kind) {
        return left.kind === "fixed" ? -1 : 1;
      }

      return left.name.localeCompare(right.name, "pt-BR");
    });
}

export function summarizeEntries(entries: MonthlyEntry[], income: number): MonthlySummary {
  const forecast = entries.reduce((total, entry) => {
    if (entry.kind === "installment") {
      return total + (entry.installmentValue ?? entry.amount);
    }

    return total + entry.amount;
  }, 0);

  const paid = entries.reduce((total, entry) => {
    if (!entry.paid) {
      return total;
    }

    if (entry.kind === "installment") {
      return total + (entry.installmentValue ?? entry.amount);
    }

    return total + entry.amount;
  }, 0);

  const overdue = entries.reduce((total, entry) => {
    if (!entry.overdue) {
      return total;
    }

    if (entry.kind === "installment") {
      return total + (entry.installmentValue ?? entry.amount);
    }

    return total + entry.amount;
  }, 0);

  return {
    income,
    forecast,
    paid,
    pending: Math.max(0, forecast - paid),
    overdue,
    balanceForecast: income - forecast,
    balanceRealized: income - paid,
    paidCount: entries.filter((entry) => entry.paid).length,
    openCount: entries.filter((entry) => !entry.paid).length,
    overdueCount: entries.filter((entry) => entry.overdue).length,
    fixedCount: entries.filter((entry) => entry.kind === "fixed").length,
    installmentCount: entries.filter((entry) => entry.kind === "installment").length,
  };
}

export function getExpenseCategories(state: FinanceState, scope: ScopeKey) {
  const categories = new Set<string>();

  for (const expense of state.scopes[scope].expenses) {
    if (expense.category.trim()) {
      categories.add(expense.category.trim());
    }
  }

  return Array.from(categories).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

export function monthToInputValue(monthKey: MonthKey) {
  return monthKey;
}

export function nextMonth(monthKey: MonthKey) {
  return addMonths(monthKey, 1);
}
