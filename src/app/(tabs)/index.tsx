import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n';
import { useConsolidatedBalance, useMonthSummary } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import { Fab, FadeIn, Screen } from '@/ui/components';
import {
  BudgetProgressCard,
  MonthSwitcher,
  TransactionRow,
} from '@/ui/shared-widgets';
import { Text } from '@/ui/text';
import { spacing, useTheme } from '@/ui/theme';
import { WalletPocket } from '@/ui/wallet-pocket';

/**
 * Dashboard Smart Wallet (Início)
 * Focado na Carteira Física (WalletPocket), meta mensal rápida e últimas movimentações.
 * Gráficos profundos, Nuvem de Categorias, Maiores Gastos e IA ficam na aba dedicada "Analytics".
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const month = useWallet((s) => s.selectedMonth);
  const setMonth = useWallet((s) => s.setMonth);
  const transactions = useWallet((s) => s.transactions);
  const accounts = useWallet((s) => s.accounts);
  const budget = useWallet((s) => s.monthlyBudget);
  const summary = useMonthSummary();
  const consolidated = useConsolidatedBalance();

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Seletor de Período Discreto */}
        <FadeIn>
          <MonthSwitcher month={month} onChange={setMonth} />
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

        {/* Meta mensal (se definida) */}
        {budget && (
          <FadeIn delay={90}>
            <BudgetProgressCard spent={summary.expense} budget={budget} />
          </FadeIn>
        )}

        {/* Divisor Delicado */}
        <View style={[styles.thinDivider, { backgroundColor: colors.border }]} />

        {/* Lista de Últimas Transações */}
        <FadeIn delay={120} style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="label" color="textMuted" style={styles.sectionTitle}>
              {t.dashboard.transactionsSection}
            </Text>
            {transactions.length > 5 && (
              <Text
                variant="caption"
                color="primary"
                style={{ fontWeight: '600' }}
                onPress={() => router.navigate('/transactions')}>
                {t.dashboard.seeAll(transactions.length)}
              </Text>
            )}
          </View>

          {transactions.length === 0 ? (
            <Text color="textMuted" style={{ fontSize: 14, paddingTop: spacing.sm }}>
              {t.dashboard.noTransactionsThisMonth}
            </Text>
          ) : (
            <View>
              {transactions.slice(0, 5).map((tx) => (
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
