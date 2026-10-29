import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import { Money } from '@/shared/money';
import type { TransactionType } from '@/shared/transaction-type';

import { buildCategoryBreakdown, formatShare, summarizeMonth } from './summary';

const tx = (type: TransactionType, cents: number, categoryId = 'cat-food') => ({
  type,
  amount: Money.fromCents(cents),
  categoryId,
});

describe('summarizeMonth (US-012)', () => {
  it('soma receitas, gastos e calcula saldo do mês', () => {
    const s = summarizeMonth([tx('income', 500000), tx('expense', 120000), tx('expense', 30000)]);
    expect(s.income.cents).toBe(500000);
    expect(s.expense.cents).toBe(150000);
    expect(s.balance.cents).toBe(350000);
  });

  it('mês vazio é tudo zero', () => {
    const s = summarizeMonth([]);
    expect(s.balance.isZero()).toBe(true);
  });
});

describe('buildCategoryBreakdown (US-013)', () => {
  it('ignora receitas e ordena do maior para o menor', () => {
    const slices = buildCategoryBreakdown(
      [tx('expense', 100, 'cat-food'), tx('expense', 300, 'cat-home'), tx('income', 9999, 'cat-salary')],
      DEFAULT_CATEGORIES,
    );
    expect(slices.map((s) => s.categoryId)).toEqual(['cat-home', 'cat-food']);
    expect(slices[0].share).toBeCloseTo(0.75);
    expect(slices[0].name).toBe('Moradia');
  });

  it('US-013.3: agrupa categorias com menos de 3% em "Outros"', () => {
    const slices = buildCategoryBreakdown(
      [tx('expense', 9800, 'cat-food'), tx('expense', 100, 'cat-tech'), tx('expense', 100, 'cat-gifts')],
      DEFAULT_CATEGORIES,
    );
    expect(slices).toHaveLength(2);
    expect(slices[1]).toMatchObject({ categoryId: 'cat-other', name: 'Outros' });
    expect(slices[1].total.cents).toBe(200);
  });

  it('soma as fatias pequenas na categoria "Outros" que já existe', () => {
    const slices = buildCategoryBreakdown(
      [tx('expense', 9000, 'cat-food'), tx('expense', 900, 'cat-other'), tx('expense', 100, 'cat-tech')],
      DEFAULT_CATEGORIES,
    );
    expect(slices).toHaveLength(2);
    expect(slices[1].total.cents).toBe(1000);
  });

  it('sem gastos, sem fatias', () => {
    expect(buildCategoryBreakdown([tx('income', 100)], DEFAULT_CATEGORIES)).toEqual([]);
  });

  it('formata porcentagem em pt-BR', () => {
    expect(formatShare(0.4567)).toBe('45,7%');
  });
});
