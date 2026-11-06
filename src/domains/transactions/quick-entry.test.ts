import { describe, expect, it } from 'vitest';

import type { Account } from '@/domains/accounts/account';
import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import { parseQuickEntry } from '@/domains/transactions/quick-entry';
import type { ISODate } from '@/shared/date';
import { Money } from '@/shared/money';

const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-nubank',
    name: 'Nubank',
    initialBalance: Money.zero(),
    color: '#820AD1',
    createdAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
  },
  {
    id: 'acc-bb',
    name: 'Banco do Brasil',
    initialBalance: Money.zero(),
    color: '#F8D117',
    createdAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
  },
  {
    id: 'acc-itau',
    name: 'Itaú',
    initialBalance: Money.zero(),
    color: '#EC7000',
    createdAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
  },
];

const TODAY = '2026-05-15' as ISODate;

describe('parseQuickEntry ("Modo Pierre" / Natural Language Entry)', () => {
  it('extrai valor, descrição, categoria e conta de "45,90 iFood no Nubank"', () => {
    const res = parseQuickEntry({
      text: '45,90 iFood no Nubank',
      accounts: MOCK_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      today: TODAY,
    });

    expect(res).not.toBeNull();
    expect(res?.type).toBe('expense');
    expect(res?.amount?.cents).toBe(4590);
    expect(res?.description).toBe('IFood');
    expect(res?.categoryId).toBe('cat-food');
    expect(res?.accountId).toBe('acc-nubank');
    expect(res?.date).toBe('2026-05-15');
  });

  it('interpreta "Gastei R$ 32,50 com Uber ontem pelo Itaú" com data de ontem e conta Itaú', () => {
    const res = parseQuickEntry({
      text: 'Gastei R$ 32,50 com Uber ontem pelo Itaú',
      accounts: MOCK_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      today: TODAY,
    });

    expect(res?.type).toBe('expense');
    expect(res?.amount?.cents).toBe(3250);
    expect(res?.description).toBe('Uber');
    expect(res?.categoryId).toBe('cat-transport');
    expect(res?.accountId).toBe('acc-itau');
    expect(res?.date).toBe('2026-05-14');
  });

  it('identifica receita e apelido "BB" para "Recebi 4.500,00 de salário no BB"', () => {
    const res = parseQuickEntry({
      text: 'Recebi 4.500,00 de salário no BB',
      accounts: MOCK_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      today: TODAY,
    });

    expect(res?.type).toBe('income');
    expect(res?.amount?.cents).toBe(450000);
    expect(res?.categoryId).toBe('cat-salary');
    expect(res?.accountId).toBe('acc-bb');
  });

  it('marca flag recorrente e categoria Assinaturas para "Netflix 55,90 recorrente"', () => {
    const res = parseQuickEntry({
      text: 'Netflix 55,90 recorrente',
      accounts: MOCK_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      today: TODAY,
    });

    expect(res?.type).toBe('expense');
    expect(res?.amount?.cents).toBe(5590);
    expect(res?.description).toBe('Netflix');
    expect(res?.categoryId).toBe('cat-subscriptions');
    expect(res?.isRecurring).toBe(true);
  });
});
