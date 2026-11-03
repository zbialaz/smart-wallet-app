import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatRelativeDate } from '@/shared/date';
import { addMonths, currentYearMonth, formatYearMonth, type YearMonth } from '@/shared/date';
import { budgetProgress } from '@/domains/settings/budget';
import { useI18n } from '@/shared/i18n';
import type { Money } from '@/shared/money';
import { signedAmount, type Transaction } from '@/domains/transactions/transaction';
import { useAccountMap, useCategoryMap, useExpenseComparison } from '@/store/selectors';

import { IconBadge } from './components';
import { Text } from './text';
import { radius, spacing, usePrivacy, useTheme, type ThemeColors } from './theme';
import { MASKED_BALANCE } from './wallet-pocket';

/**
 * Seletor de mês estilo "Cápsula Editorial"
 * Tem visual conectado, elegante, com fundo linho acetinado e bordas delicadas.
 */
export function MonthSwitcher({
  month,
  onChange,
}: {
  month: YearMonth;
  onChange: (m: YearMonth) => void;
}) {
  const { colors } = useTheme();
  const { language } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCurrent = month >= currentYearMonth();

  return (
    <View style={styles.switcherContainer}>
      <Pressable
        testID="month-prev"
        onPress={() => onChange(addMonths(month, -1))}
        hitSlop={10}
        style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}>
        <Ionicons name="chevron-back" size={16} color={colors.text} />
      </Pressable>

      <View style={styles.monthLabelArea}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
        <Text variant="bodyStrong" style={styles.monthText}>
          {formatYearMonth(month, language)}
        </Text>
      </View>

      <Pressable
        testID="month-next"
        onPress={() => onChange(addMonths(month, 1))}
        disabled={isCurrent}
        hitSlop={10}
        style={({ pressed }) => [
          styles.arrowButton,
          isCurrent && { opacity: 0.25 },
          pressed && !isCurrent && styles.arrowPressed,
        ]}>
        <Ionicons name="chevron-forward" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

/**
 * Linha de transação com acabamento refinado
 * Badges em squircle botânico, tipografia com contraste balanceado e toque tátil sutil.
 */
export function TransactionRow({
  transaction,
  onPress,
}: {
  transaction: Transaction;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { language, t, tCategory } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categories = useCategoryMap();
  const accounts = useAccountMap();
  const category = categories.get(transaction.categoryId);
  const account = accounts.get(transaction.accountId);
  const signed = signedAmount(transaction);
  const isIncome = transaction.type === 'income';
  const categoryLabel = category ? tCategory(category.id, category.name) : undefined;

  return (
    <Pressable
      testID="transaction-row"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}>
      <IconBadge
        icon={(category?.icon ?? 'cube') as never}
        color={category?.color ?? colors.primary}
        size={42}
      />

      <View style={styles.rowDetails}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ color: colors.text }}>
          {transaction.description ?? categoryLabel ?? t.transactions.fallbackTransaction}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {categoryLabel} • {account?.name ?? t.transactions.fallbackAccount}
        </Text>
      </View>

      <View style={styles.rowAmountCol}>
        <Text
          variant="bodyStrong"
          style={{
            color: isIncome ? colors.income : colors.text,
            letterSpacing: -0.3,
          }}>
          {isIncome ? '+ ' : '- '}
          {signed.abs().format()}
        </Text>
        <Text variant="caption" color="textFaint" style={{ fontSize: 11, textAlign: 'right' }}>
          {formatRelativeDate(transaction.date, undefined, language)}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * US-015 — Gasto do mês com indicador de variação vs. mês anterior.
 * Aumento de gasto é "ruim" (cor de gasto); queda é "boa" (cor de receita).
 */
export function SpendingComparison({ expense }: { expense: Money }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const comparison = useExpenseComparison();
  const { isBalanceHidden } = usePrivacy();

  let label: string;
  let color: string = colors.textMuted;
  let icon: 'trending-up' | 'trending-down' | 'remove' | 'help-circle-outline' = 'help-circle-outline';

  switch (comparison.kind) {
    case 'up':
      label = t.dashboard.compareUp(comparison.percent);
      color = colors.expense;
      icon = 'trending-up';
      break;
    case 'down':
      label = t.dashboard.compareDown(comparison.percent);
      color = colors.income;
      icon = 'trending-down';
      break;
    case 'same':
      label = t.dashboard.compareSame;
      icon = 'remove';
      break;
    default:
      label = t.dashboard.compareNoData;
  }

  return (
    <View
      testID="spending-comparison"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}>
      <View style={{ gap: 2, flexShrink: 1 }}>
        <Text variant="label" color="textMuted" style={{ fontSize: 10, letterSpacing: 1.2 }}>
          {t.dashboard.compareTitle}
        </Text>
        <Text variant="heading">{isBalanceHidden ? MASKED_BALANCE : expense.format()}</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.md,
          paddingVertical: 7,
          borderRadius: radius.pill,
          backgroundColor: color + '1F',
          flexShrink: 1,
        }}>
        <Ionicons name={icon} size={15} color={color} />
        <Text variant="caption" style={{ color, fontWeight: '700', flexShrink: 1 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Amarelo de alerta (a paleta do tema não tem token de "atenção"). */
const WARNING_COLOR = '#D99A2B';

/**
 * US-019 — Barra de progresso da meta mensal:
 * verde (< 80%), amarela (≥ 80%) e vermelha com o valor excedido (> 100%).
 */
export function BudgetProgressCard({ spent, budget }: { spent: Money; budget: Money }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isBalanceHidden } = usePrivacy();
  const progress = budgetProgress(spent, budget);

  const barColor = {
    ok: colors.income,
    warning: WARNING_COLOR,
    exceeded: colors.expense,
  }[progress.status];

  const show = (m: Money) => (isBalanceHidden ? MASKED_BALANCE : m.format());
  const fill = `${Math.min(progress.ratio, 1) * 100}%` as `${number}%`;

  return (
    <View
      testID="budget-progress"
      style={{
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" color="textMuted" style={{ fontSize: 10, letterSpacing: 1.2 }}>
          {t.dashboard.budgetCardTitle}
        </Text>
        <Text variant="bodyStrong" style={{ color: barColor }}>
          {progress.percent}%
        </Text>
      </View>

      <View
        style={{
          height: 10,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceRaised,
          overflow: 'hidden',
        }}>
        <View
          testID={`budget-bar-${progress.status}`}
          style={{ width: fill, height: '100%', borderRadius: radius.pill, backgroundColor: barColor }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <Text variant="caption" color="textMuted" style={{ flexShrink: 1 }}>
          {t.dashboard.budgetSpentOf(show(progress.spent), show(progress.budget))}
        </Text>
        <Text variant="caption" style={{ color: barColor, fontWeight: '700' }}>
          {progress.status === 'exceeded'
            ? t.dashboard.budgetExceededBy(show(progress.exceededBy))
            : t.dashboard.budgetRemaining(show(progress.remaining))}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    switcherContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthLabelArea: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    monthText: {
      fontSize: 14,
      color: colors.text,
      letterSpacing: -0.2,
    },
    arrowButton: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceRaised,
    },
    arrowPressed: {
      backgroundColor: colors.surfacePressed,
      transform: [{ scale: 0.95 }],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
    },
    rowPressed: {
      backgroundColor: colors.surfaceRaised,
    },
    rowDetails: {
      flex: 1,
      gap: 3,
    },
    rowAmountCol: {
      alignItems: 'flex-end',
      gap: 2,
    },
  });
