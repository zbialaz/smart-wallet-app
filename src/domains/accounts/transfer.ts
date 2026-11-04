import { OTHER_EXPENSE_CATEGORY_ID } from '@/domains/categories/category';
import { DESCRIPTION_MAX_LENGTH, type Transaction } from '@/domains/transactions/transaction';
import { isValidISODate, type ISODate } from '@/shared/date';
import type { Money } from '@/shared/money';
import { fail, ok, type FieldErrors, type Result } from '@/shared/result';

import type { Account } from './account';

/**
 * US-009 — Transferência entre contas bancárias.
 *
 * Modela uma transferência como o par atômico (saída da conta origem + entrada na conta destino),
 * preservando a regra RN-05 (saldo = saldo inicial + receitas − gastos) sem precisar de
 * coluna extra no banco e mantendo o saldo consolidado inalterado.
 */
export const OTHER_INCOME_CATEGORY_ID = 'cat-other-income';

export interface TransferDraft {
  amount: Money;
  fromAccountId: string | null;
  toAccountId: string | null;
  date: ISODate;
  description?: string;
}

export interface ValidTransfer {
  amount: Money;
  fromAccount: Account;
  toAccount: Account;
  date: ISODate;
  description: string | null;
}

export type TransferField = 'amount' | 'fromAccountId' | 'toAccountId' | 'date' | 'description';

export function validateTransfer(
  draft: TransferDraft,
  ctx: { accounts: Account[]; today: ISODate },
): Result<ValidTransfer, FieldErrors<TransferField>> {
  const errors: FieldErrors<TransferField> = {};

  if (!draft.amount.isPositive()) {
    errors.amount = 'Informe um valor maior que zero';
  }

  const fromAccount = ctx.accounts.find((a) => a.id === draft.fromAccountId && a.archivedAt === null);
  if (!draft.fromAccountId) {
    errors.fromAccountId = 'Selecione a conta de origem';
  } else if (!fromAccount) {
    errors.fromAccountId = 'Conta de origem não encontrada';
  }

  const toAccount = ctx.accounts.find((a) => a.id === draft.toAccountId && a.archivedAt === null);
  if (!draft.toAccountId) {
    errors.toAccountId = 'Selecione a conta de destino';
  } else if (!toAccount) {
    errors.toAccountId = 'Conta de destino não encontrada';
  } else if (draft.fromAccountId && draft.fromAccountId === draft.toAccountId) {
    errors.toAccountId = 'A conta de destino deve ser diferente da origem';
  }

  if (!isValidISODate(draft.date)) {
    errors.date = 'Data inválida';
  } else if (draft.date > ctx.today) {
    errors.date = 'A data não pode ser no futuro';
  }

  const rawDesc = (draft.description ?? '').trim();
  if (rawDesc.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Máximo de ${DESCRIPTION_MAX_LENGTH} caracteres`;
  }

  if (Object.keys(errors).length > 0 || !fromAccount || !toAccount) {
    return fail(errors);
  }

  return ok({
    amount: draft.amount,
    fromAccount,
    toAccount,
    date: draft.date,
    description: rawDesc || null,
  });
}

export function buildTransferTransactions(
  valid: ValidTransfer,
  meta: { outflowId: string; inflowId: string; now: string },
): { outflow: Transaction; inflow: Transaction } {
  const prefix = valid.description ?? 'Transferência';
  const outflowDesc = `${prefix} → ${valid.toAccount.name}`.slice(0, DESCRIPTION_MAX_LENGTH);
  const inflowDesc = `${prefix} ← ${valid.fromAccount.name}`.slice(0, DESCRIPTION_MAX_LENGTH);

  return {
    outflow: {
      id: meta.outflowId,
      type: 'expense',
      amount: valid.amount,
      description: outflowDesc,
      categoryId: OTHER_EXPENSE_CATEGORY_ID,
      accountId: valid.fromAccount.id,
      date: valid.date,
      createdAt: meta.now,
      updatedAt: meta.now,
    },
    inflow: {
      id: meta.inflowId,
      type: 'income',
      amount: valid.amount,
      description: inflowDesc,
      categoryId: OTHER_INCOME_CATEGORY_ID,
      accountId: valid.toAccount.id,
      date: valid.date,
      createdAt: meta.now,
      updatedAt: meta.now,
    },
  };
}

