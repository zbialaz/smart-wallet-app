import { describe, expect, it } from 'vitest';

import type { ISODate, YearMonth } from '@/shared/date';

import {
  buildInstallmentTransactions,
  dueDateForMonth,
  materializeDueRecurringTransactions,
  parseRecurringRules,
  toggleRecurringRule,
  type RecurringRule,
} from './recurring';
import { Money } from '@/shared/money';

const baseRule: RecurringRule = {
  id: 'rec-1',
  type: 'expense',
  amountCents: 5590,
  description: 'Netflix',
  categoryId: 'cat-subscriptions',
  accountId: 'acc-1',
  dayOfMonth: 10,
  active: true,
  generatedMonths: ['2026-08' as YearMonth],
  createdAt: '2026-08-10T10:00:00.000Z',
};

describe('US-006 — Transações recorrentes mensais (recurring)', () => {
  it('US-006.1 e US-006.2: cria automaticamente a transação quando chega o dia definido no mês', () => {
    const result = materializeDueRecurringTransactions({
      rules: [baseRule],
      targetMonth: '2026-09' as YearMonth,
      today: '2026-09-10' as ISODate,
      idGenerator: () => 'tx-generated-sep',
      now: '2026-09-10T12:00:00.000Z',
    });

    expect(result.changed).toBe(true);
    expect(result.transactionsToInsert).toHaveLength(1);
    expect(result.transactionsToInsert[0].id).toBe('tx-generated-sep');
    expect(result.transactionsToInsert[0].date).toBe('2026-09-10');
    expect(result.transactionsToInsert[0].amount.cents).toBe(5590);
    expect(result.updatedRules[0].generatedMonths).toContain('2026-09');
  });

  it('não cria transação antes do dia programado nem duplica mês já gerado', () => {
    const beforeDay = materializeDueRecurringTransactions({
      rules: [baseRule],
      targetMonth: '2026-09' as YearMonth,
      today: '2026-09-05' as ISODate,
      idGenerator: () => 'tx-1',
      now: '2026-09-05T12:00:00.000Z',
    });
    expect(beforeDay.changed).toBe(false);
    expect(beforeDay.transactionsToInsert).toHaveLength(0);

    const alreadyGenerated = materializeDueRecurringTransactions({
      rules: [baseRule],
      targetMonth: '2026-08' as YearMonth,
      today: '2026-08-25' as ISODate,
      idGenerator: () => 'tx-2',
      now: '2026-08-25T12:00:00.000Z',
    });
    expect(alreadyGenerated.changed).toBe(false);
    expect(alreadyGenerated.transactionsToInsert).toHaveLength(0);
  });

  it('US-006.3: quando a recorrência é desativada, nenhuma nova transação é criada', () => {
    const paused = toggleRecurringRule([baseRule], 'rec-1', false);
    const result = materializeDueRecurringTransactions({
      rules: paused,
      targetMonth: '2026-09' as YearMonth,
      today: '2026-09-15' as ISODate,
      idGenerator: () => 'tx-never',
      now: '2026-09-15T12:00:00.000Z',
    });
    expect(result.changed).toBe(false);
    expect(result.transactionsToInsert).toHaveLength(0);
  });

  it('ajusta o dia 31 para o último dia válido em meses mais curtos (ex.: fevereiro)', () => {
    expect(dueDateForMonth('2026-02' as YearMonth, 31)).toBe('2026-02-28');
  });

  it('parseRecurringRules trata JSON inválido com segurança', () => {
    expect(parseRecurringRules(null)).toEqual([]);
    expect(parseRecurringRules('oops')).toEqual([]);
    expect(parseRecurringRules(JSON.stringify([baseRule]))).toHaveLength(1);
  });

  it('divide compra parcelada em parcelas mensais consecutivas somando 100% do valor total', () => {
    let seq = 1;
    const installments = buildInstallmentTransactions({
      baseTransaction: {
        id: 'tx-base',
        type: 'expense',
        amount: Money.fromCents(30000),
        description: 'Tênis corrida',
        categoryId: 'cat-shopping',
        accountId: 'acc-1',
        date: '2026-11-10',
        createdAt: '2026-11-10T10:00:00.000Z',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
      installments: 3,
      idGenerator: () => `tx-inst-${++seq}`,
      now: '2026-11-10T10:00:00.000Z',
    });

    expect(installments).toHaveLength(3);
    expect(installments[0]).toMatchObject({
      id: 'tx-base',
      description: 'Tênis corrida (1/3)',
      date: '2026-11-10',
    });
    expect(installments[0].amount.cents).toBe(10000);
    expect(installments[1]).toMatchObject({
      description: 'Tênis corrida (2/3)',
      date: '2026-12-10',
    });
    expect(installments[2]).toMatchObject({
      description: 'Tênis corrida (3/3)',
      date: '2027-01-10',
    });
  });
});

