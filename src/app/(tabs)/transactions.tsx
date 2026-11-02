import { useRouter } from 'expo-router';
import { SectionList, View } from 'react-native';

import { formatRelativeDate } from '@/shared/date';
import { useI18n } from '@/shared/i18n';
import type { Transaction } from '@/domains/transactions/transaction';
import { useWallet } from '@/store/wallet-store';
import { EmptyState, Fab, Screen, Button } from '@/ui/components';
import { MonthSwitcher, TransactionRow } from '@/ui/shared-widgets';
import { Text } from '@/ui/text';
import { spacing, useTheme } from '@/ui/theme';

/** Lista completa do mês, agrupada por dia. Tocar abre os detalhes/edição (US-003.1). */
export default function TransactionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const month = useWallet((s) => s.selectedMonth);
  const setMonth = useWallet((s) => s.setMonth);
  const transactions = useWallet((s) => s.transactions);

  // Agrupa por data. A lista já vem ordenada do repositório (mais recentes primeiro).
  const sections: { date: string; data: Transaction[] }[] = [];
  for (const tItem of transactions) {
    const last = sections[sections.length - 1];
    if (last && last.date === tItem.date) last.data.push(tItem);
    else sections.push({ date: tItem.date, data: [tItem] });
  }

  return (
    <Screen>
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text variant="title">{t.transactions.title}</Text>
        <MonthSwitcher month={month} onChange={setMonth} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(tItem) => tItem.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 1 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }: { section: { date: string; data: Transaction[] } }) => (
          <Text variant="label" color="textMuted" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
            {formatRelativeDate(section.date, undefined, language)}
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
            title={t.transactions.emptyTitle}
            message={t.transactions.emptyMessage}
            action={<Button label={t.transactions.registerNow} icon="add" onPress={() => router.push('/transaction-form')} />}
          />
        }
      />

      <Fab onPress={() => router.push('/transaction-form')} />
    </Screen>
  );
}
