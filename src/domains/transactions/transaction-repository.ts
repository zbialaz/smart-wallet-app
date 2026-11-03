import type { SQLiteDatabase } from 'expo-sqlite';

import type { MonthlyTotalRow } from '@/domains/dashboard/trends';
import { monthRange, type YearMonth } from '@/shared/date';
import { Money } from '@/shared/money';
import type { TransactionType } from '@/shared/transaction-type';

import type { Transaction } from './transaction';

interface TransactionRow {
  id: string;
  type: TransactionType;
  amount_cents: number;
  description: string | null;
  category_id: string;
  account_id: string;
  date: string;
  created_at: string;
  updated_at: string;
}

const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  amount: Money.fromCents(row.amount_cents),
  description: row.description,
  categoryId: row.category_id,
  accountId: row.account_id,
  date: row.date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createTransactionRepository(db: SQLiteDatabase) {
  return {
    /** Transações de um mês do usuário logado, das mais recentes para as mais antigas. */
    async listByMonth(month: YearMonth, userId: string): Promise<Transaction[]> {
      const { start, end } = monthRange(month);
      const rows = await db.getAllAsync<TransactionRow>(
        `SELECT t.* FROM transactions t
         INNER JOIN accounts a ON a.id = t.account_id
         WHERE a.user_id = ? AND t.date >= ? AND t.date < ?
         ORDER BY t.date DESC, t.created_at DESC`,
        userId,
        start,
        end,
      );
      return rows.map(toTransaction);
    },

    /**
     * Totais por mês e tipo, de `fromMonth` até `toMonth` (inclusive), do usuário logado.
     * Uma única consulta agregada alimenta o comparativo (US-015) e o gráfico (US-014).
     */
    async monthlyTotals(
      fromMonth: YearMonth,
      toMonth: YearMonth,
      userId: string,
    ): Promise<MonthlyTotalRow[]> {
      const { start } = monthRange(fromMonth);
      const { end } = monthRange(toMonth);
      const rows = await db.getAllAsync<{ month: string; type: TransactionType; total: number }>(
        `SELECT substr(t.date, 1, 7) AS month, t.type AS type, SUM(t.amount_cents) AS total
         FROM transactions t
         INNER JOIN accounts a ON a.id = t.account_id
         WHERE a.user_id = ? AND t.date >= ? AND t.date < ?
         GROUP BY month, t.type`,
        userId,
        start,
        end,
      );
      return rows.map((r) => ({ month: r.month, type: r.type, totalCents: r.total }));
    },

    async findById(id: string): Promise<Transaction | null> {
      const row = await db.getFirstAsync<TransactionRow>(
        'SELECT * FROM transactions WHERE id = ?',
        id,
      );
      return row ? toTransaction(row) : null;
    },

    async insert(t: Transaction): Promise<void> {
      await db.runAsync(
        `INSERT INTO transactions
           (id, type, amount_cents, description, category_id, account_id, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id, t.type, t.amount.cents, t.description, t.categoryId, t.accountId,
        t.date, t.createdAt, t.updatedAt,
      );
    },

    async update(t: Transaction): Promise<void> {
      await db.runAsync(
        `UPDATE transactions
         SET type = ?, amount_cents = ?, description = ?, category_id = ?,
             account_id = ?, date = ?, updated_at = ?
         WHERE id = ?`,
        t.type, t.amount.cents, t.description, t.categoryId, t.accountId,
        t.date, t.updatedAt, t.id,
      );
    },

    async delete(id: string): Promise<void> {
      await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
    },
  };
}

export type TransactionRepository = ReturnType<typeof createTransactionRepository>;
