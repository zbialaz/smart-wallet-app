import type { SQLiteDatabase } from 'expo-sqlite';

import type { TransactionType } from '@/shared/transaction-type';

import type { Category } from './category';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  is_default: number; // SQLite não tem boolean: 0 ou 1
  archived_at: string | null;
}

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  type: row.type,
  isDefault: row.is_default === 1,
  archivedAt: row.archived_at,
});

export function createCategoryRepository(db: SQLiteDatabase) {
  return {
    /**
     * Padrão (user_id NULL) + personalizadas do usuário informado.
     * Inclui arquivadas (para exibir transações antigas). Padrão primeiro.
     */
    async listAll(userId?: string): Promise<Category[]> {
      const rows = userId
        ? await db.getAllAsync<CategoryRow>(
            `SELECT * FROM categories
             WHERE user_id IS NULL OR user_id = ?
             ORDER BY is_default DESC, rowid`,
            userId,
          )
        : await db.getAllAsync<CategoryRow>(
            `SELECT * FROM categories WHERE user_id IS NULL ORDER BY is_default DESC, rowid`,
          );
      return rows.map(toCategory);
    },

    /** US-011: cria categoria personalizada do usuário (nunca padrão). */
    async insert(category: Category, userId: string): Promise<void> {
      await db.runAsync(
        `INSERT INTO categories (id, name, icon, color, type, is_default, archived_at, user_id)
         VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
        category.id, category.name, category.icon, category.color, category.type, userId,
      );
    },

    /** US-024: edita nome/ícone/cor de categoria personalizada do usuário (RN-09 protege as padrão). */
    async update(
      id: string,
      userId: string,
      fields: { name: string; icon: string; color: string },
    ): Promise<void> {
      await db.runAsync(
        `UPDATE categories SET name = ?, icon = ?, color = ?
         WHERE id = ? AND user_id = ? AND is_default = 0`,
        fields.name, fields.icon, fields.color, id, userId,
      );
    },

    /** US-024 / RN-08: arquiva sem apagar o histórico. */
    async archive(id: string, userId: string, archivedAt: string): Promise<void> {
      await db.runAsync(
        `UPDATE categories SET archived_at = ?
         WHERE id = ? AND user_id = ? AND is_default = 0`,
        archivedAt, id, userId,
      );
    },

    /** RN-08: só pode ser apagada se NÃO tiver transações. */
    async remove(id: string, userId: string): Promise<void> {
      await db.runAsync(
        `DELETE FROM categories WHERE id = ? AND user_id = ? AND is_default = 0`,
        id, userId,
      );
    },

    async countTransactions(categoryId: string): Promise<number> {
      const row = await db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) AS total FROM transactions WHERE category_id = ?',
        categoryId,
      );
      return row?.total ?? 0;
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
