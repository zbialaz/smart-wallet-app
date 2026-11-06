import { describe, expect, it } from 'vitest';

import { Money } from '@/shared/money';

import {
  MAX_BUDGET_CENTS,
  budgetProgress,
  categoryBudgetProgress,
  parseCategoryBudgets,
  updateCategoryBudgetMap,
  validateBudget,
} from './budget';

const c = (cents: number) => Money.fromCents(cents);

describe('US-019 — meta de gastos mensal', () => {
  it('abaixo de 80% da meta → status ok', () => {
    const p = budgetProgress(c(150000), c(300000));
    expect(p.status).toBe('ok');
    expect(p.percent).toBe(50);
    expect(p.remaining.cents).toBe(150000);
    expect(p.exceededBy.cents).toBe(0);
  });

  it('US-019.2: ao atingir 80% a barra vira amarela (warning)', () => {
    expect(budgetProgress(c(240000), c(300000)).status).toBe('warning');
    expect(budgetProgress(c(239999), c(300000)).status).toBe('ok');
  });

  it('exatamente 100% ainda é warning (não excedeu)', () => {
    const p = budgetProgress(c(300000), c(300000));
    expect(p.status).toBe('warning');
    expect(p.remaining.cents).toBe(0);
    expect(p.exceededBy.cents).toBe(0);
  });

  it('US-019.3: ultrapassou a meta → exceeded com o valor excedido', () => {
    const p = budgetProgress(c(345000), c(300000));
    expect(p.status).toBe('exceeded');
    expect(p.exceededBy.cents).toBe(45000);
    expect(p.remaining.cents).toBe(0);
    expect(p.percent).toBe(115);
  });

  it('sem gastos → 0% e tudo restante', () => {
    const p = budgetProgress(c(0), c(300000));
    expect(p.status).toBe('ok');
    expect(p.percent).toBe(0);
    expect(p.remaining.cents).toBe(300000);
  });

  it('validateBudget exige valor positivo e dentro do teto', () => {
    expect(validateBudget(c(300000)).ok).toBe(true);
    expect(validateBudget(c(0)).ok).toBe(false);
    expect(validateBudget(c(-100)).ok).toBe(false);
    expect(validateBudget(c(MAX_BUDGET_CENTS + 1)).ok).toBe(false);
  });

  it('gerencia limites opcionais por categoria (updateCategoryBudgetMap e categoryBudgetProgress)', () => {
    const added = updateCategoryBudgetMap({}, 'cat-food', c(60000));
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const serialized = JSON.stringify(added.value);
    const parsed = parseCategoryBudgets(serialized);
    expect(parsed['cat-food']).toBe(60000);

    const progress = categoryBudgetProgress(c(45000), 'cat-food', parsed);
    expect(progress).not.toBeNull();
    expect(progress?.percent).toBe(75);
    expect(progress?.status).toBe('ok');

    const removed = updateCategoryBudgetMap(parsed, 'cat-food', null);
    expect(removed.ok).toBe(true);
    if (removed.ok) {
      expect(categoryBudgetProgress(c(45000), 'cat-food', removed.value)).toBeNull();
    }
  });
});

