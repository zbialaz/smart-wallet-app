import { useRouter } from 'expo-router';
import { SectionList, View } from 'react-native';

import { formatRelativeDate } from '@/shared/date';
import type { Transaction } from '@/domains/transactions/transaction';
import { useWallet } from '@/store/wallet-store';
import { EmptyState, Fab, Screen, Button } from '@/ui/components';
import { MonthSwitcher, TransactionRow } from '@/ui/shared-widgets';
import { Text } from '@/ui/text';
import { colors, spacing } from '@/ui/theme';

/** Lista completa do mês, agrupada por dia. Tocar abre os detalhes/edição (US-003.1). */
export default function TransactionsScreen() {
  const router = useRouter();
  const month = useWallet((s) => s.selectedMonth);
  const setMonth = useWallet((s) => s.setMonth);
  const transactions = useWallet((s) => s.transactions);

  // Agrupa por data. A lista já vem ordenada do repositório (mais recentes primeiro).
  const sections: { date: string; data: Transaction[] }[] = [];
  for (const t of transactions) {
    const last = sections[sections.length - 1];
    if (last && last.date === t.date) last.data.push(t);
    else sections.push({ date: t.date, data: [t] });
  }

  return (
    <Screen>
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text variant="title">Transações</Text>
        <MonthSwitcher month={month} onChange={setMonth} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 1 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="label" color="textMuted" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
            {formatRelativeDate(section.date)}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TransactionRow
              transaction={item}
              onPress={() => router.push({ pathname: '/transaction-form', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            title="Nenhuma transação"
            message="Neste mês você ainda não registrou nada."
            action={<Button label="Registrar agora" icon="add" onPress={() => router.push('/transaction-form')} />}
          />
        }
      />

      <Fab onPress={() => router.push('/transaction-form')} />
    </Screen>
  );
}
