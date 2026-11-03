import { fail, ok, type FieldErrors, type Result } from '@/shared/result';
import { normalizeText } from '@/shared/text';
import type { TransactionType } from '@/shared/transaction-type';

/**
 * Category (Categoria) — ENTITY.
 * `icon` é o nome de um ícone do Ionicons (@expo/vector-icons).
 */
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isDefault: boolean;
  archivedAt: string | null;
}

/** ID fixo da categoria "Outros" — o gráfico agrupa fatias pequenas nela (US-013.3). */
export const OTHER_EXPENSE_CATEGORY_ID = 'cat-other';

/**
 * Categorias padrão (US-010). IDs fixos (não aleatórios) para que o seed seja
 * idempotente: rodar duas vezes não duplica nada.
 */
export const DEFAULT_CATEGORIES: Category[] = (
  [
    ['cat-food', 'Alimentação', 'fast-food', '#FF8A4C', 'expense'],
    ['cat-transport', 'Transporte', 'car', '#4CC9F0', 'expense'],
    ['cat-home', 'Moradia', 'home', '#7C5CFF', 'expense'],
    ['cat-health', 'Saúde', 'medkit', '#FF5C7A', 'expense'],
    ['cat-education', 'Educação', 'school', '#3A86FF', 'expense'],
    ['cat-leisure', 'Lazer', 'game-controller', '#F72585', 'expense'],
    ['cat-shopping', 'Compras', 'bag-handle', '#FFB547', 'expense'],
    ['cat-subscriptions', 'Assinaturas', 'tv', '#B5179E', 'expense'],
    ['cat-personal-care', 'Cuidados Pessoais', 'cut', '#E76F51', 'expense'],
    ['cat-tech', 'Tecnologia', 'phone-portrait', '#00B4D8', 'expense'],
    ['cat-gifts', 'Presentes', 'gift', '#FF70A6', 'expense'],
    [OTHER_EXPENSE_CATEGORY_ID, 'Outros', 'cube', '#8A90B2', 'expense'],
    ['cat-salary', 'Salário', 'cash', '#2ED3A0', 'income'],
    ['cat-freelance', 'Freelance', 'briefcase', '#06D6A0', 'income'],
    ['cat-investments', 'Investimentos', 'trending-up', '#4ADE80', 'income'],
    ['cat-gift-received', 'Presente Recebido', 'gift', '#80ED99', 'income'],
    ['cat-other-income', 'Outras Receitas', 'wallet', '#94D2BD', 'income'],
  ] as const
).map(([id, name, icon, color, type]) => ({
  id,
  name,
  icon,
  color,
  type,
  isDefault: true,
  archivedAt: null,
}));

/** Categorias que podem ser usadas numa transação do tipo informado (RN-04, RN-10). */
export function categoriesForType(categories: Category[], type: TransactionType): Category[] {
  return categories.filter((c) => c.type === type && c.archivedAt === null);
}

/* ------------------------------------------------------------------------- *
 * US-011 / US-024 — Categorias personalizadas
 * ------------------------------------------------------------------------- */

export interface CategoryDraft {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export type CategoryField = 'name' | 'icon' | 'color';

export const CATEGORY_NAME_MAX_LENGTH = 24;

/** Ícones (Ionicons) oferecidos no seletor de nova categoria. */
export const CATEGORY_ICON_OPTIONS = [
  'paw', 'airplane', 'barbell', 'cafe', 'beer', 'basket', 'bus', 'build',
  'bulb', 'camera', 'card', 'color-palette', 'construct', 'flower', 'football',
  'game-controller', 'heart', 'library', 'musical-notes', 'restaurant', 'rocket',
  'shirt', 'star', 'storefront', 'ticket', 'wine', 'wallet', 'leaf',
] as const;

/** Cores oferecidas no seletor de nova categoria. */
export const CATEGORY_COLOR_OPTIONS = [
  '#E76F51', '#F4A261', '#E9C46A', '#2A9D8F', '#4CC9F0', '#3A86FF',
  '#7C5CFF', '#B5179E', '#F72585', '#FF5C7A', '#4ADE80', '#8A90B2',
] as const;

export const DEFAULT_CATEGORY_ICON = CATEGORY_ICON_OPTIONS[0];
export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLOR_OPTIONS[0];

/** RN-09: categorias padrão não podem ser editadas nem excluídas/arquivadas. */
export function canModifyCategory(category: Pick<Category, 'isDefault'>): boolean {
  return !category.isDefault;
}

/**
 * US-011: valida uma categoria nova (ou editada, passando `editingId`).
 * RN-07: o nome é único dentro do MESMO tipo (ignora maiúsculas e acentos).
 */
export function validateCategory(
  draft: CategoryDraft,
  existing: Category[],
  editingId?: string,
): Result<CategoryDraft, FieldErrors<CategoryField>> {
  const errors: FieldErrors<CategoryField> = {};
  const name = draft.name.trim();

  if (!name) {
    errors.name = 'Informe o nome da categoria';
  } else if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    errors.name = `Máximo de ${CATEGORY_NAME_MAX_LENGTH} caracteres`;
  } else if (
    existing.some(
      (c) =>
        c.id !== editingId &&
        c.archivedAt === null &&
        c.type === draft.type &&
        normalizeText(c.name) === normalizeText(name),
    )
  ) {
    errors.name = 'Já existe uma categoria com esse nome';
  }

  if (!draft.icon) errors.icon = 'Escolha um ícone';
  if (!/^#[0-9A-Fa-f]{6}$/.test(draft.color)) errors.color = 'Escolha uma cor';

  if (Object.keys(errors).length > 0) return fail(errors);
  return ok({ ...draft, name });
}

