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
