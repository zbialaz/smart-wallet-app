import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import {
  calculateBalance,
  validateAccount,
  type Account,
  type AccountDraft,
  type AccountField,
  type AccountWithBalance,
} from '@/domains/accounts/account';
import { createAccountRepository } from '@/domains/accounts/account-repository';
import {
  hashPassword,
  validateLogin,
  validateRegister,
  validateSocialAuth,
  type AuthField,
  type LoginDraft,
  type RegisterDraft,
  type SocialAuthDraft,
  type User,
} from '@/domains/auth/user';
import { createUserRepository } from '@/domains/auth/user-repository';
import type { Category } from '@/domains/categories/category';
import { createCategoryRepository } from '@/domains/categories/category-repository';
import {
  validateTransaction,
  type Transaction,
  type TransactionDraft,
  type TransactionField,
} from '@/domains/transactions/transaction';
import { createTransactionRepository } from '@/domains/transactions/transaction-repository';
import { currentYearMonth, today, type YearMonth } from '@/shared/date';
import { generateId, nowISO } from '@/shared/id';
import { fail, ok, type FieldErrors, type Result } from '@/shared/result';
import { useThemeStore, type ThemeMode } from '@/ui/theme';

/**
 * WALLET STORE — a camada de APLICAÇÃO (casos de uso).
 *
 * Cada ação segue sempre o mesmo roteiro:
 *   1. Valida com o DOMÍNIO (funções puras: validateRegister, validateLogin, validateTransaction, validateAccount)
 *   2. Persiste via REPOSITÓRIO (SQL)
 *   3. Recarrega o estado → as telas re-renderizam sozinhas
 *
 * As telas NÃO falam com o banco nem conhecem regras: só chamam ações e leem estado.
 */

type Repositories = {
  users: ReturnType<typeof createUserRepository>;
  accounts: ReturnType<typeof createAccountRepository>;
  categories: ReturnType<typeof createCategoryRepository>;
  transactions: ReturnType<typeof createTransactionRepository>;
};

interface WalletState {
  db: SQLiteDatabase | null;
  repos: Repositories | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;

  currentUser: User | null;
  themeMode: ThemeMode;
  selectedMonth: YearMonth;
  accounts: AccountWithBalance[];
  categories: Category[];
  /** Transações do mês selecionado. */
  transactions: Transaction[];

  init(db: SQLiteDatabase): Promise<void>;
  refresh(): Promise<void>;
  setMonth(month: YearMonth): Promise<void>;
  setThemeMode(mode: ThemeMode): Promise<void>;
  toggleTheme(currentlyDark: boolean): Promise<void>;
  toggleBalanceHidden(): Promise<void>;

  /** Autenticação e ciclo de vida da conta de usuário */
  registerUser(draft: RegisterDraft): Promise<Result<User, FieldErrors<AuthField>>>;
  loginUser(draft: LoginDraft): Promise<Result<User, FieldErrors<AuthField>>>;
  loginWithSocial(draft: SocialAuthDraft): Promise<Result<User, FieldErrors<AuthField>>>;
  updateUserName(name: string): Promise<Result<User, string>>;
  signOut(): Promise<void>;
  deleteUserAccount(): Promise<void>;

  /** Contas bancárias e transações */
  createAccount(draft: AccountDraft): Promise<Result<Account, FieldErrors<AccountField>>>;
  deleteBankAccount(accountId: string): Promise<void>;
  /** Cria (sem id) ou edita (com id) uma transação — US-001, US-002, US-003. */
  saveTransaction(
    draft: TransactionDraft,
    id?: string,
  ): Promise<Result<Transaction, FieldErrors<TransactionField>>>;
  deleteTransaction(id: string): Promise<void>; // US-004
  findTransaction(id: string): Promise<Transaction | null>;
}

