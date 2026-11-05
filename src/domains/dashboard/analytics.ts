import type { Category } from '@/domains/categories/category';
import type { Transaction } from '@/domains/transactions/transaction';
import { Money } from '@/shared/money';

/**
 * Domínio de Analytics e Visualização de Gastos.
 *
 * Funções 100% puras e determinísticas para alimentar a aba de Dados & Analytics:
 *   1. `buildCategoryCloud`: Nuvem de Categorias dimensionada pelo peso no orçamento,
 *      com contagem de lançamentos e ticket médio por categoria.
 *   2. `buildTopExpenses`: Ranking dos maiores gastos individuais do mês e seu peso percentual.
 *   3. `computeSpendingMetrics`: KPIs rápidos do mês (ticket médio por compra, gasto diário,
 *      quantidade de despesas e taxa de economia).
 */

export type CloudTier = 'xl' | 'lg' | 'md' | 'sm';

export interface CategoryCloudItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: Money;
  /** Fração de 0 a 1 sobre o total de despesas do mês. */
  share: number;
  /** Escala normalizada de 0 a 1 em relação à maior categoria do mês (1.0 = a maior). */
  relativeWeight: number;
  /** Tamanho visual na nuvem de categorias. */
  tier: CloudTier;
  /** Número de transações de gasto nesta categoria no mês. */
  transactionCount: number;
  /** Valor médio por transação nesta categoria. */
  averageTicket: Money;
}

export interface TopExpenseItem {
  transaction: Transaction;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  /** Fração de 0 a 1 que este único gasto representa do total gasto no mês. */
  shareOfMonth: number;
}

export interface SpendingMetrics {
  expenseCount: number;
  averagePerExpense: Money;
  dailyAverage: Money;
  savingsRatePercent: number | null;
}

export interface PackedCategoryBubble extends CategoryCloudItem {
  /** Raio da bola em pixels (proporcional ao gasto). */
  radius: number;
  /** Diâmetro da bola (`radius * 2`). */
  diameter: number;
  /** Centro X dentro do container da nuvem. */
  cx: number;
  /** Centro Y dentro do container da nuvem. */
  cy: number;
  /** Posição `left` (`cx - radius`) para renderização absoluta. */
  left: number;
  /** Posição `top` (`cy - radius`) para renderização absoluta. */
  top: number;
}

export interface CategoryBubbleLayout {
  bubbles: PackedCategoryBubble[];
  width: number;
  height: number;
}

/**
 * Empacota as categorias como BOLAS (círculos) em uma nuvem orgânica centralizada
 * (Circle Packing): quanto maior o gasto da categoria, maior o diâmetro da bola.
 * Garante que nenhuma bola se sobreponha às demais e que caiba na largura `maxWidth`.
 */
export function packCategoryBubbles(
  items: ReadonlyArray<CategoryCloudItem>,
  options?: {
    maxWidth?: number;
    minRadius?: number;
    maxRadius?: number;
    gap?: number;
  },
): CategoryBubbleLayout {
  const maxWidth = options?.maxWidth ?? 330;
  const minRadius = options?.minRadius ?? 34;
  const maxRadius = options?.maxRadius ?? 66;
  const gap = options?.gap ?? 6;

  if (items.length === 0) {
    return { bubbles: [], width: maxWidth, height: 0 };
  }

  // Calcula o raio de cada bola proporcionalmente ao peso relativo (usando curva suave sqrt)
  const radii = items.map((item) => {
    const clamped = Math.max(0, Math.min(1, item.relativeWeight));
    const scale = Math.sqrt(clamped);
    return Math.round(minRadius + scale * (maxRadius - minRadius));
  });

  const placed: { cx: number; cy: number; r: number }[] = [];
  const halfMaxWidth = maxWidth / 2;

  for (let i = 0; i < items.length; i++) {
    const r = radii[i];

    if (i === 0) {
      placed.push({ cx: 0, cy: 0, r });
      continue;
    }

    // Busca em espiral áurea a posição mais próxima do centro (0,0) sem colisão
    // e respeitando os limites horizontais da tela (`maxWidth`).
    let bestX = 0;
    let bestY = 0;
    let found = false;

    const minStartDist = placed[0].r + r + gap;
    const goldenAngle = 2.399963229728653; // ~137.5 graus em radianos

    for (let step = 0; step < 2400; step++) {
      const angle = step * goldenAngle;
      const dist = minStartDist + step * 0.45;
      // Leve compressão horizontal quando o candidato passa da largura máxima
      const candidateX = Math.cos(angle) * dist;
      const candidateY = Math.sin(angle) * dist;

      if (Math.abs(candidateX) + r > halfMaxWidth) {
        continue;
      }

      let collides = false;
      for (const p of placed) {
        const dx = candidateX - p.cx;
        const dy = candidateY - p.cy;
        const minDist = r + p.r + gap;
        if (dx * dx + dy * dy < minDist * minDist) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        bestX = candidateX;
        bestY = candidateY;
        found = true;
        break;
      }
    }

    if (!found) {
      // Fallback vertical abaixo da bola mais baixa já posicionada
      const lowestBottom = Math.max(...placed.map((p) => p.cy + p.r));
      bestX = 0;
      bestY = lowestBottom + gap + r;
    }

    placed.push({ cx: bestX, cy: bestY, r });
  }

  const minX = Math.min(...placed.map((p) => p.cx - p.r));
  const maxX = Math.max(...placed.map((p) => p.cx + p.r));
  const minY = Math.min(...placed.map((p) => p.cy - p.r));
  const maxY = Math.max(...placed.map((p) => p.cy + p.r));

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const layoutWidth = Math.max(maxWidth, Math.ceil(contentWidth));
  const offsetX = (layoutWidth - contentWidth) / 2 - minX;
  const offsetY = -minY;

  const bubbles: PackedCategoryBubble[] = items.map((item, idx) => {
    const p = placed[idx];
    const cx = Math.round(p.cx + offsetX);
    const cy = Math.round(p.cy + offsetY);
    return {
      ...item,
      radius: p.r,
      diameter: p.r * 2,
      cx,
      cy,
      left: cx - p.r,
      top: cy - p.r,
    };
  });

  return {
    bubbles,
    width: layoutWidth,
    height: Math.ceil(contentHeight),
  };
}

