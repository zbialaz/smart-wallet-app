import { describe, expect, it } from 'vitest';

import type { ISODate } from '@/shared/date';
import { Money } from '@/shared/money';

import { calculateBalance, type Account } from './account';
import { buildTransferTransactions, validateTransfer } from './transfer';

const santander: Account = {
  id: 'acc-santander',
  name: 'Santander',
  color: '#EC0000',
  initialBalance: Money.fromCents(200000), // R$ 2.000
  createdAt: '2026-09-01T00:00:00.000Z',
  archivedAt: null,
};

const nubank: Account = {
  id: 'acc-nubank',
  name: 'Nubank',
  color: '#8A05BE',
  initialBalance: Money.fromCents(100000), // R$ 1.000
  createdAt: '2026-09-01T00:00:00.000Z',
  archivedAt: null,
};

describe('US-009 — Transferência entre contas (transfer)', () => {
  it('US-009.1 e US-009.2: transfere R$ 500 do Santander para o Nubank atualizando ambos os saldos', () => {
    const validated = validateTransfer(
      {
        amount: Money.fromCents(50000), // R$ 500
        fromAccountId: santander.id,
        toAccountId: nubank.id,
        date: '2026-09-15' as ISODate,
      },
      { accounts: [santander, nubank], today: '2026-09-15' as ISODate },
    );

    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const { outflow, inflow } = buildTransferTransactions(validated.value, {
      outflowId: 'tx-out',
      inflowId: 'tx-in',
      now: '2026-09-15T12:00:00.000Z',
    });

    expect(outflow.type).toBe('expense');
    expect(outflow.accountId).toBe(santander.id);
    expect(outflow.amount.cents).toBe(50000);
    expect(outflow.description).toBe('Transferência → Nubank');

    expect(inflow.type).toBe('income');
    expect(inflow.accountId).toBe(nubank.id);
    expect(inflow.amount.cents).toBe(50000);
    expect(inflow.description).toBe('Transferência ← Santander');

    const newSantanderBalance = calculateBalance(santander.initialBalance, {
      income: Money.zero(),
      expense: outflow.amount,
    });
    const newNubankBalance = calculateBalance(nubank.initialBalance, {
      income: inflow.amount,
      expense: Money.zero(),
    });

    expect(newSantanderBalance.cents).toBe(150000); // R$ 2.000 - R$ 500 = R$ 1.500
    expect(newNubankBalance.cents).toBe(150000); // R$ 1.000 + R$ 500 = R$ 1.500
  });

  it('rejeita transferência para a mesma conta ou com valor zerado', () => {
    const sameAccount = validateTransfer(
      {
        amount: Money.fromCents(10000),
        fromAccountId: santander.id,
        toAccountId: santander.id,
        date: '2026-09-15' as ISODate,
      },
      { accounts: [santander, nubank], today: '2026-09-15' as ISODate },
    );
    expect(sameAccount.ok).toBe(false);
    if (!sameAccount.ok) {
      expect(sameAccount.error.toAccountId).toBeDefined();
    }

    const zeroAmount = validateTransfer(
      {
        amount: Money.zero(),
        fromAccountId: santander.id,
        toAccountId: nubank.id,
        date: '2026-09-15' as ISODate,
      },
      { accounts: [santander, nubank], today: '2026-09-15' as ISODate },
    );
    expect(zeroAmount.ok).toBe(false);
  });
});

