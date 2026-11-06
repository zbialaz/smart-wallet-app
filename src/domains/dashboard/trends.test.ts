import { describe, expect, it } from 'vitest';

import { Money } from '@/shared/money';

import {
  buildMonthlyEvolution,
  compareExpense,
  computeMultiMonthSummary,
  hasEnoughHistory,
  isExpenseIncrease,
  maxExpenseCents,
  type MonthlyTotalRow,
} from './trends';

const c = (cents: number) => Money.fromCents(cents);

describe('buildMonthlyEvolution', () => {
  const rows: MonthlyTotalRow[] = [
    { month: '2026-10', type: 'expense', totalCents: 30000 },
    { month: '2026-10', type: 'income', totalCents: 100000 },
    { month: '2026-08', type: 'expense', totalCents: 12000 },
  ];

  it('devolve a janela de 6 meses em ordem cronológica terminando no mês pedido', () => {
    const result = buildMonthlyEvolution(rows, '2026-10', 6);
    expect(result.map((m) => m.month)).toEqual([
      '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10',
    ]);
  });

  it('preenche com zero os meses sem movimentação e soma por tipo', () => {
    const result = buildMonthlyEvolution(rows, '2026-10', 6);
    const byMonth = Object.fromEntries(result.map((m) => [m.month, m]));
    expect(byMonth['2026-09'].expense.cents).toBe(0);
    expect(byMonth['2026-08'].expense.cents).toBe(12000);
    expect(byMonth['2026-10'].expense.cents).toBe(30000);
    expect(byMonth['2026-10'].income.cents).toBe(100000);
  });

  it('atravessa a virada de ano', () => {
    const result = buildMonthlyEvolution([], '2026-02', 4);
    expect(result.map((m) => m.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('US-015 — compareExpense', () => {
  it('US-015.1: aumento → "↑ 15%"', () => {
    expect(compareExpense(c(11500), c(10000))).toEqual({ kind: 'up', percent: 15 });
  });

  it('US-015.1: queda → "↓ 10%"', () => {
    expect(compareExpense(c(9000), c(10000))).toEqual({ kind: 'down', percent: 10 });
  });

  it('US-015.2: sem gasto no mês anterior → "Sem dados"', () => {
    expect(compareExpense(c(5000), c(0))).toEqual({ kind: 'no-data' });
  });

  it('valores iguais ou variação que arredonda para 0% → "same"', () => {
    expect(compareExpense(c(10000), c(10000))).toEqual({ kind: 'same' });
    expect(compareExpense(c(10001), c(10000))).toEqual({ kind: 'same' });
  });

  it('gasto zerado neste mês vira queda de 100%', () => {
    expect(compareExpense(c(0), c(10000))).toEqual({ kind: 'down', percent: 100 });
  });
});

describe('US-014 — evolução mensal', () => {
  const window = (expenses: number[], incomes: number[] = []) =>
    expenses.map((e, i) => ({
      month: `2026-0${i + 1}`,
      expense: c(e),
      income: c(incomes[i] ?? 0),
    }));

  it('US-014.1: exige dados de pelo menos 2 meses', () => {
    expect(hasEnoughHistory(window([0, 0, 0, 0, 0, 5000]))).toBe(false);
    expect(hasEnoughHistory(window([0, 0, 0, 0, 3000, 5000]))).toBe(true);
    // mês só com receita também conta como "dado"
    expect(hasEnoughHistory(window([0, 0, 0, 0, 0, 5000], [0, 0, 0, 0, 9000, 0]))).toBe(true);
  });

  it('US-014.2: detecta gasto maior que o do mês anterior', () => {
    const w = window([1000, 2000, 1500]);
    expect(isExpenseIncrease(w, 1)).toBe(true);
    expect(isExpenseIncrease(w, 2)).toBe(false);
  });

  it('primeiro item e índices inválidos nunca são "aumento"', () => {
    const w = window([1000, 2000]);
    expect(isExpenseIncrease(w, 0)).toBe(false);
    expect(isExpenseIncrease(w, 5)).toBe(false);
  });

  it('maxExpenseCents devolve o maior gasto da janela (0 se vazia)', () => {
    expect(maxExpenseCents(window([1000, 4000, 2500]))).toBe(4000);
    expect(maxExpenseCents([])).toBe(0);
  });

  it('computeMultiMonthSummary calcula média mensal, pico, menor mês e variação mês a mês', () => {
    const w = window([0, 20000, 30000, 25000]);
    const summary = computeMultiMonthSummary(w);

    // Média dos 3 meses ativos: (200 + 300 + 250) / 3 = R$ 250,00
    expect(summary.averageExpense.cents).toBe(25000);
    expect(summary.highestMonth?.month).toBe('2026-03');
    expect(summary.lowestMonth?.month).toBe('2026-02');

    // Mês 3 (30000) vs Mês 2 (20000) -> subiu 50%
    expect(summary.steps[2].vsPrevious).toEqual({ kind: 'up', percent: 50 });
    // Mês 4 (25000) vs Mês 3 (30000) -> caiu 17%
    expect(summary.steps[3].vsPrevious).toEqual({ kind: 'down', percent: 17 });
  });
});
