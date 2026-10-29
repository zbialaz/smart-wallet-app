import type { Category } from '@/domains/categories/category';
import { OTHER_EXPENSE_CATEGORY_ID } from '@/domains/categories/category';
import { Money } from '@/shared/money';
import type { TransactionType } from '@/shared/transaction-type';

/**
 * Dashboard — contexto SOMENTE LEITURA.
 * Só funções puras que transformam uma lista de transações em números para a tela.
 */

/** O mínimo que o dashboard precisa saber de uma transação. */
export interface TransactionLike {
  type: TransactionType;
  amount: Money;
  categoryId: string;
}

export interface MonthSummary {
  income: Money;
  expense: Money;
  balance: Money; // "Saldo do mês" = receitas − gastos (glossário)
}

/** US-012: totais do mês. */
export function summarizeMonth(transactions: TransactionLike[]): MonthSummary {
  let income = Money.zero();
  let expense = Money.zero();
  for (const t of transactions) {
    if (t.type === 'income') income = income.add(t.amount);
    else expense = expense.add(t.amount);
  }
  return { income, expense, balance: income.subtract(expense) };
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: Money;
  /** Fração de 0 a 1 do total de gastos. */
  share: number;
}

/**
 * US-013: gastos agrupados por categoria, ordenados do maior para o menor.
 * Categorias com menos de `minShare` (3%) são somadas em "Outros" (US-013.3).
 */
export function buildCategoryBreakdown(
  transactions: TransactionLike[],
  categories: Category[],
  minShare = 0.03,
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount.cents);
  }

  const grandTotal = [...totals.values()].reduce((a, b) => a + b, 0);
  if (grandTotal === 0) return [];

  const byId = new Map(categories.map((c) => [c.id, c]));
  const other = byId.get(OTHER_EXPENSE_CATEGORY_ID);

  const big: { categoryId: string; cents: number }[] = [];
  let smallCents = 0;
  for (const [categoryId, cents] of totals) {
    const isOther = categoryId === OTHER_EXPENSE_CATEGORY_ID;
    if (!isOther && cents / grandTotal < minShare) smallCents += cents;
    else big.push({ categoryId, cents });
  }

  if (smallCents > 0) {
    const existing = big.find((s) => s.categoryId === OTHER_EXPENSE_CATEGORY_ID);
    if (existing) existing.cents += smallCents;
    else big.push({ categoryId: OTHER_EXPENSE_CATEGORY_ID, cents: smallCents });
  }

  return big
    .sort((a, b) => b.cents - a.cents)
    .map(({ categoryId, cents }) => {
      const category = byId.get(categoryId) ?? other;
      return {
        categoryId,
        name: category?.name ?? 'Outros',
        color: category?.color ?? '#8A90B2',
        icon: category?.icon ?? 'cube',
        total: Money.fromCents(cents),
        share: cents / grandTotal,
      };
    });
}

/** 0.4567 → "45,7%" */
export function formatShare(share: number): string {
  return `${(share * 100).toFixed(1).replace('.', ',')}%`;
}
