import { describe, expect, it } from 'vitest';

import { Money } from '@/shared/money';

import {
  calculateBalance,
  consolidatedBalance,
  validateAccount,
  type AccountWithBalance,
} from './account';

const draft = (name: string, cents = 0) => ({
  name,
  color: '#000',
  initialBalance: Money.fromCents(cents),
});

describe('validateAccount', () => {
  it('aceita conta válida e remove espaços do nome', () => {
    const r = validateAccount(draft('  Nubank  ', 100000), []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('Nubank');
  });

  it('exige nome', () => {
    const r = validateAccount(draft('   '), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.name).toBeDefined();
  });

  it('RN-07: rejeita nome duplicado sem diferenciar maiúsculas', () => {
    const r = validateAccount(draft('nubank'), ['Nubank']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.name).toMatch(/Já existe/);
  });

  it('RN-11: rejeita saldo inicial negativo', () => {
    const r = validateAccount(draft('Nubank', -1), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.initialBalance).toBeDefined();
  });
});

describe('calculateBalance (RN-05)', () => {
  it('saldo = inicial + receitas − gastos', () => {
    const balance = calculateBalance(Money.fromCents(100000), {
      income: Money.fromCents(50000),
      expense: Money.fromCents(30000),
    });
    expect(balance.cents).toBe(120000);
  });

  it('pode ficar negativo', () => {
    const balance = calculateBalance(Money.zero(), {
      income: Money.zero(),
      expense: Money.fromCents(1),
    });
    expect(balance.cents).toBe(-1);
  });
});

describe('consolidatedBalance (US-007.3)', () => {
  const account = (balance: number, archivedAt: string | null = null): AccountWithBalance => ({
    id: Math.random().toString(),
    name: 'x',
    color: '#000',
    initialBalance: Money.zero(),
    createdAt: '',
    archivedAt,
    balance: Money.fromCents(balance),
  });

  it('soma apenas contas ativas', () => {
    const total = consolidatedBalance([account(1000), account(-200), account(5000, '2026-01-01')]);
    expect(total.cents).toBe(800);
  });
});
