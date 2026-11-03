import type { CategorySlice } from '@/domains/dashboard/summary';
import type { ExpenseComparison } from '@/domains/dashboard/trends';
import type { Transaction } from '@/domains/transactions/transaction';
import { Money } from '@/shared/money';

/**
 * US-017 — Resumo mensal inteligente.
 *
 * Analisa os lançamentos do mês selecionado, identifica a categoria dominante,
 * cruza com a variação percentual em relação ao mês anterior e calcula a taxa
 * de poupança do mês.
 */
export const MIN_TRANSACTIONS_FOR_INSIGHT = 5;

export type MonthlyInsight =
  | {
      kind: 'insufficient_data';
      transactionCount: number;
      requiredCount: number;
    }
  | {
      kind: 'no_expenses';
      transactionCount: number;
      totalIncome: Money;
    }
  | {
      kind: 'ready';
      transactionCount: number;
      totalExpense: Money;
      totalIncome: Money;
      topCategory: {
        categoryId: string;
        name: string;
        amount: Money;
        percentage: number;
      };
      comparison: ExpenseComparison;
      /** Taxa de economia do mês em % quando há receitas (pode ser negativa se gastou mais do que ganhou). */
      savingsRatePercent: number | null;
    };

export function buildMonthlyInsight(params: {
  transactions: Transaction[];
  breakdown: CategorySlice[];
  comparison: ExpenseComparison;
}): MonthlyInsight {
  const { transactions, breakdown, comparison } = params;

  if (transactions.length < MIN_TRANSACTIONS_FOR_INSIGHT) {
    return {
      kind: 'insufficient_data',
      transactionCount: transactions.length,
      requiredCount: MIN_TRANSACTIONS_FOR_INSIGHT,
    };
  }

  let expenseCents = 0;
  let incomeCents = 0;
  for (const tx of transactions) {
    if (tx.type === 'expense') expenseCents += tx.amount.cents;
    else incomeCents += tx.amount.cents;
  }

  if (expenseCents === 0 || breakdown.length === 0) {
    return {
      kind: 'no_expenses',
      transactionCount: transactions.length,
      totalIncome: Money.fromCents(incomeCents),
    };
  }

  // Categoria de maior impacto no mês
  const sorted = [...breakdown].sort((a, b) => b.total.cents - a.total.cents);
  const top = sorted[0];

  const savingsRatePercent =
    incomeCents > 0 ? Math.round(((incomeCents - expenseCents) / incomeCents) * 100) : null;

  return {
    kind: 'ready',
    transactionCount: transactions.length,
    totalExpense: Money.fromCents(expenseCents),
    totalIncome: Money.fromCents(incomeCents),
    topCategory: {
      categoryId: top.categoryId,
      name: top.name,
      amount: top.total,
      percentage: Math.round(top.share * 100),
    },
    comparison,
    savingsRatePercent,
  };
}
