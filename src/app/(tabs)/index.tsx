import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useCategoryBreakdown, useConsolidatedBalance, useMonthSummary } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import { EmptyState, Fab, FadeIn, Screen, ThemeToggleButton } from '@/ui/components';
import { DonutChart } from '@/ui/donut-chart';
import { MonthSwitcher, TransactionRow } from '@/ui/shared-widgets';
import { Text } from '@/ui/text';
import { spacing, useTheme } from '@/ui/theme';
import { WalletPocket } from '@/ui/wallet-pocket';

/**
 * Dashboard Smart Wallet
 * Apresenta o saldo através da metáfora visual da Carteira Física (WalletPocket),
 * mantendo o restante da interface limpo, editorial e direto ao ponto.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const month = useWallet((s) => s.selectedMonth);
  const setMonth = useWallet((s) => s.setMonth);
  const transactions = useWallet((s) => s.transactions);
  const accounts = useWallet((s) => s.accounts);
  const summary = useMonthSummary();
  const slices = useCategoryBreakdown();
  const consolidated = useConsolidatedBalance();

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Cabeçalho: Seletor de Período + Alternância de Modo Claro/Noturno (US-020) */}
        <FadeIn style={styles.topBarRow}>
          <View style={{ flex: 1 }}>
            <MonthSwitcher month={month} onChange={setMonth} />
          </View>
          <ThemeToggleButton />
        </FadeIn>

        {/* A Carteira Real: Slots de Cartões de Banco + Bolso em Couro com Saldo */}
        <FadeIn delay={60}>
          <WalletPocket
            consolidated={consolidated}
            income={summary.income}
            expense={summary.expense}
            accounts={accounts}
          />
        </FadeIn>

        {/* Divisor Delicado */}
        <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

        {/* Gráfico de Distribuição */}
        <FadeIn delay={120} style={styles.section}>
          <Text variant="label" color="textMuted" style={styles.sectionTitle}>
            DISTRIBUIÇÃO
          </Text>

          {slices.length > 0 ? (
            <DonutChart slices={slices} total={summary.expense} />
          ) : (
            <EmptyState
              icon="pie-chart-outline"
              title="Sem despesas no mês"
              message="Seus gastos categorizados aparecerão aqui de forma clara."
            />
          )}
        </FadeIn>

        {/* Divisor Delicado */}
        <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

        {/* Lista de Transações */}
        <FadeIn delay={180} style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="label" color="textMuted" style={styles.sectionTitle}>
              TRANSAÇÕES
            </Text>
            {transactions.length > 5 && (
              <Text
                variant="caption"
                color="primary"
                style={{ fontWeight: '600' }}
                onPress={() => router.navigate('/transactions')}>
                Ver todas ({transactions.length})
              </Text>
            )}
          </View>

          {transactions.length === 0 ? (
            <Text color="textMuted" style={{ fontSize: 14, paddingTop: spacing.sm }}>
              Nenhuma movimentação neste mês.
            </Text>
          ) : (
            <View>
              {transactions.slice(0, 5).map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onPress={() =>
                    router.push({ pathname: '/transaction-form', params: { id: t.id } })
                  }
                />
              ))}
            </View>
          )}
        </FadeIn>
      </ScrollView>

      {/* Botão de Adição Rápida */}
      <Fab testID="fab-new-transaction" onPress={() => router.push('/transaction-form')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    gap: spacing.xl,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
