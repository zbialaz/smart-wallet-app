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
import {
  buildTransferTransactions,
  validateTransfer,
  type TransferDraft,
  type TransferField,
} from '@/domains/accounts/transfer';
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
import type { Category, CategoryDraft, CategoryField } from '@/domains/categories/category';
import {
  learnCategoryRule,
  parseLearnedRules,
  type LearnedCategoryRules,
} from '@/domains/categories/auto-classify';
import { canModifyCategory, validateCategory } from '@/domains/categories/category';
import { createCategoryRepository } from '@/domains/categories/category-repository';
import { buildCategoryBreakdown, type CategorySlice } from '@/domains/dashboard/summary';
import { buildMonthlyEvolution, type MonthlyTotals } from '@/domains/dashboard/trends';
import type { CategoryMonthlyStat } from '@/domains/insights/unusual-spending';
import {
  validateTransaction,
  type Transaction,
  type TransactionDraft,
  type TransactionField,
} from '@/domains/transactions/transaction';
import {
  materializeDueRecurringTransactions,
  normalizeDayOfMonth,
  parseRecurringRules,
  removeRecurringRule,
  toggleRecurringRule,
  type RecurringRule,
} from '@/domains/transactions/recurring';
import { createTransactionRepository } from '@/domains/transactions/transaction-repository';
import { validateBudget } from '@/domains/settings/budget';
import { addMonths, currentYearMonth, today, type YearMonth } from '@/shared/date';
import { useI18nStore, type AppLanguage } from '@/shared/i18n';
import { generateId, nowISO } from '@/shared/id';
import { Money } from '@/shared/money';
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

/** Janela do gráfico de evolução e do comparativo mensal (US-014 / US-015). */
const EVOLUTION_MONTHS = 6;

