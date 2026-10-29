/**
 * Tipo de movimentação. Fica em `shared` porque Categorias e Transações usam
 * (uma categoria é de gasto OU de receita — RN-04).
 */
export type TransactionType = 'expense' | 'income';

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  expense: 'Gasto',
  income: 'Receita',
};
