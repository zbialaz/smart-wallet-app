import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';

import { categoriesForType } from '@/domains/categories/category';
import {
  EMPTY_FILTERS,
  filterTransactions,
  hasActiveFilters,
  type TransactionFilters,
} from '@/domains/transactions/filters';
import type { Transaction } from '@/domains/transactions/transaction';
import { formatRelativeDate } from '@/shared/date';
import { useI18n } from '@/shared/i18n';
import { useWallet } from '@/store/wallet-store';
import { Button, Chip, EmptyState, Fab, Screen, TextField } from '@/ui/components';
import { MonthSwitcher, TransactionRow } from '@/ui/shared-widgets';
import { Text } from '@/ui/text';
import { spacing, useTheme } from '@/ui/theme';

/**
 * Lista do mês agrupada por dia (US-003.1) com busca e filtros combinados (US-005).
 * A tela só guarda o estado dos filtros; a regra mora em `filterTransactions`.
 */
export default function TransactionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { language, t, tCategory } = useI18n();
  const month = useWallet((s) => s.selectedMonth);
  const setMonth = useWallet((s) => s.setMonth);
  const transactions = useWallet((s) => s.transactions);
  const categories = useWallet((s) => s.categories);
  const accounts = useWallet((s) => s.accounts);

  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const filtersActive = hasActiveFilters(filters);

  const filtered = useMemo(() => filterTransactions(transactions, filters), [transactions, filters]);

  // Só oferece como filtro as categorias que realmente aparecem no mês
  const usedCategories = useMemo(() => {
    const ids = new Set(transactions.map((tx) => tx.categoryId));
    return categories.filter((c) => ids.has(c.id));
  }, [transactions, categories]);

  // Agrupa por data. A lista já vem ordenada do repositório (mais recentes primeiro).
  const sections: { date: string; data: Transaction[] }[] = [];
  for (const tx of filtered) {
    const last = sections[sections.length - 1];
    if (last && last.date === tx.date) last.data.push(tx);
    else sections.push({ date: tx.date, data: [tx] });
  }

  return (
    <Screen>
      <View style={{ padding: spacing.xl, paddingBottom: spacing.md, gap: spacing.md }}>
        <Text variant="title">{t.transactions.title}</Text>
        <MonthSwitcher month={month} onChange={setMonth} />

        <View style={{ justifyContent: 'center' }}>
          <TextField
            testID="search-input"
            value={filters.query}
            onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            placeholder={t.transactions.searchPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{ paddingRight: 44 }}
          />
          {filters.query.length > 0 && (
            <Pressable
              onPress={() => setFilters((f) => ({ ...f, query: '' }))}
              hitSlop={10}
              style={{ position: 'absolute', right: 14 }}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {usedCategories.length > 1 && (
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" color="textMuted" style={{ fontSize: 10 }}>
              {t.transactions.filterCategoryLabel}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Chip
                label={t.transactions.filterAll}
                selected={filters.categoryId === null}
                onPress={() => setFilters((f) => ({ ...f, categoryId: null }))}
              />
              {usedCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={tCategory(c.id, c.name)}
                  icon={c.icon as never}
                  color={c.color}
                  selected={filters.categoryId === c.id}
                  onPress={() =>
                    setFilters((f) => ({ ...f, categoryId: f.categoryId === c.id ? null : c.id }))
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        {accounts.length > 1 && (
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" color="textMuted" style={{ fontSize: 10 }}>
              {t.transactions.filterAccountLabel}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Chip
                label={t.transactions.filterAll}
                selected={filters.accountId === null}
                onPress={() => setFilters((f) => ({ ...f, accountId: null }))}
              />
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  icon="business"
                  color={a.color}
                  selected={filters.accountId === a.id}
                  onPress={() =>
                    setFilters((f) => ({ ...f, accountId: f.accountId === a.id ? null : a.id }))
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        {filtersActive && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color="textMuted">
              {t.transactions.resultsCount(filtered.length)}
            </Text>
            <Pressable testID="clear-filters" onPress={() => setFilters(EMPTY_FILTERS)} hitSlop={10}>
              <Text variant="caption" color="primary" style={{ fontWeight: '700' }}>
                {t.transactions.clearFilters}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(tx) => tx.id}
        keyboardShouldPersistTaps="handled"
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
          filtersActive ? (
            <EmptyState
              icon="search"
              title={t.transactions.noResultsTitle}
              message={t.transactions.noResultsMessage}
              action={<Button label={t.transactions.clearFilters} variant="secondary" onPress={() => setFilters(EMPTY_FILTERS)} />}
            />
          ) : (
            <EmptyState
              icon="receipt"
              title={t.transactions.emptyTitle}
              message={t.transactions.emptyMessage}
              action={<Button label={t.transactions.registerNow} icon="add" onPress={() => router.push('/transaction-form')} />}
            />
          )
        }
      />

      <Fab onPress={() => router.push('/transaction-form')} />
    </Screen>
  );
}
