import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import type { YearMonth } from '@/shared/date';
import { Money } from '@/shared/money';

import {
  detectCategoryPaceAlerts,
  detectSingleExpenseAlert,
  type CategoryMonthlyStat,
} from './unusual-spending';

describe('US-018 — Alertas de gasto incomum (unusual-spending)', () => {
  const baseStats: CategoryMonthlyStat[] = [
    { month: '2026-07' as YearMonth, categoryId: 'cat-food', totalCents: 80000, txCount: 10 },
    { month: '2026-08' as YearMonth, categoryId: 'cat-food', totalCents: 80000, txCount: 10 },
    { month: '2026-09' as YearMonth, categoryId: 'cat-food', totalCents: 140000, txCount: 12 }, // +75% vs R$800
    { month: '2026-08' as YearMonth, categoryId: 'cat-transport', totalCents: 30000, txCount: 6 },
    { month: '2026-09' as YearMonth, categoryId: 'cat-transport', totalCents: 32000, txCount: 6 }, // +7% (abaixo de 30%)
  ];

  it('US-018.1: dispara alerta quando o gasto do mês na categoria está ≥ 30% acima da média histórica', () => {
    const alerts = detectCategoryPaceAlerts({
      stats: baseStats,
      currentMonth: '2026-09' as YearMonth,
      categories: DEFAULT_CATEGORIES,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].categoryId).toBe('cat-food');
    expect(alerts[0].percentAbove).toBe(75);
    expect(alerts[0].averageAmount.cents).toBe(80000);
    expect(alerts[0].currentAmount.cents).toBe(140000);
  });

  it('não dispara alerta quando não há histórico de meses anteriores', () => {
    const alerts = detectCategoryPaceAlerts({
      stats: [{ month: '2026-09' as YearMonth, categoryId: 'cat-food', totalCents: 140000, txCount: 5 }],
      currentMonth: '2026-09' as YearMonth,
      categories: DEFAULT_CATEGORIES,
    });
    expect(alerts).toEqual([]);
  });

  it('US-018.2: detecta gasto único acima de 3x a média por transação da categoria', () => {
    // Em cat-food: 80000 + 80000 + 140000 = 300000 centavos em 32 transações → média ~9375 (R$ 93,75)
    const normalAlert = detectSingleExpenseAlert({
      amount: Money.fromCents(20000), // R$ 200 (< 3x)
      categoryId: 'cat-food',
      stats: baseStats,
    });
    expect(normalAlert).toBeNull();

    const unusualAlert = detectSingleExpenseAlert({
      amount: Money.fromCents(35000), // R$ 350 (> 3x R$ 93,75)
      categoryId: 'cat-food',
      stats: baseStats,
    });
    expect(unusualAlert).not.toBeNull();
    expect(unusualAlert?.categoryId).toBe('cat-food');
    expect(unusualAlert?.multiplier).toBeGreaterThan(3);
  });
});