export const useWallet = create<WalletState>()((set, get) => {
  const requireRepos = (): Repositories => {
    const repos = get().repos;
    if (!repos) throw new Error('Store não inicializada: chame init(db) primeiro');
    return repos;
  };

  return {
    db: null,
    repos: null,
    status: 'idle',
    errorMessage: null,
    currentUser: null,
    themeMode: 'system',
    selectedMonth: currentYearMonth(),
    accounts: [],
    categories: [],
    transactions: [],

    async init(db) {
      const repos: Repositories = {
        users: createUserRepository(db),
        accounts: createAccountRepository(db),
        categories: createCategoryRepository(db),
        transactions: createTransactionRepository(db),
      };

      set({
        db,
        status: 'loading',
        repos,
      });

      try {
        const savedTheme = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'theme_mode'`,
        );
        if (
          savedTheme &&
          (savedTheme.value === 'light' || savedTheme.value === 'dark' || savedTheme.value === 'system')
        ) {
          useThemeStore.getState().setMode(savedTheme.value);
          set({ themeMode: savedTheme.value });
        }

        const savedHidden = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'privacy_hidden'`,
        );
        if (savedHidden) {
          useThemeStore.getState().setBalanceHidden(savedHidden.value === '1');
        }

        const savedUserRow = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'current_user_id'`,
        );
        if (savedUserRow?.value) {
          const user = await repos.users.findById(savedUserRow.value);
          set({ currentUser: user });
        }

        await get().refresh();
        set({ status: 'ready' });
      } catch (e) {
        set({ status: 'error', errorMessage: e instanceof Error ? e.message : String(e) });
      }
    },

    /** Recarrega tudo do banco para o usuário autenticado. */
    async refresh() {
      const repos = requireRepos();
      const user = get().currentUser;
      const categories = await repos.categories.listAll();

      if (!user) {
        set({ accounts: [], categories, transactions: [] });
        return;
      }

      const [accountTotals, transactions] = await Promise.all([
        repos.accounts.listActiveWithTotals(user.id),
        repos.transactions.listByMonth(get().selectedMonth, user.id),
      ]);

      // RN-05: o saldo é calculado pelo domínio a partir dos totais
      const accounts = accountTotals.map(({ account, income, expense }) => ({
        ...account,
        balance: calculateBalance(account.initialBalance, { income, expense }),
      }));

      set({ accounts, categories, transactions });
    },

    async setMonth(month) {
      set({ selectedMonth: month });
      const user = get().currentUser;
      if (!user) return;
      const transactions = await requireRepos().transactions.listByMonth(month, user.id);
      set({ transactions });
    },

    async setThemeMode(mode) {
      useThemeStore.getState().setMode(mode);
      set({ themeMode: mode });
      const db = get().db;
      if (db) {
        await db.runAsync(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('theme_mode', ?)`,
          mode,
        );
      }
    },

    async toggleTheme(currentlyDark) {
      const next: ThemeMode = currentlyDark ? 'light' : 'dark';
      await get().setThemeMode(next);
    },

    async toggleBalanceHidden() {
      const next = !useThemeStore.getState().isBalanceHidden;
      useThemeStore.getState().setBalanceHidden(next);
      const db = get().db;
      if (db) {
        await db.runAsync(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('privacy_hidden', ?)`,
          next ? '1' : '0',
        );
      }
    },

    async registerUser(draft) {
      const repos = requireRepos();
      const existingEmails = await repos.users.listEmails();
      const result = validateRegister(draft, existingEmails);
      if (!result.ok) return result;

      const totalUsersBefore = await repos.users.countUsers();
      const user: User = {
        id: generateId(),
        name: result.value.name,
        email: result.value.email,
        createdAt: nowISO(),
      };
      const passwordHash = hashPassword(result.value.password, user.email);

      await repos.users.insert(user, passwordHash);

      // Se havia contas bancárias criadas antes do sistema de login, vincula ao 1º usuário
      if (totalUsersBefore === 0) {
        await repos.accounts.attachOrphanAccountsToUser(user.id);
      }

      const db = get().db;
      if (db) {
        await db.runAsync(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('current_user_id', ?)`,
          user.id,
        );
      }

      set({ currentUser: user });
      await get().refresh();
      return ok(user);
    },

    async loginUser(draft) {
      const repos = requireRepos();
      const result = validateLogin(draft);
      if (!result.ok) return result;

      const found = await repos.users.findByEmail(result.value.email);
      if (!found) {
        return fail({ email: 'Nenhuma conta encontrada com este e-mail' });
      }

      const expectedHash = hashPassword(result.value.password, found.user.email);
      if (expectedHash !== found.passwordHash) {
        return fail({ password: 'Senha incorreta' });
      }

      const db = get().db;
      if (db) {
        await db.runAsync(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('current_user_id', ?)`,
          found.user.id,
        );
      }

      set({ currentUser: found.user });
      await get().refresh();
      return ok(found.user);
    },

    async loginWithSocial(draft) {
      const repos = requireRepos();
      const validated = validateSocialAuth(draft);
      if (!validated.ok) return validated;

      const existing = await repos.users.findByEmail(validated.value.email);
      let user: User;

      if (existing) {
        user = existing.user;
      } else {
        const totalUsersBefore = await repos.users.countUsers();
        user = {
          id: generateId(),
          name: validated.value.name,
          email: validated.value.email,
          createdAt: nowISO(),
        };
        const socialTokenHash = hashPassword(
          `oauth:${validated.value.provider}:${draft.providerId ?? user.id}`,
          user.email,
        );
        await repos.users.insert(user, socialTokenHash);

        if (totalUsersBefore === 0) {
          await repos.accounts.attachOrphanAccountsToUser(user.id);
        }
      }

      const db = get().db;
      if (db) {
        await db.runAsync(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('current_user_id', ?)`,
          user.id,
        );
      }

      set({ currentUser: user });
      await get().refresh();
      return ok(user);
    },

    async updateUserName(name) {
      const repos = requireRepos();
      const user = get().currentUser;
      if (!user) return fail('Usuário não autenticado');

      const trimmed = name.trim();
      if (trimmed.length < 2) {
        return fail('O nome deve ter pelo menos 2 caracteres');
      }

      await repos.users.updateName(user.id, trimmed);
      const updated: User = { ...user, name: trimmed };
      set({ currentUser: updated });
      return ok(updated);
    },

    async signOut() {
      const db = get().db;
      if (db) {
        await db.runAsync(`DELETE FROM settings WHERE key = 'current_user_id'`);
      }
      set({ currentUser: null, accounts: [], transactions: [] });
    },

    async deleteUserAccount() {
      const repos = requireRepos();
      const user = get().currentUser;
      if (!user) return;
      await repos.users.deleteUserAndData(user.id);
      set({ currentUser: null, accounts: [], transactions: [] });
    },

    async createAccount(draft) {
      const user = get().currentUser;
      if (!user) {
        return fail({ name: 'Faça login antes de criar uma conta bancária' });
      }

      const existingNames = get().accounts.map((a) => a.name);
      const result = validateAccount(draft, existingNames);
      if (!result.ok) return result;

      const account: Account = {
        id: generateId(),
        ...result.value,
        createdAt: nowISO(),
        archivedAt: null,
      };
      await requireRepos().accounts.insert(account, user.id);
      await get().refresh();
      return ok(account);
    },

    async deleteBankAccount(accountId) {
      const user = get().currentUser;
      if (!user) return;
      await requireRepos().accounts.remove(accountId, user.id);
      await get().refresh();
    },

    async saveTransaction(draft, id) {
      const repos = requireRepos();
      const original = id ? await repos.transactions.findById(id) : undefined;
      if (id && !original) {
        return fail({ amount: 'Transação não encontrada (pode ter sido excluída)' });
      }

      const result = validateTransaction(draft, {
        accounts: get().accounts,
        categories: get().categories,
        today: today(),
        original: original ?? undefined,
      });
      if (!result.ok) return result;

      const now = nowISO();
      const transaction: Transaction = original
        ? { ...original, ...result.value, updatedAt: now }
        : { id: generateId(), ...result.value, createdAt: now, updatedAt: now };

      if (original) await repos.transactions.update(transaction);
      else await repos.transactions.insert(transaction);

      // Não há saldo para "recalcular" (RN-05): basta recarregar.
      await get().refresh();
      return ok(transaction);
    },

    async deleteTransaction(id) {
      await requireRepos().transactions.delete(id);
      await get().refresh();
    },

    async findTransaction(id) {
      return requireRepos().transactions.findById(id);
    },
  };
});
