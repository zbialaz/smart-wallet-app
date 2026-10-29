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
    /** Todas (inclusive arquivadas, para exibir transações antigas). Padrão primeiro. */
    async listAll(): Promise<Category[]> {
      const rows = await db.getAllAsync<CategoryRow>(
        'SELECT * FROM categories ORDER BY is_default DESC, rowid',
      );
      return rows.map(toCategory);
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
