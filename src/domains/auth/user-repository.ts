import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeEmail, type User } from './user';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
});

export function createUserRepository(db: SQLiteDatabase) {
  return {
    async findById(id: string): Promise<User | null> {
      const row = await db.getFirstAsync<UserRow>(
        'SELECT * FROM users WHERE id = ?',
        id,
      );
      return row ? toUser(row) : null;
    },

    async findByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
      const normalized = normalizeEmail(email);
      const row = await db.getFirstAsync<UserRow>(
        'SELECT * FROM users WHERE LOWER(email) = ?',
        normalized,
      );
      if (!row) return null;
      return { user: toUser(row), passwordHash: row.password_hash };
    },

    async listEmails(): Promise<string[]> {
      const rows = await db.getAllAsync<{ email: string }>('SELECT email FROM users');
      return rows.map((r) => r.email);
    },

    async countUsers(): Promise<number> {
      const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM users');
      return row?.total ?? 0;
    },

    async insert(user: User, passwordHash: string): Promise<void> {
      await db.runAsync(
        `INSERT INTO users (id, name, email, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        user.id,
        user.name,
        normalizeEmail(user.email),
        passwordHash,
        user.createdAt,
      );
    },

    async updateName(userId: string, name: string): Promise<void> {
      await db.runAsync('UPDATE users SET name = ? WHERE id = ?', name.trim(), userId);
    },

    /**
     * Exclui permanentemente a conta do usuário e todos os seus dados financeiros
     * (transações das contas do usuário + contas bancárias do usuário + registro do usuário).
     */
    async deleteUserAndData(userId: string): Promise<void> {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `DELETE FROM transactions
           WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)`,
          userId,
        );
        await db.runAsync('DELETE FROM accounts WHERE user_id = ?', userId);
        await db.runAsync('DELETE FROM categories WHERE user_id = ?', userId);
        await db.runAsync('DELETE FROM users WHERE id = ?', userId);
        await db.runAsync('DELETE FROM settings WHERE key = ?', `monthly_budget:${userId}`);
        await db.runAsync('DELETE FROM settings WHERE key = ?', `learned_category_rules:${userId}`);
        await db.runAsync('DELETE FROM settings WHERE key = ?', `recurring_rules:${userId}`);
        await db.runAsync('DELETE FROM settings WHERE key = ?', `gemini_api_key:${userId}`);
        await db.runAsync(`DELETE FROM settings WHERE key = 'current_user_id'`);
      });
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;

