import { Money } from '@/shared/money';
import { fail, ok, type FieldErrors, type Result } from '@/shared/result';

/**
 * Account (Conta) — ENTITY.
 * Tem identidade (id): duas contas "Nubank" com mesmo saldo continuam sendo contas diferentes.
 *
 * Note que NÃO existe campo `balance` aqui (RN-05): o saldo é sempre calculado.
 */
export interface Account {
  id: string;
  name: string;
  color: string;
  initialBalance: Money;
  createdAt: string;
  archivedAt: string | null;
}

/** Conta + saldo calculado, pronta para exibir na tela. */
export interface AccountWithBalance extends Account {
  balance: Money;
}

export interface AccountDraft {
  name: string;
  color: string;
  initialBalance: Money;
}

export type AccountField = 'name' | 'initialBalance';

export const ACCOUNT_NAME_MAX_LENGTH = 30;

/** Bancos sugeridos no cadastro (só atalhos de UI — o usuário pode digitar qualquer nome). */
export const BANK_PRESETS: { name: string; color: string }[] = [
  { name: 'Nubank', color: '#8A05BE' },
  { name: 'Santander', color: '#EC0000' },
  { name: 'Itaú', color: '#EC7000' },
  { name: 'Inter', color: '#FF7A00' },
  { name: 'Bradesco', color: '#CC092F' },
  { name: 'C6 Bank', color: '#4B4B4B' },
  { name: 'Banco do Brasil', color: '#F8D117' },
  { name: 'Caixa', color: '#005CA9' },
  { name: 'Carteira', color: '#2ED3A0' },
];

export const DEFAULT_ACCOUNT_COLOR = '#7C5CFF';

/**
 * Valida os dados de uma nova conta.
 * @param existingNames nomes das contas ATIVAS já cadastradas (para RN-07).
 */
export function validateAccount(
  draft: AccountDraft,
  existingNames: string[],
): Result<AccountDraft, FieldErrors<AccountField>> {
  const errors: FieldErrors<AccountField> = {};
  const name = draft.name.trim();

  if (!name) {
    errors.name = 'Informe o nome da conta';
  } else if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
    errors.name = `Máximo de ${ACCOUNT_NAME_MAX_LENGTH} caracteres`;
  } else if (existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) {
    // RN-07: nome único entre contas ativas (sem diferenciar maiúsculas)
    errors.name = 'Já existe uma conta com esse nome';
  }

  if (draft.initialBalance.isNegative()) {
    // RN-11: no MVP, saldo inicial não pode ser negativo
    errors.initialBalance = 'O saldo inicial não pode ser negativo';
  }

  if (Object.keys(errors).length > 0) return fail(errors);
  return ok({ ...draft, name });
}

/**
 * RN-05: saldo = saldo inicial + receitas − gastos.
 * Função pura: recebe os totais e devolve o saldo. Quem busca os totais é o repositório.
 */
export function calculateBalance(
  initialBalance: Money,
  totals: { income: Money; expense: Money },
): Money {
  return initialBalance.add(totals.income).subtract(totals.expense);
}

/** Saldo consolidado: soma de todas as contas ativas (US-007.3). */
export function consolidatedBalance(accounts: AccountWithBalance[]): Money {
  return Money.sum(accounts.filter((a) => a.archivedAt === null).map((a) => a.balance));
}
