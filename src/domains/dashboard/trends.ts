import { addMonths, type YearMonth } from '@/shared/date';
import { Money } from '@/shared/money';

/**
 * Dashboard — tendências mensais (US-014 e US-015).
 * Só funções puras sobre totais já agregados pelo repositório.
 */

export interface MonthlyTotals {
  month: YearMonth;
  income: Money;
  expense: Money;
}

/** Linha crua do repositório: total (em centavos) de um tipo em um mês. */
export interface MonthlyTotalRow {
  month: YearMonth;
  type: 'income' | 'expense';
  totalCents: number;
}

/**
 * Monta a janela dos últimos `count` meses terminando em `endMonth` (inclusive),
 * preenchendo com zero os meses sem movimentação. Ordem: do mais antigo para o mais recente.
 */
export function buildMonthlyEvolution(
  rows: MonthlyTotalRow[],
  endMonth: YearMonth,
  count = 6,
): MonthlyTotals[] {
  const result: MonthlyTotals[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = addMonths(endMonth, -i);
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.month !== month) continue;
      if (row.type === 'income') income += row.totalCents;
      else expense += row.totalCents;
    }
    result.push({ month, income: Money.fromCents(income), expense: Money.fromCents(expense) });
  }
  return result;
}

export type ExpenseComparison =
  /** US-015.2: não há gastos no mês anterior para comparar. */
  | { kind: 'no-data' }
  | { kind: 'same' }
  | { kind: 'up'; percent: number }
  | { kind: 'down'; percent: number };

/**
 * US-015: variação percentual dos gastos do mês atual em relação ao anterior.
 * Percentual arredondado para inteiro (ex.: 15 → "↑ 15%").
 */
export function compareExpense(current: Money, previous: Money): ExpenseComparison {
  if (!previous.isPositive()) return { kind: 'no-data' };

  const diff = current.cents - previous.cents;
  if (diff === 0) return { kind: 'same' };

  const percent = Math.round((Math.abs(diff) / previous.cents) * 100);
  // Variação minúscula que arredonda para 0% conta como "igual"
  if (percent === 0) return { kind: 'same' };
  return diff > 0 ? { kind: 'up', percent } : { kind: 'down', percent };
}
