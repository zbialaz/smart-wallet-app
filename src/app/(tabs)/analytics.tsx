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
  buildTopExpenses,
  computeSpendingMetrics,
  packCategoryBubbles,
} from '@/domains/dashboard/analytics';
import { formatShare } from '@/domains/dashboard/summary';
import { hasEnoughHistory } from '@/domains/dashboard/trends';
import { currentYearMonth, formatRelativeDate, today } from '@/shared/date';
import { useI18n } from '@/shared/i18n';
import type { Money } from '@/shared/money';
import { useCategoryBreakdown, useMonthSummary } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import { Card, EmptyState, FadeIn, IconBadge, Screen } from '@/ui/components';
import { DonutChart } from '@/ui/donut-chart';
import { MonthlyEvolutionChart } from '@/ui/evolution-chart';
import {
  MonthlyInsightCard,
  MonthSwitcher,
  SpendingComparison,
  TransactionRow,
  UnusualSpendingAlerts,
} from '@/ui/shared-widgets';
import { Text } from '@/ui/text';
import { radius, spacing, usePrivacy, useTheme } from '@/ui/theme';
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
  const { colors } = useTheme();
  const { language, t, tCategory } = useI18n();
  const { isBalanceHidden } = usePrivacy();

  const month = useWallet((s) => s.selectedMonth);
  const setMonth = useWallet((s) => s.setMonth);
  const transactions = useWallet((s) => s.transactions);
  const categories = useWallet((s) => s.categories);
  const evolution = useWallet((s) => s.monthlyEvolution);

  const summary = useMonthSummary();
  const slices = useCategoryBreakdown();

  const [selectedCloudCategoryId, setSelectedCloudCategoryId] = useState<string | null>(null);

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
        {/* Cabeçalho Editorial */}
        <FadeIn style={{ gap: 4 }}>
          <Text variant="title">{t.dashboard.analyticsTitle}</Text>
          <Text variant="caption" color="textMuted">
            {t.dashboard.analyticsSubtitle}
          </Text>
        </FadeIn>

        {/* Seletor de Mês */}
        <FadeIn delay={40}>
          <MonthSwitcher month={month} onChange={setMonth} />
        </FadeIn>

        {/* Comparativo Mensal + Alertas + Resumo Inteligente com IA */}
        <FadeIn delay={70} style={{ gap: spacing.md }}>
          <SpendingComparison expense={summary.expense} />
          <UnusualSpendingAlerts />
          {transactions.length > 0 && <MonthlyInsightCard />}
        </FadeIn>

        {/* KPIs Rápidos do Mês */}
        {metrics.expenseCount > 0 && (
          <FadeIn delay={95} style={styles.kpiGrid}>
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

            <View
              style={[
                styles.kpiCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Text variant="label" color="textMuted" style={styles.kpiLabel}>
                {t.dashboard.kpiSavingsRateLabel}
              </Text>
              <Text
                variant="bodyStrong"
                style={{
                  fontSize: 16,
                  color:
                    metrics.savingsRatePercent === null
                      ? colors.textMuted
                      : metrics.savingsRatePercent >= 0
                        ? colors.income
                        : colors.expense,
                }}>
                {metrics.savingsRatePercent !== null ? `${metrics.savingsRatePercent}%` : '—'}
              </Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Text variant="label" color="textMuted" style={styles.kpiLabel}>
                {t.dashboard.kpiExpensesCountLabel}
              </Text>
              <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                {metrics.expenseCount}
              </Text>
            </View>
          </FadeIn>
        )}

        <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

        {/* NUVEM DE BOLAS DE CATEGORIAS (Circle Packing) */}
        <FadeIn delay={120} style={styles.section}>
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
              icon="cloud-outline"
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
                            borderColor: bubble.color,
                            borderWidth: isSelected ? 3 : 1.8,
                            transform: [{ scale: pressed ? 0.94 : isSelected ? 1.03 : 1 }],
                          },
                        ]}>
                        <Ionicons
                          name={bubble.icon as never}
                          size={iconSize}
                          color={isSelected ? '#FFFFFF' : bubble.color}
                        />
                        <Text
                          variant="bodyStrong"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                          style={{
                            fontSize: nameFontSize,
                            lineHeight: nameFontSize + 3,
                            color: isSelected ? '#FFFFFF' : colors.text,
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
                            color: isSelected ? '#FFFFFFE6' : bubble.color,
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
                              color: isSelected ? '#FFFFFFCC' : colors.textMuted,
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

              {/* Card de Inspeção da Bola Selecionada */}
              {activeCloudItem && (
                <Card
                  style={{
                    gap: spacing.sm,
                    borderColor: activeCloudItem.color + '55',
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
                      <Text variant="bodyStrong" style={{ color: activeCloudItem.color, fontSize: 16 }}>
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

        {/* MAIORES GASTOS DO MÊS */}
        {topExpenses.length > 0 && (
          <>
            <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

            <FadeIn delay={145} style={styles.section}>
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

        <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

        {/* Gráfico de Rosca (Distribuição) */}
        <FadeIn delay={170} style={styles.section}>
          <Text variant="label" color="textMuted" style={styles.sectionTitle}>
            {t.dashboard.distribution}
          </Text>

          {slices.length > 0 ? (
            <DonutChart slices={slices} total={summary.expense} />
          ) : (
            <EmptyState
              icon="pie-chart-outline"
              title={t.dashboard.noExpensesTitle}
              message={t.dashboard.noExpensesMessage}
            />
          )}
        </FadeIn>

        {/* Evolução dos Gastos nos Últimos 6 Meses */}
        {hasEnoughHistory(evolution) && (
          <>
            <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

            <FadeIn delay={195} style={styles.section}>
              <Text variant="label" color="textMuted" style={styles.sectionTitle}>
                {t.dashboard.evolutionTitle}
              </Text>
              <MonthlyEvolutionChart evolution={evolution} />
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
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
