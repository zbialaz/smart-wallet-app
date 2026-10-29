import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account } from '@/domains/accounts/account';
import { Money } from '@/shared/money';

/**
 * REPOSITÓRIO — a ponte entre o domínio e o banco.
 *
 * - O domínio fala em `Account` com `Money`.
 * - O banco fala em linhas com `initial_balance_cents` (snake_case, números).
 * O repositório traduz um no outro (mapper) e esconde o SQL do resto do app.
 */

interface AccountRow {
  id: string;
  name: string;
  color: string;
  initial_balance_cents: number;
  created_at: string;
  archived_at: string | null;
}

interface AccountTotalsRow extends AccountRow {
  income_cents: number;
  expense_cents: number;
}

const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  name: row.name,
  color: row.color,
  initialBalance: Money.fromCents(row.initial_balance_cents),
  createdAt: row.created_at,
  archivedAt: row.archived_at,
});

export interface AccountWithTotals {
  account: Account;
  income: Money;
  expense: Money;
}

export function createAccountRepository(db: SQLiteDatabase) {
  return {
    /**
     * Contas ativas + total de receitas e gastos de TODA a história de cada uma.
     * O cálculo final do saldo (RN-05) é feito pelo domínio, não pelo SQL.
     */
    async listActiveWithTotals(): Promise<AccountWithTotals[]> {
      const rows = await db.getAllAsync<AccountTotalsRow>(`
        SELECT a.*,
          COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount_cents END), 0) AS income_cents,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents END), 0) AS expense_cents
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id
        WHERE a.archived_at IS NULL
        GROUP BY a.id
        ORDER BY a.created_at
      `);
      return rows.map((row) => ({
        account: toAccount(row),
        income: Money.fromCents(row.income_cents),
        expense: Money.fromCents(row.expense_cents),
      }));
    },

    async insert(account: Account): Promise<void> {
      await db.runAsync(
        `INSERT INTO accounts (id, name, color, initial_balance_cents, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        account.id,
        account.name,
        account.color,
        account.initialBalance.cents,
        account.createdAt,
        account.archivedAt,
      );
    },
  };
}

export type AccountRepository = ReturnType<typeof createAccountRepository>;
