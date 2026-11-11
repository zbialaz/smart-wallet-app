import { addMonths, toYearMonth, type ISODate, type YearMonth } from '@/shared/date';
import { Money } from '@/shared/money';
import type { TransactionType } from '@/shared/transaction-type';

import type { Transaction } from './transaction';

/**
 * US-006 — Transações recorrentes mensais.
 *
 * Cada `RecurringRule` define um lançamento mensal automático no dia `dayOfMonth` (1..31).
 * `generatedMonths` guarda os meses (`YYYY-MM`) já gerados para garantir idempotência
 * (abrir o app 10 vezes no mesmo dia cria a transação apenas 1 vez).
 */
export interface RecurringRule {
  id: string;
  type: TransactionType;
  amountCents: number;
  description: string | null;
  categoryId: string;
  accountId: string;
  /** Dia do mês (1 a 31). Em meses mais curtos (ex.: fevereiro), ajusta para o último dia do mês. */
  dayOfMonth: number;
  active: boolean;
  generatedMonths: YearMonth[];
  createdAt: string;
}

export function normalizeDayOfMonth(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(31, Math.max(1, Math.trunc(day)));
}

/** Quantos dias tem o mês `YYYY-MM`. */
export function daysInMonth(month: YearMonth): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Data `YYYY-MM-DD` em que a recorrência vence dentro de `month`. */
export function dueDateForMonth(month: YearMonth, dayOfMonth: number): ISODate {
  const clamped = Math.min(normalizeDayOfMonth(dayOfMonth), daysInMonth(month));
  const dd = String(clamped).padStart(2, '0');
  return `${month}-${dd}` as ISODate;
}

/** Extrai o dia (1..31) de uma data `YYYY-MM-DD`. */
export function dayFromISODate(date: ISODate): number {
  const parts = date.split('-');
  const day = Number(parts[2]);
  return normalizeDayOfMonth(day);
}

/**
 * US-006.2: verifica quais regras recorrentes ativas já atingiram o dia programado
 * em `targetMonth` (isto é, `dueDate <= today`) e ainda não foram geradas naquele mês.
 */
export function materializeDueRecurringTransactions(params: {
  rules: RecurringRule[];
  targetMonth: YearMonth;
  today: ISODate;
  idGenerator: () => string;
  now: string;
}): {
  transactionsToInsert: Transaction[];
  updatedRules: RecurringRule[];
  changed: boolean;
} {
  const { rules, targetMonth, today, idGenerator, now } = params;
  const transactionsToInsert: Transaction[] = [];
  let changed = false;

  const updatedRules = rules.map((rule) => {
    if (!rule.active) return rule;
    if (rule.generatedMonths.includes(targetMonth)) return rule;

    const dueDate = dueDateForMonth(targetMonth, rule.dayOfMonth);
    if (dueDate > today) return rule;

    const tx: Transaction = {
      id: idGenerator(),
      type: rule.type,
      amount: Money.fromCents(rule.amountCents),
      description: rule.description,
      categoryId: rule.categoryId,
      accountId: rule.accountId,
      date: dueDate,
      createdAt: now,
      updatedAt: now,
    };
    transactionsToInsert.push(tx);
    changed = true;

    return {
      ...rule,
      generatedMonths: [...rule.generatedMonths, targetMonth],
    };
  });

  return { transactionsToInsert, updatedRules, changed };
}

/** US-006.3: ativa ou pausa uma regra recorrente. */
export function toggleRecurringRule(
  rules: RecurringRule[],
  ruleId: string,
  active: boolean,
): RecurringRule[] {
  return rules.map((r) => (r.id === ruleId ? { ...r, active } : r));
}

export function removeRecurringRule(rules: RecurringRule[], ruleId: string): RecurringRule[] {
  return rules.filter((r) => r.id !== ruleId);
}

export function parseRecurringRules(raw: string | null | undefined): RecurringRule[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecurringRule =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as RecurringRule).id === 'string' &&
        typeof (item as RecurringRule).amountCents === 'number' &&
        typeof (item as RecurringRule).dayOfMonth === 'number' &&
        typeof (item as RecurringRule).active === 'boolean' &&
        Array.isArray((item as RecurringRule).generatedMonths),
    );
  } catch {
    return [];
  }
}

export const INSTALLMENT_OPTIONS = [2, 3, 4, 6, 10, 12] as const;

/**
 * Gera a lista de transações mensais de uma compra parcelada (ex.: R$ 300,00 em 3x -> 3x de R$ 100,00
 * nos meses consecutivos, com sufixo `(1/3)`, `(2/3)`, `(3/3)`).
 */
export function buildInstallmentTransactions(params: {
  baseTransaction: Transaction;
  installments: number;
  idGenerator: () => string;
  now: string;
}): Transaction[] {
  const { baseTransaction, installments, idGenerator, now } = params;
  const count = Math.trunc(installments);
  if (!Number.isFinite(count) || count <= 1) {
    return [baseTransaction];
  }

  const totalCents = baseTransaction.amount.cents;
  const basePartCents = Math.max(1, Math.floor(totalCents / count));
  const remainderCents = Math.max(0, totalCents - basePartCents * count);

  const startMonth = toYearMonth(baseTransaction.date);
  const day = dayFromISODate(baseTransaction.date);
  const baseLabel = baseTransaction.description?.trim() || 'Parcela';

  const list: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const partCents = i === 0 ? basePartCents + remainderCents : basePartCents;
    const targetMonth = i === 0 ? startMonth : addMonths(startMonth, i);
    const date = i === 0 ? baseTransaction.date : dueDateForMonth(targetMonth, day);
    const description = `${baseLabel} (${i + 1}/${count})`.slice(0, 80);

    list.push({
      ...baseTransaction,
      id: i === 0 ? baseTransaction.id : idGenerator(),
      amount: Money.fromCents(partCents),
      description,
      date,
      createdAt: now,
      updatedAt: now,
    });
  }

  return list;
}


