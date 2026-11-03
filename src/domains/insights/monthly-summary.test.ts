import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import { buildCategoryBreakdown } from '@/domains/dashboard/summary';
import { compareExpense } from '@/domains/dashboard/trends';
import type { Transaction } from '@/domains/transactions/transaction';
import type { ISODate } from '@/shared/date';
import { Money } from '@/shared/money';

import { buildMonthlyInsight, MIN_TRANSACTIONS_FOR_INSIGHT } from './monthly-summary';

function makeTx(
  id: string,
  type: 'expense' | 'income',
  cents: number,
  categoryId: string,
): Transaction {
  return {
    id,
    type,
    amount: Money.fromCents(cents),
    description: id,
    categoryId,
    accountId: 'acc-1',
    date: '2026-09-10' as ISODate,
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  };
}

describe('US-017 — Resumo mensal inteligente (monthly-summary)', () => {
  it('US-017.2: retorna insufficient_data quando há menos de 5 transações no mês', () => {
    const txs = [
      makeTx('t1', 'expense', 5000, 'cat-food'),
      makeTx('t2', 'expense', 3000, 'cat-transport'),
    ];
    const breakdown = buildCategoryBreakdown(txs, DEFAULT_CATEGORIES);
    const comparison = compareExpense(Money.fromCents(8000), Money.fromCents(10000));

    const insight = buildMonthlyInsight({ transactions: txs, breakdown, comparison });
    expect(insight).toEqual({
      kind: 'insufficient_data',
      transactionCount: 2,
      requiredCount: MIN_TRANSACTIONS_FOR_INSIGHT,
    });
  });

  it('US-017.1: gera análise completa com maior categoria, variação mensal e taxa de economia', () => {
    const txs = [
      makeTx('t1', 'income', 500000, 'cat-salary'), // R$ 5.000
      makeTx('t2', 'expense', 112000, 'cat-food'), // R$ 1.120 (35%)
      makeTx('t3', 'expense', 100000, 'cat-home'), // R$ 1.000
      makeTx('t4', 'expense', 60000, 'cat-transport'), // R$ 600
      makeTx('t5', 'expense', 48000, 'cat-leisure'), // R$ 480 -> Total = R$ 3.200
    ];
    const breakdown = buildCategoryBreakdown(txs, DEFAULT_CATEGORIES);
    const comparison = compareExpense(Money.fromCents(320000), Money.fromCents(266667));

    const insight = buildMonthlyInsight({ transactions: txs, breakdown, comparison });
    expect(insight.kind).toBe('ready');
    if (insight.kind === 'ready') {
      expect(insight.totalExpense.cents).toBe(320000);
      expect(insight.topCategory.categoryId).toBe('cat-food');
      expect(insight.topCategory.percentage).toBe(35);
      expect(insight.comparison).toEqual({ kind: 'up', percent: 20 });
      expect(insight.savingsRatePercent).toBe(36); // (5000 - 3200) / 5000 = 36%
    }
  });

  it('retorna no_expenses quando há 5+ transações apenas de receita', () => {
    const txs = [
      makeTx('t1', 'income', 10000, 'cat-salary'),
      makeTx('t2', 'income', 10000, 'cat-freelance'),
      makeTx('t3', 'income', 10000, 'cat-freelance'),
      makeTx('t4', 'income', 10000, 'cat-investments'),
      makeTx('t5', 'income', 10000, 'cat-gift-received'),
    ];
    const insight = buildMonthlyInsight({
      transactions: txs,
      breakdown: [],
      comparison: compareExpense(Money.zero(), Money.zero()),
    });
    expect(insight.kind).toBe('no_expenses');
  });
});
