import type { Category } from '@/domains/categories/category';
import type { YearMonth } from '@/shared/date';
import { Money } from '@/shared/money';

/**
 * US-018 — Alertas de gasto incomum.
 *
 * Duas detecções complementares:
 *   1. `detectCategoryPaceAlerts` (US-018.1): alerta no Dashboard quando o total gasto
 *      em uma categoria no mês atual supera em ≥ 30% a média mensal histórica da categoria.
 *   2. `detectSingleExpenseAlert` (US-018.2): alerta inline no formulário de transação
 *      quando um único gasto digitado é > 3x o ticket médio daquela categoria.
 */
export const PACE_ALERT_THRESHOLD_RATIO = 1.3; // +30% acima da média mensal
export const SINGLE_EXPENSE_MULTIPLIER_THRESHOLD = 3; // > 3x a média por transação
export const MIN_TX_COUNT_FOR_SINGLE_ALERT = 2;

export interface CategoryMonthlyStat {
  month: YearMonth;
  categoryId: string;
  totalCents: number;
  txCount: number;
}

export interface CategoryPaceAlert {
  categoryId: string;
  categoryName: string;
  currentAmount: Money;
  averageAmount: Money;
  percentAbove: number;
}

export interface SingleExpenseAlert {
  categoryId: string;
  amount: Money;
  averageTxAmount: Money;
  multiplier: number;
}

/**
 * US-018.1: compara o total gasto por categoria em `currentMonth` com a média
 * dos meses anteriores presentes em `stats`.
 */
export function detectCategoryPaceAlerts(params: {
  stats: CategoryMonthlyStat[];
  currentMonth: YearMonth;
  categories: Category[];
}): CategoryPaceAlert[] {
  const { stats, currentMonth, categories } = params;
  const byCategory = new Map(categories.map((c) => [c.id, c]));

  const currentTotals = new Map<string, number>();
  const pastByCat = new Map<string, number[]>();

  for (const row of stats) {
    if (row.totalCents <= 0) continue;
    if (row.month === currentMonth) {
      currentTotals.set(row.categoryId, (currentTotals.get(row.categoryId) ?? 0) + row.totalCents);
    } else if (row.month < currentMonth) {
      const list = pastByCat.get(row.categoryId) ?? [];
      list.push(row.totalCents);
      pastByCat.set(row.categoryId, list);
    }
  }

  const alerts: CategoryPaceAlert[] = [];
  for (const [categoryId, currentCents] of currentTotals.entries()) {
    const pastMonths = pastByCat.get(categoryId);
    if (!pastMonths || pastMonths.length === 0) continue;

    const sumPast = pastMonths.reduce((acc, v) => acc + v, 0);
    const avgCents = Math.round(sumPast / pastMonths.length);
    if (avgCents <= 0) continue;

    if (currentCents >= avgCents * PACE_ALERT_THRESHOLD_RATIO) {
      const percentAbove = Math.round(((currentCents - avgCents) / avgCents) * 100);
      if (percentAbove > 0) {
        const cat = byCategory.get(categoryId);
        alerts.push({
          categoryId,
          categoryName: cat?.name ?? categoryId,
          currentAmount: Money.fromCents(currentCents),
          averageAmount: Money.fromCents(avgCents),
          percentAbove,
        });
      }
    }
  }

  return alerts.sort((a, b) => b.percentAbove - a.percentAbove);
}

/**
 * US-018.2: verifica se um gasto único `amount` supera 3x o valor médio por transação
 * daquela categoria no histórico do usuário.
 */
export function detectSingleExpenseAlert(params: {
  amount: Money;
  categoryId: string | null;
  stats: CategoryMonthlyStat[];
}): SingleExpenseAlert | null {
  const { amount, categoryId, stats } = params;
  if (!categoryId || !amount.isPositive()) return null;

  let totalCents = 0;
  let totalCount = 0;
  for (const row of stats) {
    if (row.categoryId !== categoryId || row.totalCents <= 0 || row.txCount <= 0) continue;
    totalCents += row.totalCents;
    totalCount += row.txCount;
  }

  if (totalCount < MIN_TX_COUNT_FOR_SINGLE_ALERT) return null;

  const avgTxCents = Math.round(totalCents / totalCount);
  if (avgTxCents <= 0) return null;

  if (amount.cents > avgTxCents * SINGLE_EXPENSE_MULTIPLIER_THRESHOLD) {
    const multiplier = Math.round((amount.cents / avgTxCents) * 10) / 10;
    return {
      categoryId,
      amount,
      averageTxAmount: Money.fromCents(avgTxCents),
      multiplier,
    };
  }

  return null;
}
