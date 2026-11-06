import { Money } from '@/shared/money';
import { fail, ok, type Result } from '@/shared/result';

/**
 * US-019 — Meta de gastos mensal.
 * Funções puras: a tela só mostra o que `budgetProgress` calcula.
 */

/** Teto de sanidade para a meta (R$ 9.999.999,99). */
export const MAX_BUDGET_CENTS = 999_999_999;

/** A partir de 80% da meta a barra fica amarela (US-019.2). */
export const BUDGET_WARNING_RATIO = 0.8;

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface BudgetProgress {
  status: BudgetStatus;
  /** Fração gasta da meta (pode passar de 1). */
  ratio: number;
  /** Percentual inteiro arredondado para exibição. */
  percent: number;
  spent: Money;
  budget: Money;
  /** Quanto ainda pode gastar (nunca negativo). */
  remaining: Money;
  /** Quanto passou da meta (zero se dentro do limite) — US-019.3. */
  exceededBy: Money;
}

/** Valida o valor informado como meta: precisa ser maior que zero e dentro do teto. */
export function validateBudget(value: Money): Result<Money, string> {
  if (!value.isPositive()) return fail('Informe uma meta maior que zero');
  if (value.cents > MAX_BUDGET_CENTS) return fail('Valor acima do limite permitido');
  return ok(value);
}

/**
 * Compara o gasto do mês com a meta.
 * - ok:       gastou menos de 80%
 * - warning:  entre 80% e 100% (inclusive)
 * - exceeded: passou da meta
 */
export function budgetProgress(spent: Money, budget: Money): BudgetProgress {
  const ratio = budget.cents > 0 ? spent.cents / budget.cents : 0;
  const exceededCents = Math.max(0, spent.cents - budget.cents);
  const remainingCents = Math.max(0, budget.cents - spent.cents);

  let status: BudgetStatus = 'ok';
  if (spent.cents > budget.cents) status = 'exceeded';
  else if (ratio >= BUDGET_WARNING_RATIO) status = 'warning';

  return {
    status,
    ratio,
    percent: Math.round(ratio * 100),
    spent,
    budget,
    remaining: Money.fromCents(remainingCents),
    exceededBy: Money.fromCents(exceededCents),
  };
}

/**
 * Mapa `categoryId -> limite mensal em centavos` para tetos opcionais por categoria.
 */
export type CategoryBudgets = Record<string, number>;

export function parseCategoryBudgets(raw: string | null | undefined): CategoryBudgets {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: CategoryBudgets = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'number' && Number.isSafeInteger(val) && val > 0 && val <= MAX_BUDGET_CENTS) {
        clean[key] = val;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function updateCategoryBudgetMap(
  current: CategoryBudgets,
  categoryId: string,
  value: Money | null,
): Result<CategoryBudgets, string> {
  if (!categoryId.trim()) return fail('Categoria inválida');
  if (value === null) {
    const next = { ...current };
    delete next[categoryId];
    return ok(next);
  }
  const validated = validateBudget(value);
  if (!validated.ok) return validated;
  return ok({
    ...current,
    [categoryId]: validated.value.cents,
  });
}

export function categoryBudgetProgress(
  spent: Money,
  categoryId: string,
  budgets: CategoryBudgets,
): BudgetProgress | null {
  const limitCents = budgets[categoryId];
  if (!limitCents || limitCents <= 0) return null;
  return budgetProgress(spent, Money.fromCents(limitCents));
}

