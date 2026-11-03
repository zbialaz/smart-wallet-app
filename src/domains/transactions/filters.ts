import type { Transaction } from './transaction';

/**
 * US-005 — Buscar e filtrar transações.
 * Funções PURAS: a tela só mantém o estado dos filtros e chama `filterTransactions`.
 */
export interface TransactionFilters {
  /** Texto digitado na busca (compara com a descrição). */
  query: string;
  categoryId: string | null;
  accountId: string | null;
}

export const EMPTY_FILTERS: TransactionFilters = {
  query: '',
  categoryId: null,
  accountId: null,
};

/** "  iFood  " / "IFOOD" / "ífood" → "ifood" (sem acento, minúsculo, sem espaços nas pontas). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return normalizeText(filters.query) !== '' || filters.categoryId !== null || filters.accountId !== null;
}

/**
 * Aplica busca + categoria + conta em COMBINAÇÃO (AND) — US-005.4.
 * O período (mês) já vem aplicado pela lista de entrada (US-005.2).
 */
export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const query = normalizeText(filters.query);

  return transactions.filter((t) => {
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters.accountId && t.accountId !== filters.accountId) return false;
    if (query && !normalizeText(t.description ?? '').includes(query)) return false;
    return true;
  });
}