function resolveTier(relativeWeight: number): CloudTier {
  if (relativeWeight >= 0.75) return 'xl';
  if (relativeWeight >= 0.45) return 'lg';
  if (relativeWeight >= 0.2) return 'md';
  return 'sm';
}

/**
 * Constrói os itens da Nuvem de Categorias ordenados da maior para a menor despesa.
 * Diferente do gráfico de rosca, preserva todas as categorias com gasto > 0 para que o
 * usuário veja tanto as maiores categorias em destaque quanto as menores ao redor.
 */
export function buildCategoryCloud(
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amount' | 'categoryId'>>,
  categories: ReadonlyArray<Category>,
): CategoryCloudItem[] {
  const agg = new Map<string, { cents: number; count: number }>();
  let totalExpenseCents = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.amount.cents <= 0) continue;
    totalExpenseCents += tx.amount.cents;
    const prev = agg.get(tx.categoryId) ?? { cents: 0, count: 0 };
    agg.set(tx.categoryId, {
      cents: prev.cents + tx.amount.cents,
      count: prev.count + 1,
    });
  }

  if (totalExpenseCents === 0) return [];

  const byId = new Map(categories.map((c) => [c.id, c]));
  const entries = [...agg.entries()].sort((a, b) => b[1].cents - a[1].cents);
  const maxCents = entries[0][1].cents;

  return entries.map(([categoryId, { cents, count }]) => {
    const cat = byId.get(categoryId);
    const share = cents / totalExpenseCents;
    const relativeWeight = maxCents > 0 ? cents / maxCents : 0;
    const avgCents = Math.round(cents / count);

    return {
      categoryId,
      name: cat?.name ?? 'Outros',
      color: cat?.color ?? '#8A90B2',
      icon: cat?.icon ?? 'cube',
      total: Money.fromCents(cents),
      share,
      relativeWeight,
      tier: resolveTier(relativeWeight),
      transactionCount: count,
      averageTicket: Money.fromCents(avgCents),
    };
  });
}

/**
 * Retorna os maiores gastos individuais do mês (padrão: top 5),
 * ordenados do maior valor para o menor.
 */
export function buildTopExpenses(
  transactions: ReadonlyArray<Transaction>,
  categories: ReadonlyArray<Category>,
  limit = 5,
): TopExpenseItem[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.amount.cents > 0);
  if (expenses.length === 0 || limit <= 0) return [];

  const totalExpenseCents = expenses.reduce((sum, t) => sum + t.amount.cents, 0);
  const byId = new Map(categories.map((c) => [c.id, c]));

  return [...expenses]
    .sort((a, b) => b.amount.cents - a.amount.cents || b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((tx) => {
      const cat = byId.get(tx.categoryId);
      return {
        transaction: tx,
        categoryName: cat?.name ?? 'Outros',
        categoryColor: cat?.color ?? '#8A90B2',
        categoryIcon: cat?.icon ?? 'cube',
        shareOfMonth: totalExpenseCents > 0 ? tx.amount.cents / totalExpenseCents : 0,
      };
    });
}

/**
 * Calcula indicadores rápidos do mês: ticket médio por compra, média diária (considerando
 * `daysElapsed` dias corridos no mês, mín. 1) e taxa de poupança sobre a renda.
 */
export function computeSpendingMetrics(params: {
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amount'>>;
  daysInPeriod?: number;
}): SpendingMetrics {
  const { transactions, daysInPeriod = 30 } = params;
  const safeDays = Math.max(1, Math.round(daysInPeriod));

  let incomeCents = 0;
  let expenseCents = 0;
  let expenseCount = 0;

  for (const tx of transactions) {
    if (tx.type === 'income' && tx.amount.cents > 0) {
      incomeCents += tx.amount.cents;
    } else if (tx.type === 'expense' && tx.amount.cents > 0) {
      expenseCents += tx.amount.cents;
      expenseCount += 1;
    }
  }

  const averagePerExpense =
    expenseCount > 0 ? Money.fromCents(Math.round(expenseCents / expenseCount)) : Money.zero();
  const dailyAverage =
    expenseCents > 0 ? Money.fromCents(Math.round(expenseCents / safeDays)) : Money.zero();
  const savingsRatePercent =
    incomeCents > 0 ? Math.round(((incomeCents - expenseCents) / incomeCents) * 100) : null;

  return {
    expenseCount,
    averagePerExpense,
    dailyAverage,
    savingsRatePercent,
  };
}

