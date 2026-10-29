import { useMemo } from 'react';

import { consolidatedBalance } from '@/domains/accounts/account';
import { buildCategoryBreakdown, summarizeMonth } from '@/domains/dashboard/summary';

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
