import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';

/**
 * MIGRAÇÕES DO BANCO
 *
 * Cada item do array é uma versão do schema. O SQLite guarda a versão atual
 * em `PRAGMA user_version`. Ao abrir o app, rodamos só as migrações que faltam.
 *
 * REGRA DE OURO: nunca edite uma migração que já foi para o celular de alguém.
 * Precisa mudar o schema? Adicione uma NOVA migração no fim do array.
 */
type Migration = (db: SQLiteDatabase) => Promise<void>;

const MIGRATIONS: Migration[] = [
  // v1 — schema inicial do MVP
  async (db) => {
    await db.execAsync(`
      CREATE TABLE accounts (
        id                    TEXT PRIMARY KEY NOT NULL,
        name                  TEXT NOT NULL,
        color                 TEXT NOT NULL,
        initial_balance_cents INTEGER NOT NULL DEFAULT 0,
        created_at            TEXT NOT NULL,
        archived_at           TEXT
      );

      CREATE TABLE categories (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        icon        TEXT NOT NULL,
        color       TEXT NOT NULL,
        type        TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        is_default  INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT
      );

      CREATE TABLE transactions (
        id           TEXT PRIMARY KEY NOT NULL,
        type         TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),            -- RN-01, RN-02
        description  TEXT,
        category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT, -- RN-08
        account_id   TEXT NOT NULL REFERENCES accounts(id)   ON DELETE RESTRICT, -- RN-08
        date         TEXT NOT NULL,                                         -- 'YYYY-MM-DD'
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      -- Índices: aceleram as consultas mais comuns (por mês, por conta, por categoria)
      CREATE INDEX idx_transactions_date     ON transactions(date);
      CREATE INDEX idx_transactions_account  ON transactions(account_id);
      CREATE INDEX idx_transactions_category ON transactions(category_id);
    `);

    // Seed das categorias padrão (US-010)
    for (const c of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default)
         VALUES (?, ?, ?, ?, ?, 1)`,
        c.id, c.name, c.icon, c.color, c.type,
      );
    }
  },
];

export const DATABASE_NAME = 'smart-wallet.db';
export const SCHEMA_VERSION = MIGRATIONS.length;

/** Chamado pelo <SQLiteProvider onInit>: roda antes de qualquer tela usar o banco. */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  // Configurações de conexão ficam FORA da transação
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > SCHEMA_VERSION) {
    throw new Error(`Banco na versão ${current}, mas o app só conhece até ${SCHEMA_VERSION}`);
  }
  if (current === SCHEMA_VERSION) return;

  // Tudo numa transação: se uma migração falhar, nada é aplicado (rollback)
  await db.withTransactionAsync(async () => {
    for (let version = current; version < SCHEMA_VERSION; version++) {
      await MIGRATIONS[version](db);
    }
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}