/** A meta mensal é por usuário: cada um guarda a sua em `settings`. */
const budgetKey = (userId: string) => `monthly_budget:${userId}`;
/** Regras aprendidas de categorização automática por usuário (US-016.3). */
const learnedRulesKey = (userId: string) => `learned_category_rules:${userId}`;
/** Transações recorrentes mensais por usuário (US-006). */
const recurringRulesKey = (userId: string) => `recurring_rules:${userId}`;

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
  language: AppLanguage;
  selectedMonth: YearMonth;
  accounts: AccountWithBalance[];
  categories: Category[];
  /** Transações do mês selecionado. */
  transactions: Transaction[];
  /** Totais dos últimos 6 meses terminando no mês selecionado (US-014 / US-015). */
  monthlyEvolution: MonthlyTotals[];
  /** US-019: meta de gastos mensal do usuário logado (null = sem meta). */
  monthlyBudget: Money | null;
  /** US-016.3: preferências de categorização aprendidas com o usuário. */
  learnedCategoryRules: LearnedCategoryRules;
  /** US-018: estatísticas mensais por categoria (últimos 6 meses) para alertas de gasto incomum. */
  categoryMonthlyStats: CategoryMonthlyStat[];
  /** US-006: regras de transações recorrentes mensais do usuário. */
  recurringRules: RecurringRule[];

  init(db: SQLiteDatabase): Promise<void>;
  refresh(): Promise<void>;
  setMonth(month: YearMonth): Promise<void>;
  setThemeMode(mode: ThemeMode): Promise<void>;
  setLanguage(lang: AppLanguage): Promise<void>;
  toggleTheme(currentlyDark: boolean): Promise<void>;
  toggleBalanceHidden(): Promise<void>;
  /** US-019: define (ou remove, com null) a meta de gastos mensal. */
  setMonthlyBudget(value: Money | null): Promise<Result<Money | null, string>>;

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
  /** US-009: transfere saldo entre duas contas do usuário. */
  transferBetweenAccounts(
    draft: TransferDraft,
  ): Promise<Result<{ outflow: Transaction; inflow: Transaction }, FieldErrors<TransferField>>>;
  /** Categorias personalizadas — US-011 (criar) e US-024 (editar/arquivar). */
  saveCategory(
    draft: CategoryDraft,
    id?: string,
  ): Promise<Result<Category, FieldErrors<CategoryField>>>;
  /** RN-08: sem transações → exclui; com transações → arquiva (preserva o histórico). */
  removeCategory(id: string): Promise<'deleted' | 'archived' | 'forbidden'>;
  /** Cria (sem id) ou edita (com id) uma transação — US-001, US-002, US-003, US-006. */
  saveTransaction(
    draft: TransactionDraft,
    id?: string,
    options?: { recurringDayOfMonth?: number },
  ): Promise<Result<Transaction, FieldErrors<TransactionField>>>;
  /** US-006.3: pausa ou reativa uma transação recorrente. */
  setRecurringRuleActive(ruleId: string, active: boolean): Promise<void>;
  /** US-006: remove uma regra de recorrência. */
  deleteRecurringRule(ruleId: string): Promise<void>;
  deleteTransaction(id: string): Promise<void>; // US-004
  findTransaction(id: string): Promise<Transaction | null>;
  /** US-014.3: detalhamento por categoria dos gastos de um mês específico. */
  loadMonthBreakdown(month: YearMonth): Promise<CategorySlice[]>;
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
    language: 'pt',
    selectedMonth: currentYearMonth(),
    accounts: [],
    categories: [],
    transactions: [],
    monthlyEvolution: [],
    monthlyBudget: null,
    learnedCategoryRules: {},
    categoryMonthlyStats: [],
    recurringRules: [],

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

        const savedLang = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'app_language'`,
        );
        if (
          savedLang &&
          (savedLang.value === 'pt' || savedLang.value === 'en' || savedLang.value === 'es')
        ) {
          useI18nStore.getState().setLanguage(savedLang.value);
          set({ language: savedLang.value });
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
      const categories = await repos.categories.listAll(user?.id);

      if (!user) {
        set({
          accounts: [],
          categories,
          transactions: [],
          monthlyEvolution: [],
          monthlyBudget: null,
          learnedCategoryRules: {},
          categoryMonthlyStats: [],
          recurringRules: [],
        });
        return;
      }

      const month = get().selectedMonth;
      const db = get().db;
      const recurringRow = await db?.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        recurringRulesKey(user.id),
      );
      let recurringRules = parseRecurringRules(recurringRow?.value);

      // US-006.2: materializa automaticamente transações recorrentes vencidas no mês atual/selecionado
      if (recurringRules.length > 0 && db) {
        const materialized = materializeDueRecurringTransactions({
          rules: recurringRules,
          targetMonth: month,
          today: today(),
          idGenerator: generateId,
          now: nowISO(),
        });
        if (materialized.changed) {
          recurringRules = materialized.updatedRules;
          for (const tx of materialized.transactionsToInsert) {
            await repos.transactions.insert(tx);
          }
          await db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            recurringRulesKey(user.id),
            JSON.stringify(recurringRules),
          );
        }
      }

      const fromMonth = addMonths(month, -(EVOLUTION_MONTHS - 1));
      const [accountTotals, transactions, totalRows, catStats, budgetRow, learnedRow] =
        await Promise.all([
          repos.accounts.listActiveWithTotals(user.id),
          repos.transactions.listByMonth(month, user.id),
          repos.transactions.monthlyTotals(fromMonth, month, user.id),
          repos.transactions.categoryMonthlyStats(fromMonth, month, user.id),
          db?.getFirstAsync<{ value: string }>(
            'SELECT value FROM settings WHERE key = ?',
            budgetKey(user.id),
          ),
          db?.getFirstAsync<{ value: string }>(
            'SELECT value FROM settings WHERE key = ?',
            learnedRulesKey(user.id),
          ),
        ]);
      const budgetCents = budgetRow ? Number(budgetRow.value) : NaN;

      // RN-05: o saldo é calculado pelo domínio a partir dos totais
      const accounts = accountTotals.map(({ account, income, expense }) => ({
        ...account,
        balance: calculateBalance(account.initialBalance, { income, expense }),
      }));

      set({
        accounts,
        categories,
        transactions,
        monthlyEvolution: buildMonthlyEvolution(totalRows, month, EVOLUTION_MONTHS),
        categoryMonthlyStats: catStats,
        monthlyBudget:
          Number.isSafeInteger(budgetCents) && budgetCents > 0 ? Money.fromCents(budgetCents) : null,
        learnedCategoryRules: parseLearnedRules(learnedRow?.value),
        recurringRules,
      });
    },

    async setMonth(month) {
      set({ selectedMonth: month });
      const user = get().currentUser;
      if (!user) return;
      const repos = requireRepos();
      const fromMonth = addMonths(month, -(EVOLUTION_MONTHS - 1));
      const [transactions, totalRows, catStats] = await Promise.all([
        repos.transactions.listByMonth(month, user.id),
        repos.transactions.monthlyTotals(fromMonth, month, user.id),
        repos.transactions.categoryMonthlyStats(fromMonth, month, user.id),
      ]);
      set({
        transactions,
        monthlyEvolution: buildMonthlyEvolution(totalRows, month, EVOLUTION_MONTHS),
        categoryMonthlyStats: catStats,
      });
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

    async setLanguage(lang) {
      useI18nStore.getState().setLanguage(lang);
      set({ language: lang });
      const db = get().db;
      if (db) {
        await db.runAsync(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('app_language', ?)`,
          lang,
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

    async setMonthlyBudget(value) {
      const user = get().currentUser;
      const db = get().db;
      if (!user || !db) return fail('Usuário não autenticado');

      if (value === null) {
        await db.runAsync('DELETE FROM settings WHERE key = ?', budgetKey(user.id));
        set({ monthlyBudget: null });
        return ok(null);
      }

      const validated = validateBudget(value);
      if (!validated.ok) return validated;

      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        budgetKey(user.id),
        String(validated.value.cents),
      );
      set({ monthlyBudget: validated.value });
      return ok(validated.value);
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
      set({
        currentUser: null,
        accounts: [],
        transactions: [],
        monthlyEvolution: [],
        monthlyBudget: null,
        learnedCategoryRules: {},
        categories: get().categories.filter((c) => c.isDefault),
      });
    },

    async deleteUserAccount() {
      const repos = requireRepos();
      const user = get().currentUser;
      if (!user) return;
      await repos.users.deleteUserAndData(user.id);
      set({
        currentUser: null,
        accounts: [],
        transactions: [],
        monthlyEvolution: [],
        monthlyBudget: null,
        learnedCategoryRules: {},
        categories: get().categories.filter((c) => c.isDefault),
      });
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

    async transferBetweenAccounts(draft) {
      const repos = requireRepos();
      const validated = validateTransfer(draft, {
        accounts: get().accounts,
        today: today(),
      });
      if (!validated.ok) return validated;

      const pair = buildTransferTransactions(validated.value, {
        outflowId: generateId(),
        inflowId: generateId(),
        now: nowISO(),
      });

      const db = get().db;
      if (db) {
        await db.withTransactionAsync(async () => {
          await repos.transactions.insert(pair.outflow);
          await repos.transactions.insert(pair.inflow);
        });
      } else {
        await repos.transactions.insert(pair.outflow);
        await repos.transactions.insert(pair.inflow);
      }

      await get().refresh();
      return ok(pair);
    },

    async saveCategory(draft, id) {
      const user = get().currentUser;
      if (!user) return fail({ name: 'Faça login antes de criar uma categoria' });

      const repos = requireRepos();
      const existing = id ? get().categories.find((c) => c.id === id) : undefined;
      if (id && (!existing || !canModifyCategory(existing))) {
        // RN-09: categoria padrão (ou inexistente) não pode ser editada
        return fail({ name: 'Esta categoria não pode ser editada' });
      }

      const result = validateCategory(draft, get().categories, id);
      if (!result.ok) return result;

      if (existing) {
        // O tipo não muda na edição (transações antigas dependem dele — RN-04)
        await repos.categories.update(existing.id, user.id, {
          name: result.value.name,
          icon: result.value.icon,
          color: result.value.color,
        });
        await get().refresh();
        return ok({ ...existing, ...result.value, type: existing.type });
      }

      const category: Category = {
        id: generateId(),
        ...result.value,
        isDefault: false,
        archivedAt: null,
      };
      await repos.categories.insert(category, user.id);
      await get().refresh();
      return ok(category);
    },

    async removeCategory(id) {
      const user = get().currentUser;
      const category = get().categories.find((c) => c.id === id);
      if (!user || !category || !canModifyCategory(category)) return 'forbidden';

      const repos = requireRepos();
      const used = await repos.categories.countTransactions(id);
      if (used > 0) {
        await repos.categories.archive(id, user.id, nowISO());
        await get().refresh();
        return 'archived';
      }
      await repos.categories.remove(id, user.id);
      await get().refresh();
      return 'deleted';
    },

    async saveTransaction(draft, id, options) {
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

      // US-016.3: aprende a associação descrição → categoria escolhida pelo usuário
      const user = get().currentUser;
      const db = get().db;
      if (user && db && transaction.description) {
        const currentRules = get().learnedCategoryRules;
        const nextRules = learnCategoryRule(
          currentRules,
          transaction.description,
          transaction.type,
          transaction.categoryId,
        );
        if (nextRules !== currentRules) {
          await db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            learnedRulesKey(user.id),
            JSON.stringify(nextRules),
          );
        }
      }

      // US-006.1: registra regra de recorrência mensal quando ativada na criação
      if (!original && user && db && options?.recurringDayOfMonth !== undefined) {
        const txMonth = transaction.date.slice(0, 7) as YearMonth;
        const newRule: RecurringRule = {
          id: generateId(),
          type: transaction.type,
          amountCents: transaction.amount.cents,
          description: transaction.description,
          categoryId: transaction.categoryId,
          accountId: transaction.accountId,
          dayOfMonth: normalizeDayOfMonth(options.recurringDayOfMonth),
          active: true,
          generatedMonths: [txMonth],
          createdAt: now,
        };
        const updatedRules = [...get().recurringRules, newRule];
        await db.runAsync(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          recurringRulesKey(user.id),
          JSON.stringify(updatedRules),
        );
      }

      // Não há saldo para "recalcular" (RN-05): basta recarregar.
      await get().refresh();
      return ok(transaction);
    },

    async setRecurringRuleActive(ruleId, active) {
      const user = get().currentUser;
      const db = get().db;
      if (!user || !db) return;
      const next = toggleRecurringRule(get().recurringRules, ruleId, active);
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        recurringRulesKey(user.id),
        JSON.stringify(next),
      );
      await get().refresh();
    },

    async deleteRecurringRule(ruleId) {
      const user = get().currentUser;
      const db = get().db;
      if (!user || !db) return;
      const next = removeRecurringRule(get().recurringRules, ruleId);
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        recurringRulesKey(user.id),
        JSON.stringify(next),
      );
      set({ recurringRules: next });
    },

    async deleteTransaction(id) {
      await requireRepos().transactions.delete(id);
      await get().refresh();
    },

    async findTransaction(id) {
      return requireRepos().transactions.findById(id);
    },

    async loadMonthBreakdown(month) {
      const user = get().currentUser;
      if (!user) return [];
      const transactions = await requireRepos().transactions.listByMonth(month, user.id);
      return buildCategoryBreakdown(transactions, get().categories);
    },
  };
});
