import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  buildCategoryCloud,
  buildSubscriptionsRadar,
  buildTopExpenses,
  computeMonthProjection,
  computeSpendingMetrics,
  packCategoryBubbles,
} from '@/domains/dashboard/analytics';
import { formatShare } from '@/domains/dashboard/summary';
import { hasEnoughHistory } from '@/domains/dashboard/trends';
import { daysInMonth } from '@/domains/transactions/recurring';
import { currentYearMonth, formatRelativeDate, today, type YearMonth } from '@/shared/date';
import { useI18n } from '@/shared/i18n';
import type { Money } from '@/shared/money';
import { useMonthSummary } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import { Card, EmptyState, FadeIn, IconBadge, Screen } from '@/ui/components';
import { MonthlyEvolutionChart } from '@/ui/evolution-chart';
import {
  MonthlyInsightCard,
  MonthSwitcher,
  SpendingComparison,
  TransactionRow,
  UnusualSpendingAlerts,
} from '@/ui/shared-widgets';
import { Text } from '@/ui/text';
import {
  getContrastForeground,
  getReadableAccent,
  radius,
  spacing,
  usePrivacy,
  useTheme,
} from '@/ui/theme';
import { MASKED_BALANCE } from '@/ui/wallet-pocket';

function daysElapsedInMonth(selectedMonth: string): number {
  const currentYm = currentYearMonth();
  if (selectedMonth === currentYm) {
    const dayNum = Number(today().slice(8, 10));
    return Number.isFinite(dayNum) && dayNum > 0 ? dayNum : 1;
  }
  const [y, m] = selectedMonth.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { language, t, tCategory } = useI18n();
  const { isBalanceHidden } = usePrivacy();

  const month = useWallet((s) => s.selectedMonth);
  const setMonth = useWallet((s) => s.setMonth);
  const transactions = useWallet((s) => s.transactions);
  const categories = useWallet((s) => s.categories);
  const evolution = useWallet((s) => s.monthlyEvolution);
  const monthlyBudget = useWallet((s) => s.monthlyBudget);
  const recurringRules = useWallet((s) => s.recurringRules);

  const summary = useMonthSummary();

  const [selectedCloudCategoryId, setSelectedCloudCategoryId] = useState<string | null>(null);

  const isCurrentMonth = month === currentYearMonth();
  const elapsedDays = daysElapsedInMonth(month);
  const totalMonthDays = daysInMonth(month as YearMonth);

  const projection = useMemo(
    () =>
      computeMonthProjection({
        totalExpense: summary.expense,
        daysElapsed: elapsedDays,
        totalDaysInMonth: totalMonthDays,
        monthlyBudget,
        isCurrentMonth,
      }),
    [summary.expense, elapsedDays, totalMonthDays, monthlyBudget, isCurrentMonth],
  );

  const subscriptionsRadar = useMemo(
    () =>
      buildSubscriptionsRadar({
        transactions,
        recurringRules,
      }),
    [transactions, recurringRules],
  );

  const cloudItems = useMemo(
    () => buildCategoryCloud(transactions, categories),
    [transactions, categories],
  );

  const cloudCanvasWidth = Math.min(380, Math.max(270, windowWidth - spacing.xl * 2 - 24));

  const packedCloud = useMemo(
    () =>
      packCategoryBubbles(cloudItems, {
        maxWidth: cloudCanvasWidth,
        minRadius: 36,
        maxRadius: 72,
        gap: 8,
      }),
    [cloudItems, cloudCanvasWidth],
  );

  const topExpenses = useMemo(
    () => buildTopExpenses(transactions, categories, 5),
    [transactions, categories],
  );

  const metrics = useMemo(
    () =>
      computeSpendingMetrics({
        transactions,
        daysInPeriod: daysElapsedInMonth(month),
      }),
    [transactions, month],
  );

  const activeCloudItem =
    cloudItems.find((item) => item.categoryId === selectedCloudCategoryId) ?? cloudItems[0] ?? null;

  const selectedCategoryTransactions = useMemo(() => {
    if (!activeCloudItem) return [];
    return transactions
      .filter((tx) => tx.type === 'expense' && tx.categoryId === activeCloudItem.categoryId)
      .sort((a, b) => b.amount.cents - a.amount.cents)
      .slice(0, 4);
  }, [transactions, activeCloudItem]);

  const showMoney = (m: Money) => (isBalanceHidden ? MASKED_BALANCE : m.format());

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho Humano e Direto */}
        <FadeIn style={{ gap: 4 }}>
          <Text variant="title">{t.dashboard.analyticsTitle}</Text>
          <Text variant="caption" color="textMuted">
            {t.dashboard.analyticsSubtitle}
          </Text>
        </FadeIn>

        {/* Seletor de Mês */}
        <FadeIn delay={35}>
          <MonthSwitcher month={month} onChange={setMonth} />
        </FadeIn>

        {/* Total Gasto no Mês + Ritmo Diário */}
        <FadeIn delay={60} style={{ gap: spacing.sm }}>
          <SpendingComparison expense={summary.expense} />

          {metrics.expenseCount > 0 && (
            <View style={styles.kpiRow}>
              <View
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <Text variant="label" color="textMuted" style={styles.kpiLabel}>
                  {t.dashboard.kpiDailyAvgLabel}
                </Text>
                <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                  {showMoney(metrics.dailyAverage)}
                </Text>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <Text variant="label" color="textMuted" style={styles.kpiLabel}>
                  {t.dashboard.kpiAvgTicketLabel}
                </Text>
                <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                  {showMoney(metrics.averagePerExpense)}
                </Text>
              </View>
            </View>
          )}

          {/* Projeção de Fechamento do Mês ("Ritmo do Mês" estilo Pierre / Copilot) */}
          {isCurrentMonth && summary.expense.cents > 0 && (
            <Card style={{ gap: spacing.xs }}>
              <View
                testID="month-projection-card"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
                  <Text variant="label" color="textMuted" style={styles.kpiLabel}>
                    {t.dashboard.projectionCardTitle}
                  </Text>
                </View>
                <Text variant="caption" color="textMuted">
                  {t.dashboard.projectionPaceNote(showMoney(projection.dailyPace))}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  paddingTop: 2,
                }}>
                <Text variant="caption" color="textMuted">
                  {t.dashboard.projectionEstimatedLabel}
                </Text>
                <Text
                  variant="bodyStrong"
                  style={{
                    fontSize: 18,
                    color:
                      projection.budgetStatus === 'exceeded'
                        ? colors.expense
                        : projection.budgetStatus === 'within'
                          ? colors.income
                          : colors.text,
                  }}>
                  {showMoney(projection.projectedTotal)}
                </Text>
              </View>

              {projection.budgetStatus !== 'no-budget' &&
                projection.projectedDiffFromBudget &&
                projection.safeDailyAllowance && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.xs,
                      paddingTop: 2,
                    }}>
                    <Ionicons
                      name={
                        projection.budgetStatus === 'exceeded'
                          ? 'alert-circle'
                          : 'checkmark-circle'
                      }
                      size={14}
                      color={
                        projection.budgetStatus === 'exceeded' ? colors.expense : colors.income
                      }
                    />
                    <Text
                      variant="caption"
                      style={{
                        flex: 1,
                        color:
                          projection.budgetStatus === 'exceeded' ? colors.expense : colors.income,
                      }}>
                      {projection.budgetStatus === 'exceeded'
                        ? t.dashboard.projectionExceedBudget(
                            showMoney(projection.projectedDiffFromBudget),
                            showMoney(projection.safeDailyAllowance),
                          )
                        : t.dashboard.projectionWithinBudget(
                            showMoney(projection.projectedDiffFromBudget),
                          )}
                    </Text>
                  </View>
                )}
            </Card>
          )}
        </FadeIn>

        {/* 1. ONDE VOCÊ MAIS GASTOU — Nuvem de Bolas Proporcionais */}
        <FadeIn delay={90} style={styles.section}>
          <View style={{ gap: 2 }}>
            <Text variant="label" color="textMuted" style={styles.sectionTitle}>
              {t.dashboard.categoryCloudTitle}
            </Text>
            <Text variant="caption" color="textMuted">
              {t.dashboard.categoryCloudHint}
            </Text>
          </View>

          {packedCloud.bubbles.length === 0 ? (
            <EmptyState
              icon="pie-chart-outline"
              title={t.dashboard.noExpensesTitle}
              message={t.dashboard.noExpensesMessage}
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              <View
                testID="category-cloud"
                style={[
                  styles.bubbleCanvasCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <View
                  style={{
                    width: packedCloud.width,
                    height: packedCloud.height,
                    position: 'relative',
                  }}>
                  {packedCloud.bubbles.map((bubble) => {
                    const isSelected = activeCloudItem?.categoryId === bubble.categoryId;
                    const label = tCategory(bubble.categoryId, bubble.name);
                    const iconSize = Math.max(16, Math.round(bubble.radius * 0.36));
                    const nameFontSize = Math.max(10, Math.min(15, Math.round(bubble.radius * 0.21)));
                    const pctFontSize = Math.max(10, Math.min(13, Math.round(bubble.radius * 0.19)));
                    const showAmountInside = bubble.radius >= 54;
                    const fg = getContrastForeground(bubble.color);
                    const readableColor = getReadableAccent(bubble.color, isDark);

                    return (
                      <Pressable
                        key={bubble.categoryId}
                        testID={`cloud-bubble-${bubble.categoryId}`}
                        onPress={() => setSelectedCloudCategoryId(bubble.categoryId)}
                        style={({ pressed }) => [
                          styles.circleBubble,
                          {
                            left: bubble.left,
                            top: bubble.top,
                            width: bubble.diameter,
                            height: bubble.diameter,
                            borderRadius: bubble.radius,
                            backgroundColor: isSelected
                              ? bubble.color
                              : bubble.color + '24',
                            borderColor: isSelected ? fg.border : readableColor,
                            borderWidth: isSelected ? 3 : 1.8,
                            transform: [{ scale: pressed ? 0.94 : isSelected ? 1.03 : 1 }],
                          },
                        ]}>
                        <Ionicons
                          name={bubble.icon as never}
                          size={iconSize}
                          color={isSelected ? fg.text : readableColor}
                        />
                        <Text
                          variant="bodyStrong"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                          style={{
                            fontSize: nameFontSize,
                            lineHeight: nameFontSize + 3,
                            color: isSelected ? fg.text : colors.text,
                            textAlign: 'center',
                            paddingHorizontal: 6,
                          }}>
                          {label}
                        </Text>
                        <Text
                          variant="caption"
                          numberOfLines={1}
                          style={{
                            fontSize: pctFontSize,
                            lineHeight: pctFontSize + 2,
                            fontWeight: '800',
                            color: isSelected ? fg.textMuted : readableColor,
                          }}>
                          {Math.round(bubble.share * 100)}%
                        </Text>
                        {showAmountInside && (
                          <Text
                            variant="caption"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                            style={{
                              fontSize: 10,
                              lineHeight: 12,
                              fontWeight: '600',
                              color: isSelected ? fg.textMuted : colors.textMuted,
                              paddingHorizontal: 8,
                            }}>
                            {showMoney(bubble.total)}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Detalhe da Categoria Selecionada */}
              {activeCloudItem && (
                <Card
                  style={{
                    gap: spacing.sm,
                    borderColor: getReadableAccent(activeCloudItem.color, isDark) + '55',
                    borderWidth: 1,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.sm,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                      <IconBadge
                        icon={activeCloudItem.icon as never}
                        color={activeCloudItem.color}
                        size={38}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                          {tCategory(activeCloudItem.categoryId, activeCloudItem.name)}
                        </Text>
                        <Text variant="caption" color="textMuted">
                          {t.dashboard.categoryCloudTxCount(activeCloudItem.transactionCount)} •{' '}
                          {t.dashboard.categoryCloudAvgTicket(showMoney(activeCloudItem.averageTicket))}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        variant="bodyStrong"
                        style={{
                          color: getReadableAccent(activeCloudItem.color, isDark),
                          fontSize: 16,
                        }}>
                        {showMoney(activeCloudItem.total)}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {formatShare(activeCloudItem.share)}
                      </Text>
                    </View>
                  </View>

                  {selectedCategoryTransactions.length > 0 && (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        paddingTop: spacing.xs,
                      }}>
                      {selectedCategoryTransactions.map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          transaction={tx}
                          onPress={() =>
                            router.push({ pathname: '/transaction-form', params: { id: tx.id } })
                          }
                        />
                      ))}
                    </View>
                  )}
                </Card>
              )}
            </View>
          )}
        </FadeIn>

        {/* 2. MAIORES COMPRAS DO MÊS */}
        {topExpenses.length > 0 && (
          <>
            <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

            <FadeIn delay={120} style={styles.section}>
              <Text variant="label" color="textMuted" style={styles.sectionTitle}>
                {t.dashboard.topExpensesTitle}
              </Text>

              <View style={{ gap: spacing.sm }}>
                {topExpenses.map((item, index) => {
                  const catLabel = tCategory(item.transaction.categoryId, item.categoryName);
                  const fillWidth = `${Math.max(6, Math.min(100, Math.round(item.shareOfMonth * 100)))}%` as `${number}%`;

                  return (
                    <Pressable
                      key={item.transaction.id}
                      testID={`top-expense-${index}`}
                      onPress={() =>
                        router.push({
                          pathname: '/transaction-form',
                          params: { id: item.transaction.id },
                        })
                      }
                      style={[
                        styles.topExpenseCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View
                          style={[
                            styles.rankBadge,
                            {
                              backgroundColor:
                                index === 0 ? colors.expense + '22' : colors.surfaceRaised,
                            },
                          ]}>
                          <Text
                            variant="caption"
                            style={{
                              fontWeight: '800',
                              color: index === 0 ? colors.expense : colors.textMuted,
                            }}>
                            {index + 1}º
                          </Text>
                        </View>

                        <IconBadge
                          icon={item.categoryIcon as never}
                          color={item.categoryColor}
                          size={38}
                        />

                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="bodyStrong" numberOfLines={1}>
                            {item.transaction.description || catLabel}
                          </Text>
                          <Text variant="caption" color="textMuted" numberOfLines={1}>
                            {catLabel} • {formatRelativeDate(item.transaction.date, undefined, language)}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                          <Text variant="bodyStrong" style={{ color: colors.expense }}>
                            - {showMoney(item.transaction.amount)}
                          </Text>
                          <Text variant="caption" color="textMuted" style={{ fontSize: 11 }}>
                            {t.dashboard.topExpensesShare(formatShare(item.shareOfMonth))}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.shareBarTrack,
                          { backgroundColor: colors.surfaceRaised },
                        ]}>
                        <View
                          style={{
                            width: fillWidth,
                            height: '100%',
                            borderRadius: radius.pill,
                            backgroundColor: item.categoryColor,
                          }}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </FadeIn>
          </>
        )}

        {/* 2.5. RADAR DE ASSINATURAS E CUSTOS FIXOS */}
        {subscriptionsRadar.count > 0 && (
          <>
            <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

            <FadeIn delay={135} style={styles.section}>
              <Text variant="label" color="textMuted" style={styles.sectionTitle}>
                {t.dashboard.subscriptionsRadarTitle}
              </Text>

              <Card style={{ gap: spacing.md }}>
                <View testID="subscriptions-radar-card" style={{ gap: spacing.sm }}>
                  <View style={styles.kpiRow}>
                    <View
                      style={[
                        styles.kpiCard,
                        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                      ]}>
                      <Text variant="label" color="textMuted" style={styles.kpiLabel}>
                        {t.dashboard.subscriptionsMonthlyLabel}
                      </Text>
                      <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                        {showMoney(subscriptionsRadar.monthlyTotal)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.kpiCard,
                        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                      ]}>
                      <Text variant="label" color="textMuted" style={styles.kpiLabel}>
                        {t.dashboard.subscriptionsAnnualLabel}
                      </Text>
                      <Text variant="bodyStrong" style={{ fontSize: 16, color: colors.primary }}>
                        {showMoney(subscriptionsRadar.annualizedTotal)}
                      </Text>
                    </View>
                  </View>

                  <Text variant="caption" color="textMuted">
                    {t.dashboard.subscriptionsShareNote(
                      Math.round(subscriptionsRadar.shareOfExpense * 100),
                      subscriptionsRadar.count,
                    )}
                  </Text>

                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: spacing.xs,
                      gap: spacing.xs,
                    }}>
                    {subscriptionsRadar.items.slice(0, 6).map((sub) => (
                      <View
                        key={sub.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 4,
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
                          <Ionicons name="repeat" size={14} color={colors.primary} />
                          <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                            {sub.title}
                          </Text>
                        </View>
                        <Text variant="bodyStrong">
                          {showMoney(sub.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>
            </FadeIn>
          </>
        )}

        {/* 3. EVOLUÇÃO DE GASTOS (6 MESES) */}
        {hasEnoughHistory(evolution) && (
          <>
            <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

            <FadeIn delay={150} style={styles.section}>
              <Text variant="label" color="textMuted" style={styles.sectionTitle}>
                {t.dashboard.evolutionTitle}
              </Text>
              <MonthlyEvolutionChart evolution={evolution} />
            </FadeIn>
          </>
        )}

        {/* 4. ALERTAS E RESUMO INTELIGENTE COM IA */}
        {transactions.length > 0 && (
          <>
            <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

            <FadeIn delay={175} style={{ gap: spacing.md }}>
              <UnusualSpendingAlerts />
              <MonthlyInsightCard />
            </FadeIn>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 96,
    gap: spacing.xl,
  },
  thinDivider: {
    height: 1,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  bubbleCanvasCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  circleBubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: 6,
  },
  topExpenseCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBarTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
