import { describe, expect, it } from 'vitest';

import { Money } from '@/shared/money';

import { buildMonthlyEvolution, compareExpense, type MonthlyTotalRow } from './trends';

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
