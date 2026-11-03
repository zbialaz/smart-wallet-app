import { useMemo } from 'react';

import { consolidatedBalance } from '@/domains/accounts/account';
import { buildCategoryBreakdown, summarizeMonth } from '@/domains/dashboard/summary';
import { compareExpense, type ExpenseComparison } from '@/domains/dashboard/trends';
import { buildMonthlyInsight, type MonthlyInsight } from '@/domains/insights/monthly-summary';

import { useWallet } from './wallet-store';

/**
 * SELETORES DERIVADOS
 *
 * Por que useMemo e não calcular dentro do seletor do Zustand?
 * Um seletor que devolve um objeto NOVO a cada chamada faz o Zustand achar
 * que o estado mudou → re-render infinito. Então lemos o estado "cru" do
 * store e derivamos aqui, recalculando só quando a entrada muda.
 */

export function useCategoryMap() {
  const categories = useWallet((s) => s.categories);
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
}

export function useAccountMap() {
  const accounts = useWallet((s) => s.accounts);
  return useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
}

export function useMonthSummary() {
  const transactions = useWallet((s) => s.transactions);
  return useMemo(() => summarizeMonth(transactions), [transactions]);
}

export function useCategoryBreakdown() {
  const transactions = useWallet((s) => s.transactions);
  const categories = useWallet((s) => s.categories);
  return useMemo(
    () => buildCategoryBreakdown(transactions, categories),
    [transactions, categories],
  );
}

export function useConsolidatedBalance() {
  const accounts = useWallet((s) => s.accounts);
  return useMemo(() => consolidatedBalance(accounts), [accounts]);
}

/** US-015: gasto do mês selecionado vs. mês anterior (últimos dois itens da janela). */
export function useExpenseComparison(): ExpenseComparison {
  const evolution = useWallet((s) => s.monthlyEvolution);
  return useMemo(() => {
    if (evolution.length < 2) return { kind: 'no-data' };
    const current = evolution[evolution.length - 1];
    const previous = evolution[evolution.length - 2];
    return compareExpense(current.expense, previous.expense);
  }, [evolution]);
}

/** US-017: resumo mensal inteligente com base nas transações, categorias e variação do mês. */
export function useMonthlyInsight(): MonthlyInsight {
  const transactions = useWallet((s) => s.transactions);
  const breakdown = useCategoryBreakdown();
  const comparison = useExpenseComparison();
  return useMemo(
    () => buildMonthlyInsight({ transactions, breakdown, comparison }),
    [transactions, breakdown, comparison],
  );
}
