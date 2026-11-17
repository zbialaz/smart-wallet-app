import { describe, expect, it } from 'vitest';

import { validateAccount, type Account } from '@/domains/accounts/account';
import { validateTransfer } from '@/domains/accounts/transfer';
import { validateLogin, validateRegister } from '@/domains/auth/user';
import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import {
  buildCategoryCloud,
  buildSubscriptionsRadar,
  computeMonthProjection,
  packCategoryBubbles,
} from '@/domains/dashboard/analytics';
import { computeMultiMonthSummary } from '@/domains/dashboard/trends';
import { parseBankStatementText } from '@/domains/open-finance/statement-parser';
import { parseQuickEntry } from '@/domains/transactions/quick-entry';
import {
  buildInstallmentTransactions,
  materializeDueRecurringTransactions,
  type RecurringRule,
} from '@/domains/transactions/recurring';
import { validateTransaction } from '@/domains/transactions/transaction';
import { Money } from '@/shared/money';

const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-nubank',
    name: 'Nubank',
    color: '#8A05BE',
    initialBalance: Money.fromCents(100000),
    createdAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
  },
  {
    id: 'acc-itau',
    name: 'Itaú',
    color: '#EC7000',
    initialBalance: Money.fromCents(50000),
    createdAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
  },
];

describe('QA Adversarial & Boundary Suite — Testes de Quebra e Casos Extremos', () => {
  it('Bug #1 QA: parcelamento de valores em centavos menores que o número de parcelas não infla o total', () => {
    let seq = 0;
    const baseTx = {
      id: 'tx-small',
      type: 'expense' as const,
      amount: Money.fromCents(5), // R$ 0,05
      description: 'Bala',
      categoryId: 'cat-food',
      accountId: 'acc-nubank',
      date: '2026-11-16',
      createdAt: '2026-11-16T10:00:00Z',
      updatedAt: '2026-11-16T10:00:00Z',
    };

    const list = buildInstallmentTransactions({
      baseTransaction: baseTx,
      installments: 10,
      idGenerator: () => `id-${++seq}`,
      now: '2026-11-16T10:00:00Z',
    });

    const totalSum = list.reduce((acc, item) => acc + item.amount.cents, 0);
    expect(totalSum).toBe(5);
    expect(list.every((item) => item.amount.cents > 0)).toBe(true);
  });

  it('Bug #1b QA: parcelamento com dízima (R$ 100,00 em 3x) preserva exatamente 10000 centavos sem perder R$ 0,01', () => {
    let seq = 0;
    const list = buildInstallmentTransactions({
      baseTransaction: {
        id: 'tx-100',
        type: 'expense',
        amount: Money.fromCents(10000),
        description: 'Camisa',
        categoryId: 'cat-shopping',
        accountId: 'acc-nubank',
        date: '2026-01-31',
        createdAt: '2026-01-31T10:00:00Z',
        updatedAt: '2026-01-31T10:00:00Z',
      },
      installments: 3,
      idGenerator: () => `id-${++seq}`,
      now: '2026-01-31T10:00:00Z',
    });

    expect(list.map((i) => i.amount.cents)).toEqual([3334, 3333, 3333]);
    // Também garante que comprar em 31/01 ajusta fevereiro para 28/02 sem gerar data inválida 2026-02-31
    expect(list[1].date).toBe('2026-02-28');
    expect(list[2].date).toBe('2026-03-31');
  });

  it('Bug #2 QA: CSV bancário com coluna numérica de Documento/Protocolo antes do Valor não confunde Documento com Valor', () => {
    const bbCsv = [
      'Data;Histórico;Documento;Valor',
      '10/11/2026;PIX ENVIADO PADARIA CENTRAL;984512;-45,90',
      '11/11/2026;COMPRA CARTAO SUPERMERCADO;100234;-289,50',
    ].join('\n');

    const parsed = parseBankStatementText(bbCsv, '2026-11-16');
    expect(parsed).toHaveLength(2);
    expect(parsed[0].amount).toBe(-45.9);
    expect(parsed[0].description).toBe('PIX ENVIADO PADARIA CENTRAL');
    expect(parsed[1].amount).toBe(-289.5);
  });

  it('Bug #3 QA: regras recorrentes vinculadas a contas excluídas são ignoradas e não quebram a materialização', () => {
    const orphanRule: RecurringRule = {
      id: 'rule-orphan',
      type: 'expense',
      amountCents: 5590,
      description: 'Netflix Conta Excluída',
      categoryId: 'cat-subscriptions',
      accountId: 'acc-deleted-999',
      dayOfMonth: 5,
      active: true,
      generatedMonths: [],
      createdAt: '2026-10-01T00:00:00Z',
    };

    const res = materializeDueRecurringTransactions({
      rules: [orphanRule],
      targetMonth: '2026-11',
      today: '2026-11-16',
      idGenerator: () => 'tx-new',
      now: '2026-11-16T00:00:00Z',
      validAccountIds: new Set(['acc-nubank', 'acc-itau']),
      validCategoryIds: new Set(DEFAULT_CATEGORIES.map((c) => c.id)),
    });

    expect(res.changed).toBe(false);
    expect(res.transactionsToInsert).toHaveLength(0);
  });

  it('Bug #5 QA: permite editar a descrição/categoria de uma parcela futura mantendo sua data original', () => {
    const futureInstallment = {
      id: 'tx-future-inst',
      type: 'expense' as const,
      amount: Money.fromCents(10000),
      description: 'Tênis (2/3)',
      categoryId: 'cat-shopping',
      accountId: 'acc-nubank',
      date: '2026-12-16',
      createdAt: '2026-11-16T10:00:00Z',
      updatedAt: '2026-11-16T10:00:00Z',
    };

    const res = validateTransaction(
      {
        type: 'expense',
        amount: Money.fromCents(10000),
        description: 'Tênis Nike (2/3)',
        categoryId: 'cat-shopping',
        accountId: 'acc-nubank',
        date: '2026-12-16',
      },
      {
        accounts: MOCK_ACCOUNTS,
        categories: DEFAULT_CATEGORIES,
        today: '2026-11-16',
        original: futureInstallment,
      },
    );

    expect(res.ok).toBe(true);
  });

  it('Bug #6 QA: parseQuickEntry não confunde números no nome da marca/produto ("99Pop 24,90", "PlayStation 5 3500 em 10x", "iPhone 15 4.999,90")', () => {
    const pop = parseQuickEntry({
      text: '99Pop 24,90 no Nubank',
      accounts: MOCK_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      today: '2026-11-16',
    });
    expect(pop?.amount?.cents).toBe(2490);
    expect(pop?.description).toContain('99Pop');

    const ps5 = parseQuickEntry({
      text: 'PlayStation 5 3500 em 10x pelo Itaú',
      accounts: MOCK_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      today: '2026-11-16',
    });
    expect(ps5?.amount?.cents).toBe(350000);
    expect(ps5?.installments).toBe(10);
    expect(ps5?.accountId).toBe('acc-itau');
    expect(ps5?.description).toBe('PlayStation 5');

    const iphone = parseQuickEntry({
      text: 'iPhone 15 4.999,90 em 12x no Nubank',
      accounts: MOCK_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      today: '2026-11-16',
    });
    expect(iphone?.amount?.cents).toBe(499990);
    expect(iphone?.installments).toBe(12);
    expect(iphone?.description).toBe('IPhone 15');
  });

  it('QA Validações de Formulários: rejeita transferências para a mesma conta, saldos negativos, datas inexistentes (31/02) e descrições gigantes', () => {
    const sameAccTransfer = validateTransfer(
      {
        amount: Money.fromCents(5000),
        fromAccountId: 'acc-nubank',
        toAccountId: 'acc-nubank',
        date: '2026-11-16',
        description: 'Pix',
      },
      { accounts: MOCK_ACCOUNTS, today: '2026-11-16' },
    );
    expect(sameAccTransfer.ok).toBe(false);

    const invalidFebDate = validateTransaction(
      {
        type: 'expense',
        amount: Money.fromCents(1000),
        description: 'Teste',
        categoryId: 'cat-food',
        accountId: 'acc-nubank',
        date: '2026-02-31',
      },
      { accounts: MOCK_ACCOUNTS, categories: DEFAULT_CATEGORIES, today: '2026-11-16' },
    );
    expect(invalidFebDate.ok).toBe(false);

    const duplicateAccount = validateAccount(
      {
        name: '  nubank ',
        color: '#000',
        initialBalance: Money.zero(),
      },
      ['Nubank'],
    );
    expect(duplicateAccount.ok).toBe(false);

    const badRegister = validateRegister(
      {
        name: 'A',
        email: 'email-invalido',
        password: '123',
        confirmPassword: '456',
      },
      [],
    );
    expect(badRegister.ok).toBe(false);

    const badLogin = validateLogin({ email: '  ', password: '' });
    expect(badLogin.ok).toBe(false);
  });

  it('QA Analytics & Gráficos: lida com listas vazias, meses zerados e 15+ categorias sem colisão de bolhas nem NaN', () => {
    expect(buildCategoryCloud([], DEFAULT_CATEGORIES)).toEqual([]);
    expect(packCategoryBubbles([])).toEqual({ bubbles: [], width: 330, height: 0 });

    const projZero = computeMonthProjection({
      totalExpense: Money.zero(),
      daysElapsed: 0,
      totalDaysInMonth: 0,
      monthlyBudget: Money.zero(),
    });
    expect(projZero.projectedTotal.cents).toBe(0);
    expect(Number.isFinite(projZero.monthProgressFraction)).toBe(true);

    const radarEmpty = buildSubscriptionsRadar({ transactions: [], recurringRules: [] });
    expect(radarEmpty.count).toBe(0);
    expect(radarEmpty.shareOfExpense).toBe(0);

    const compZero = computeMultiMonthSummary([
      { month: '2026-10', income: Money.zero(), expense: Money.zero() },
      { month: '2026-11', income: Money.zero(), expense: Money.zero() },
    ]);
    expect(compZero.vsAverage.kind).toBe('no-data');
  });
});
