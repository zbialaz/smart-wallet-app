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

/**
 * WALLET STORE — a camada de APLICAÇÃO (casos de uso).
 *
 * Cada ação segue sempre o mesmo roteiro:
 *   1. Valida com o DOMÍNIO (funções puras: validateTransaction, validateAccount)
 *   2. Persiste via REPOSITÓRIO (SQL)
 *   3. Recarrega o estado → as telas re-renderizam sozinhas
 *
 * As telas NÃO falam com o banco nem conhecem regras: só chamam ações e leem estado.
 */

type Repositories = {
  accounts: ReturnType<typeof createAccountRepository>;
  categories: ReturnType<typeof createCategoryRepository>;
  transactions: ReturnType<typeof createTransactionRepository>;
};

interface WalletState {
  repos: Repositories | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;

  selectedMonth: YearMonth;
  accounts: AccountWithBalance[];
  categories: Category[];
  /** Transações do mês selecionado. */
  transactions: Transaction[];

  init(db: SQLiteDatabase): Promise<void>;
  refresh(): Promise<void>;
  setMonth(month: YearMonth): Promise<void>;

  createAccount(draft: AccountDraft): Promise<Result<Account, FieldErrors<AccountField>>>;
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
    repos: null,
    status: 'idle',
    errorMessage: null,
    selectedMonth: currentYearMonth(),
    accounts: [],
    categories: [],
    transactions: [],

    async init(db) {
      set({
        status: 'loading',
        repos: {
          accounts: createAccountRepository(db),
          categories: createCategoryRepository(db),
          transactions: createTransactionRepository(db),
        },
      });
      try {
        await get().refresh();
        set({ status: 'ready' });
      } catch (e) {
        set({ status: 'error', errorMessage: e instanceof Error ? e.message : String(e) });
      }
    },

    /** Recarrega tudo do banco. Simples e suficiente para centenas de transações/mês. */
    async refresh() {
      const repos = requireRepos();
      const [accountTotals, categories, transactions] = await Promise.all([
        repos.accounts.listActiveWithTotals(),
        repos.categories.listAll(),
        repos.transactions.listByMonth(get().selectedMonth),
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
      const transactions = await requireRepos().transactions.listByMonth(month);
      set({ transactions });
    },

    async createAccount(draft) {
      const existingNames = get().accounts.map((a) => a.name);
      const result = validateAccount(draft, existingNames);
      if (!result.ok) return result;

      const account: Account = {
        id: generateId(),
        ...result.value,
        createdAt: nowISO(),
        archivedAt: null,
      };
      await requireRepos().accounts.insert(account);
      await get().refresh();
      return ok(account);
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
