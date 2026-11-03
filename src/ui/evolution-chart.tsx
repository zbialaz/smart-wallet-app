import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { CategorySlice } from '@/domains/dashboard/summary';
import { formatShare } from '@/domains/dashboard/summary';
import {
  isExpenseIncrease,
  maxExpenseCents,
  type MonthlyTotals,
} from '@/domains/dashboard/trends';
import { formatMonthShort, formatYearMonth, type YearMonth } from '@/shared/date';
import { useI18n } from '@/shared/i18n';
import { useWallet } from '@/store/wallet-store';

import { Text } from './text';
import { radius, spacing, usePrivacy, useTheme } from './theme';
import { MASKED_BALANCE } from './wallet-pocket';

const BAR_AREA_HEIGHT = 120;
const MIN_BAR_HEIGHT = 4;

/**
 * Gráfico de barras com os gastos dos últimos 6 meses (US-014).
 * - A barra do mês atual fica VERMELHA quando o gasto supera o do mês anterior (US-014.2).
 * - Tocar em uma barra mostra o detalhamento por categoria daquele mês (US-014.3).
 */
export function MonthlyEvolutionChart({ evolution }: { evolution: MonthlyTotals[] }) {
  const { colors } = useTheme();
  const { language, t, tCategory } = useI18n();
  const { isBalanceHidden } = usePrivacy();
  const loadMonthBreakdown = useWallet((s) => s.loadMonthBreakdown);

  const [selectedMonth, setSelectedMonth] = useState<YearMonth | null>(null);
  const [breakdown, setBreakdown] = useState<CategorySlice[]>([]);

  const lastIndex = evolution.length - 1;
  const max = maxExpenseCents(evolution);
  const lastMonth = evolution[lastIndex]?.month;

  // Ao navegar de mês no dashboard, o detalhe aberto deixa de fazer sentido
  useEffect(() => {
    setSelectedMonth(null);
    setBreakdown([]);
  }, [lastMonth]);

  async function onSelect(month: YearMonth) {
    if (selectedMonth === month) {
      setSelectedMonth(null);
      setBreakdown([]);
      return;
    }
    setSelectedMonth(month);
    setBreakdown(await loadMonthBreakdown(month));
  }

  const selected = evolution.find((m) => m.month === selectedMonth) ?? null;
  const money = (m: { format(): string }) => (isBalanceHidden ? MASKED_BALANCE : m.format());

  return (
    <View testID="monthly-evolution-chart" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: BAR_AREA_HEIGHT + 34 }}>
        {evolution.map((m, index) => {
          const isCurrent = index === lastIndex;
          const isSelected = m.month === selectedMonth;
          const increased = isCurrent && isExpenseIncrease(evolution, index);
          const height =
            max > 0 && m.expense.isPositive()
              ? Math.max(MIN_BAR_HEIGHT, Math.round((m.expense.cents / max) * BAR_AREA_HEIGHT))
              : MIN_BAR_HEIGHT;

          const barColor = increased
            ? colors.expense
            : isCurrent
              ? colors.primary
              : colors.textFaint;

          return (
            <Pressable
              key={m.month}
              testID={`evolution-bar-${m.month}`}
              onPress={() => onSelect(m.month)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <View
                style={{
                  width: '72%',
                  height,
                  borderRadius: radius.sm,
                  backgroundColor: barColor,
                  opacity: selectedMonth && !isSelected ? 0.4 : m.expense.isPositive() ? 1 : 0.35,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: colors.text,
                }}
              />
              <Text
                variant="caption"
                style={{
                  fontSize: 11,
                  fontWeight: isCurrent || isSelected ? '800' : '600',
                  color: isCurrent || isSelected ? colors.text : colors.textMuted,
                }}>
                {formatMonthShort(m.month, language)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <View
          testID="evolution-breakdown"
          style={{
            gap: spacing.xs,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="bodyStrong">{formatYearMonth(selected.month, language)}</Text>
            <Text variant="bodyStrong" style={{ color: colors.expense }}>
              {money(selected.expense)}
            </Text>
          </View>

          {breakdown.length === 0 ? (
            <Text variant="caption" color="textMuted">
              {t.dashboard.evolutionNoExpenses}
            </Text>
          ) : (
            breakdown.map((slice) => (
              <View
                key={slice.categoryId}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: slice.color }} />
                <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                  {tCategory(slice.categoryId, slice.name)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {formatShare(slice.share)}
                </Text>
                <Text variant="caption" style={{ fontWeight: '700', minWidth: 84, textAlign: 'right' }}>
                  {money(slice.total)}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : (
        <Text variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
          {t.dashboard.evolutionHint}
        </Text>
      )}
    </View>
  );
}

