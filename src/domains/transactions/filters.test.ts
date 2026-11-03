import { describe, expect, it } from 'vitest';

import { Money } from '@/shared/money';

import {
  EMPTY_FILTERS,
  filterTransactions,
  hasActiveFilters,
  normalizeText,
} from './filters';
import type { Transaction } from './transaction';

const make = (over: Partial<Transaction> & { id: string }): Transaction => ({
  type: 'expense',
  amount: Money.fromCents(1000),
  description: null,
  categoryId: 'cat-food',
  accountId: 'acc-nubank',
  date: '2026-09-10',
  createdAt: '',
  updatedAt: '',
  ...over,
});

const list: Transaction[] = [
  make({ id: '1', description: 'iFood almoço', categoryId: 'cat-food', accountId: 'acc-nubank' }),
  make({ id: '2', description: 'Uber', categoryId: 'cat-transport', accountId: 'acc-nubank' }),
  make({ id: '3', description: 'Mercado', categoryId: 'cat-food', accountId: 'acc-itau' }),
  make({ id: '4', description: null, categoryId: 'cat-food', accountId: 'acc-itau' }),
];

describe('US-005 — busca e filtros', () => {
  it('normalizeText ignora acento, caixa e espaços nas pontas', () => {
    expect(normalizeText('  ÍFood ')).toBe('ifood');
    expect(normalizeText('Alimentação')).toBe('alimentacao');
  });

  it('sem filtros devolve tudo (US-005 base)', () => {
    expect(filterTransactions(list, EMPTY_FILTERS)).toHaveLength(4);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('US-005.1: busca por texto na descrição ("ifood")', () => {
    const result = filterTransactions(list, { ...EMPTY_FILTERS, query: 'IFOOD' });
    expect(result.map((t) => t.id)).toEqual(['1']);
  });

  it('US-005.3: filtra por categoria', () => {
    const result = filterTransactions(list, { ...EMPTY_FILTERS, categoryId: 'cat-transport' });
    expect(result.map((t) => t.id)).toEqual(['2']);
  });

  it('filtra por conta', () => {
    const result = filterTransactions(list, { ...EMPTY_FILTERS, accountId: 'acc-itau' });
    expect(result.map((t) => t.id)).toEqual(['3', '4']);
  });

  it('US-005.4: múltiplos filtros funcionam em combinação (AND)', () => {
    const result = filterTransactions(list, {
      query: 'merc',
      categoryId: 'cat-food',
      accountId: 'acc-itau',
    });
    expect(result.map((t) => t.id)).toEqual(['3']);
    expect(hasActiveFilters({ query: '', categoryId: 'cat-food', accountId: null })).toBe(true);
  });

  it('transação sem descrição não casa com busca de texto', () => {
    const result = filterTransactions(list, { ...EMPTY_FILTERS, query: 'a' });
    expect(result.map((t) => t.id)).not.toContain('4');
  });
});
