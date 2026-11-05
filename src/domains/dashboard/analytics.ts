import type { Category } from '@/domains/categories/category';
import type { Transaction } from '@/domains/transactions/transaction';
import { Money } from '@/shared/money';

/**
 * Domínio de Analytics e Visualização de Gastos.
 *
 * Funções 100% puras e determinísticas para alimentar a aba de Dados & Analytics:
 *   1. `buildCategoryCloud`: Nuvem de Categorias dimensionada pelo peso no orçamento,
 *      com contagem de lançamentos e ticket médio por categoria.
 *   2. `buildTopExpenses`: Ranking dos maiores gastos individuais do mês e seu peso percentual.
 *   3. `computeSpendingMetrics`: KPIs rápidos do mês (ticket médio por compra, gasto diário,
 *      quantidade de despesas e taxa de economia).
 */

export type CloudTier = 'xl' | 'lg' | 'md' | 'sm';

export interface CategoryCloudItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: Money;
  /** Fração de 0 a 1 sobre o total de despesas do mês. */
  share: number;
  /** Escala normalizada de 0 a 1 em relação à maior categoria do mês (1.0 = a maior). */
  relativeWeight: number;
  /** Tamanho visual na nuvem de categorias. */
  tier: CloudTier;
  /** Número de transações de gasto nesta categoria no mês. */
  transactionCount: number;
  /** Valor médio por transação nesta categoria. */
  averageTicket: Money;
}

export interface TopExpenseItem {
  transaction: Transaction;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  /** Fração de 0 a 1 que este único gasto representa do total gasto no mês. */
  shareOfMonth: number;
}

export interface SpendingMetrics {
  expenseCount: number;
  averagePerExpense: Money;
  dailyAverage: Money;
  savingsRatePercent: number | null;
}

function resolveTier(relativeWeight: number): CloudTier {
  if (relativeWeight >= 0.75) return 'xl';
  if (relativeWeight >= 0.45) return 'lg';
  if (relativeWeight >= 0.2) return 'md';
  return 'sm';
}

/**
 * Constrói os itens da Nuvem de Categorias ordenados da maior para a menor despesa.
 * Diferente do gráfico de rosca, preserva todas as categorias com gasto > 0 para que o
 * usuário veja tanto as maiores categorias em destaque quanto as menores ao redor.
 */
export function buildCategoryCloud(
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amount' | 'categoryId'>>,
  categories: ReadonlyArray<Category>,
): CategoryCloudItem[] {
  const agg = new Map<string, { cents: number; count: number }>();
  let totalExpenseCents = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.amount.cents <= 0) continue;
    totalExpenseCents += tx.amount.cents;
    const prev = agg.get(tx.categoryId) ?? { cents: 0, count: 0 };
    agg.set(tx.categoryId, {
      cents: prev.cents + tx.amount.cents,
      count: prev.count + 1,
    });
  }

  if (totalExpenseCents === 0) return [];

  const byId = new Map(categories.map((c) => [c.id, c]));
  const entries = [...agg.entries()].sort((a, b) => b[1].cents - a[1].cents);
  const maxCents = entries[0][1].cents;

  return entries.map(([categoryId, { cents, count }]) => {
    const cat = byId.get(categoryId);
    const share = cents / totalExpenseCents;
    const relativeWeight = maxCents > 0 ? cents / maxCents : 0;
    const avgCents = Math.round(cents / count);

    return {
      categoryId,
      name: cat?.name ?? 'Outros',
      color: cat?.color ?? '#8A90B2',
      icon: cat?.icon ?? 'cube',
      total: Money.fromCents(cents),
      share,
      relativeWeight,
      tier: resolveTier(relativeWeight),
      transactionCount: count,
      averageTicket: Money.fromCents(avgCents),
    };
  });
}

/**
 * Retorna os maiores gastos individuais do mês (padrão: top 5),
 * ordenados do maior valor para o menor.
 */
export function buildTopExpenses(
  transactions: ReadonlyArray<Transaction>,
  categories: ReadonlyArray<Category>,
  limit = 5,
): TopExpenseItem[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.amount.cents > 0);
  if (expenses.length === 0 || limit <= 0) return [];

  const totalExpenseCents = expenses.reduce((sum, t) => sum + t.amount.cents, 0);
  const byId = new Map(categories.map((c) => [c.id, c]));

  return [...expenses]
    .sort((a, b) => b.amount.cents - a.amount.cents || b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((tx) => {
      const cat = byId.get(tx.categoryId);
      return {
        transaction: tx,
        categoryName: cat?.name ?? 'Outros',
        categoryColor: cat?.color ?? '#8A90B2',
        categoryIcon: cat?.icon ?? 'cube',
        shareOfMonth: totalExpenseCents > 0 ? tx.amount.cents / totalExpenseCents : 0,
      };
    });
}

/**
 * Calcula indicadores rápidos do mês: ticket médio por compra, média diária (considerando
 * `daysElapsed` dias corridos no mês, mín. 1) e taxa de poupança sobre a renda.
 */
export function computeSpendingMetrics(params: {
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amount'>>;
  daysInPeriod?: number;
}): SpendingMetrics {
  const { transactions, daysInPeriod = 30 } = params;
  const safeDays = Math.max(1, Math.round(daysInPeriod));

  let incomeCents = 0;
  let expenseCents = 0;
  let expenseCount = 0;

  for (const tx of transactions) {
    if (tx.type === 'income' && tx.amount.cents > 0) {
      incomeCents += tx.amount.cents;
    } else if (tx.type === 'expense' && tx.amount.cents > 0) {
      expenseCents += tx.amount.cents;
      expenseCount += 1;
    }
  }

  const averagePerExpense =
    expenseCount > 0 ? Money.fromCents(Math.round(expenseCents / expenseCount)) : Money.zero();
  const dailyAverage =
    expenseCents > 0 ? Money.fromCents(Math.round(expenseCents / safeDays)) : Money.zero();
  const savingsRatePercent =
    incomeCents > 0 ? Math.round(((incomeCents - expenseCents) / incomeCents) * 100) : null;

  return {
    expenseCount,
    averagePerExpense,
    dailyAverage,
    savingsRatePercent,
  };
}
