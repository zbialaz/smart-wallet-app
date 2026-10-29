import { describe, expect, it } from 'vitest';

import type { Account } from '@/domains/accounts/account';
import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import { Money } from '@/shared/money';

import {
  signedAmount,
  validateTransaction,
  type Transaction,
  type TransactionDraft,
  type ValidationContext,
} from './transaction';

const TODAY = '2026-10-15';

const account = (id: string, archivedAt: string | null = null): Account => ({
  id,
  name: id,
  color: '#000',
  initialBalance: Money.zero(),
  createdAt: '',
  archivedAt,
});

const ctx: ValidationContext = {
  accounts: [account('acc-1'), account('acc-archived', '2026-01-01')],
  categories: [
    ...DEFAULT_CATEGORIES,
    { ...DEFAULT_CATEGORIES[0], id: 'cat-archived', archivedAt: '2026-01-01' },
  ],
  today: TODAY,
};

const validDraft: TransactionDraft = {
  type: 'expense',
  amount: Money.fromCents(1590),
  description: '  iFood  ',
  categoryId: 'cat-food',
  accountId: 'acc-1',
  date: TODAY,
};

const validate = (overrides: Partial<TransactionDraft>, context = ctx) =>
  validateTransaction({ ...validDraft, ...overrides }, context);

describe('validateTransaction', () => {
  it('aceita um gasto válido e normaliza a descrição', () => {
    const r = validate({});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.description).toBe('iFood');
  });

  it('descrição vazia vira null (é opcional)', () => {
    const r = validate({ description: '   ' });
    expect(r.ok && r.value.description).toBe(null);
  });

  it('RN-01: rejeita valor zero', () => {
    const r = validate({ amount: Money.zero() });
    expect(!r.ok && r.error.amount).toBeTruthy();
  });

  it('RN-03: exige conta e categoria (US-001.4)', () => {
    const r = validate({ accountId: null, categoryId: null });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.accountId).toBe('Selecione uma conta');
      expect(r.error.categoryId).toBe('Selecione uma categoria');
    }
  });

  it('RN-04: rejeita categoria de receita num gasto', () => {
    const r = validate({ categoryId: 'cat-salary' });
    expect(!r.ok && r.error.categoryId).toMatch(/categoria de gasto/);
  });

  it('RN-04: aceita categoria de receita numa receita', () => {
    expect(validate({ type: 'income', categoryId: 'cat-salary' }).ok).toBe(true);
  });

  it('RN-06: aceita data passada e rejeita data futura', () => {
    expect(validate({ date: '2026-09-01' }).ok).toBe(true);
    const r = validate({ date: '2026-10-16' });
    expect(!r.ok && r.error.date).toMatch(/futuro/);
  });

  it('RN-10: não cria transação em conta ou categoria arquivada', () => {
    const r = validate({ accountId: 'acc-archived', categoryId: 'cat-archived' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.accountId).toMatch(/arquivada/);
      expect(r.error.categoryId).toMatch(/arquivada/);
    }
  });

  it('RN-10: na edição, permite manter a conta arquivada original', () => {
    const original = { accountId: 'acc-archived', categoryId: 'cat-food' } as Transaction;
    const r = validate({ accountId: 'acc-archived' }, { ...ctx, original });
    expect(r.ok).toBe(true);
  });
});

describe('signedAmount', () => {
  it('gasto é negativo, receita é positiva', () => {
    expect(signedAmount({ type: 'expense', amount: Money.fromCents(100) }).cents).toBe(-100);
    expect(signedAmount({ type: 'income', amount: Money.fromCents(100) }).cents).toBe(100);
  });
});
