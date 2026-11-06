import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import type { Transaction } from '@/domains/transactions/transaction';
import { Money } from '@/shared/money';

import {
  buildCategoryCloud,
  buildSubscriptionsRadar,
  buildTopExpenses,
  computeMonthProjection,
  computeSpendingMetrics,
  packCategoryBubbles,
} from './analytics';

function makeTx(
  id: string,
  type: 'expense' | 'income',
  cents: number,
  categoryId: string,
  description: string,
  date = '2026-11-04',
): Transaction {
  return {
    id,
    type,
    amount: Money.fromCents(cents),
    categoryId,
    accountId: 'acc-1',
    description,
    date,
    createdAt: '2026-11-04T12:00:00Z',
    updatedAt: '2026-11-04T12:00:00Z',
  };
}

describe('Analytics Domain (buildCategoryCloud, buildTopExpenses, computeSpendingMetrics)', () => {
  const sampleTransactions: Transaction[] = [
    makeTx('t1', 'expense', 60000, 'cat-food', 'Supermercado Mensal', '2026-11-01'),
    makeTx('t2', 'expense', 40000, 'cat-food', 'Restaurante Domingo', '2026-11-02'),
    makeTx('t3', 'expense', 50000, 'cat-home', 'Conta de Energia', '2026-11-03'),
    makeTx('t4', 'expense', 15000, 'cat-transport', 'Combustível', '2026-11-04'),
    makeTx('t5', 'income', 300000, 'cat-salary', 'Salário', '2026-11-01'),
  ];

  it('constrói a nuvem de categorias ordenada da maior para a menor com pesos, tiers e ticket médio', () => {
    const cloud = buildCategoryCloud(sampleTransactions, DEFAULT_CATEGORIES);

    expect(cloud).toHaveLength(3);

    // 1º lugar: Alimentação (R$ 1.000,00 em 2 compras -> ticket médio R$ 500,00, tier xl)
    expect(cloud[0].categoryId).toBe('cat-food');
    expect(cloud[0].total.cents).toBe(100000);
    expect(cloud[0].transactionCount).toBe(2);
    expect(cloud[0].averageTicket.cents).toBe(50000);
    expect(cloud[0].relativeWeight).toBe(1);
    expect(cloud[0].tier).toBe('xl');

    // 2º lugar: Moradia (R$ 500,00 -> 50% da maior -> tier lg)
    expect(cloud[1].categoryId).toBe('cat-home');
    expect(cloud[1].total.cents).toBe(50000);
    expect(cloud[1].relativeWeight).toBe(0.5);
    expect(cloud[1].tier).toBe('lg');

    // 3º lugar: Transporte (R$ 150,00 -> 15% da maior -> tier sm)
    expect(cloud[2].categoryId).toBe('cat-transport');
    expect(cloud[2].total.cents).toBe(15000);
    expect(cloud[2].tier).toBe('sm');
  });

  it('lista os maiores gastos individuais do mês ordenados por valor com participação percentual', () => {
    const top = buildTopExpenses(sampleTransactions, DEFAULT_CATEGORIES, 3);

    expect(top).toHaveLength(3);
    expect(top[0].transaction.id).toBe('t1');
    expect(top[0].transaction.description).toBe('Supermercado Mensal');
    expect(top[0].categoryName).toBe('Alimentação');
    expect(Math.round(top[0].shareOfMonth * 100)).toBe(36); // 600 / 1650 = 36.36%

    expect(top[1].transaction.id).toBe('t3');
    expect(top[2].transaction.id).toBe('t2');
  });

  it('calcula ticket médio por despesa, gasto médio diário e taxa de poupança', () => {
    const metrics = computeSpendingMetrics({
      transactions: sampleTransactions,
      daysInPeriod: 10,
    });

    expect(metrics.expenseCount).toBe(4);
    // Total gasto = R$ 1.650,00 / 4 compras = R$ 412,50
    expect(metrics.averagePerExpense.cents).toBe(41250);
    // R$ 1.650,00 / 10 dias = R$ 165,00/dia
    expect(metrics.dailyAverage.cents).toBe(16500);
    // Receita R$ 3.000,00 - Gasto R$ 1.650,00 = 45% poupado
    expect(metrics.savingsRatePercent).toBe(45);
  });

  it('empacota as categorias em bolas circulares proporcionais sem sobreposição (packCategoryBubbles)', () => {
    const cloud = buildCategoryCloud(sampleTransactions, DEFAULT_CATEGORIES);
    const packed = packCategoryBubbles(cloud, {
      maxWidth: 320,
      minRadius: 34,
      maxRadius: 68,
      gap: 6,
    });

    expect(packed.bubbles).toHaveLength(3);
    // Quanto maior o gasto da categoria, maior a bola
    expect(packed.bubbles[0].diameter).toBeGreaterThan(packed.bubbles[1].diameter);
    expect(packed.bubbles[1].diameter).toBeGreaterThan(packed.bubbles[2].diameter);

    // Nenhuma bola se sobrepõe às outras
    for (let i = 0; i < packed.bubbles.length; i++) {
      for (let j = i + 1; j < packed.bubbles.length; j++) {
        const a = packed.bubbles[i];
        const b = packed.bubbles[j];
        const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy);
        expect(dist).toBeGreaterThanOrEqual(a.radius + b.radius);
      }
    }
  });

  it('projeta o fechamento do mês no ritmo atual e compara com a meta mensal (computeMonthProjection)', () => {
    // R$ 1.000,00 gastos em 10 dias de um mês de 30 dias -> projeção R$ 3.000,00
    const projExceeded = computeMonthProjection({
      totalExpense: Money.fromCents(100000),
      daysElapsed: 10,
      totalDaysInMonth: 30,
      monthlyBudget: Money.fromCents(250000), // Meta R$ 2.500,00
      isCurrentMonth: true,
    });

    expect(projExceeded.projectedTotal.cents).toBe(300000);
    expect(projExceeded.dailyPace.cents).toBe(10000);
    expect(projExceeded.budgetStatus).toBe('exceeded');
    expect(projExceeded.projectedDiffFromBudget?.cents).toBe(50000); // R$ 500 acima da meta
    // Restam R$ 1.500 em 20 dias -> R$ 75/dia
    expect(projExceeded.safeDailyAllowance?.cents).toBe(7500);

    // Quando a projeção fica abaixo da meta
    const projWithin = computeMonthProjection({
      totalExpense: Money.fromCents(50000),
      daysElapsed: 10,
      totalDaysInMonth: 30,
      monthlyBudget: Money.fromCents(250000),
      isCurrentMonth: true,
    });

    expect(projWithin.projectedTotal.cents).toBe(150000);
    expect(projWithin.budgetStatus).toBe('within');
  });

  it('detecta assinaturas e gastos fixos mensais e calcula impacto anual (buildSubscriptionsRadar)', () => {
    const txsWithSubs: Transaction[] = [
      ...sampleTransactions,
      makeTx('t6', 'expense', 5590, 'cat-subscriptions', 'Netflix', '2026-11-05'),
      makeTx('t7', 'expense', 2190, 'cat-subscriptions', 'Spotify', '2026-11-06'),
      makeTx('t8', 'expense', 12990, 'cat-health', 'Smart Fit Academia', '2026-11-07'),
    ];

    const radar = buildSubscriptionsRadar({
      transactions: txsWithSubs,
      recurringRules: [],
    });

    expect(radar.count).toBe(3);
    // 55,90 + 21,90 + 129,90 = R$ 207,70 / mês
    expect(radar.monthlyTotal.cents).toBe(20770);
    // Anualizado (12x) = R$ 2.492,40 / ano
    expect(radar.annualizedTotal.cents).toBe(20770 * 12);
    expect(radar.items[0].title).toBe('Smart Fit Academia');
  });
});

