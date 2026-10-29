import type { Account } from '@/domains/accounts/account';
import type { Category } from '@/domains/categories/category';
import { isValidISODate, type ISODate } from '@/shared/date';
import type { Money } from '@/shared/money';
import { fail, ok, type FieldErrors, type Result } from '@/shared/result';
import type { TransactionType } from '@/shared/transaction-type';

/**
 * Transaction (Transação) — ENTITY.
 * Gasto e Receita são a MESMA entidade, diferenciados por `type`.
 *
 * Referencia conta e categoria por ID (não pelo objeto inteiro):
 * isso mantém os contextos desacoplados.
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: Money; // sempre positivo (RN-01); o "sinal" vem do type
  description: string | null;
  categoryId: string;
  accountId: string;
  date: ISODate;
  createdAt: string;
  updatedAt: string;
}

/** Dados vindos do formulário, antes de virar uma Transaction. */
export interface TransactionDraft {
  type: TransactionType;
  amount: Money;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  date: ISODate;
}

/** Draft já validado: campos obrigatórios garantidos pelo tipo. */
export interface ValidTransactionDraft {
  type: TransactionType;
  amount: Money;
  description: string | null;
  categoryId: string;
  accountId: string;
  date: ISODate;
}

export type TransactionField = 'amount' | 'description' | 'categoryId' | 'accountId' | 'date';

export const DESCRIPTION_MAX_LENGTH = 80;

export interface ValidationContext {
  accounts: Account[];
  categories: Category[];
  today: ISODate;
  /** Na edição, a transação original (RN-10 permite manter conta/categoria já arquivada). */
  original?: Transaction;
}

/**
 * Aplica todas as regras de negócio de uma transação.
 * Função PURA: mesmo input → mesmo output, sem banco, sem tela. Por isso é fácil de testar.
 */
export function validateTransaction(
  draft: TransactionDraft,
  ctx: ValidationContext,
): Result<ValidTransactionDraft, FieldErrors<TransactionField>> {
  const errors: FieldErrors<TransactionField> = {};

  // RN-01: valor maior que zero
  if (!draft.amount.isPositive()) {
    errors.amount = 'Informe um valor maior que zero';
  }

  // RN-03 + RN-10: conta obrigatória, existente e não arquivada
  const account = ctx.accounts.find((a) => a.id === draft.accountId);
  if (!draft.accountId) {
    errors.accountId = 'Selecione uma conta';
  } else if (!account) {
    errors.accountId = 'Conta não encontrada';
  } else if (account.archivedAt && account.id !== ctx.original?.accountId) {
    errors.accountId = 'Esta conta está arquivada';
  }

  // RN-03 + RN-04 + RN-10: categoria obrigatória, do mesmo tipo e não arquivada
  const category = ctx.categories.find((c) => c.id === draft.categoryId);
  if (!draft.categoryId) {
    errors.categoryId = 'Selecione uma categoria';
  } else if (!category) {
    errors.categoryId = 'Categoria não encontrada';
  } else if (category.type !== draft.type) {
    errors.categoryId =
      draft.type === 'expense'
        ? 'Escolha uma categoria de gasto'
        : 'Escolha uma categoria de receita';
  } else if (category.archivedAt && category.id !== ctx.original?.categoryId) {
    errors.categoryId = 'Esta categoria está arquivada';
  }

  // RN-06: data válida e não futura (comparação de strings funciona em 'YYYY-MM-DD')
  if (!isValidISODate(draft.date)) {
    errors.date = 'Data inválida';
  } else if (draft.date > ctx.today) {
    errors.date = 'A data não pode ser no futuro';
  }

  const description = draft.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Máximo de ${DESCRIPTION_MAX_LENGTH} caracteres`;
  }

  if (Object.keys(errors).length > 0) return fail(errors);

  return ok({
    type: draft.type,
    amount: draft.amount,
    description: description || null,
    categoryId: draft.categoryId!,
    accountId: draft.accountId!,
    date: draft.date,
  });
}

/** Valor com sinal: + para receita, − para gasto. Usado em saldos e na lista. */
export function signedAmount(t: Pick<Transaction, 'type' | 'amount'>): Money {
  return t.type === 'income' ? t.amount : t.amount.negate();
}
