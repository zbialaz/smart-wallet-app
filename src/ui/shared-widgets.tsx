import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatRelativeDate } from '@/shared/date';
import { addMonths, currentYearMonth, formatYearMonth, type YearMonth } from '@/shared/date';
import { signedAmount, type Transaction } from '@/domains/transactions/transaction';
import { useAccountMap, useCategoryMap } from '@/store/selectors';

import { IconBadge } from './components';
import { Text } from './text';
import { colors, radius, spacing } from './theme';

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
          {formatYearMonth(month)}
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
  const categories = useCategoryMap();
  const accounts = useAccountMap();
  const category = categories.get(transaction.categoryId);
  const account = accounts.get(transaction.accountId);
  const signed = signedAmount(transaction);
  const isIncome = transaction.type === 'income';

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
          {transaction.description ?? category?.name ?? 'Transação'}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {category?.name} • {account?.name ?? 'Conta'}
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
          {formatRelativeDate(transaction.date)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
