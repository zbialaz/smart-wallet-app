import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  buildSampleOpenFinanceTransactions,
  classifyPluggyTransactions,
  type ClassifiedBankTransaction,
} from '@/domains/open-finance/pluggy-sync';
import { formatRelativeDate, today } from '@/shared/date';
import { useI18n } from '@/shared/i18n';
import { useCategoryMap } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import {
  Button,
  Card,
  Chip,
  Field,
  IconBadge,
  Screen,
} from '@/ui/components';
import { Text } from '@/ui/text';
import { radius, spacing, useTheme } from '@/ui/theme';

export default function OpenFinanceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { language, t, tCategory } = useI18n();
  const params = useLocalSearchParams<{ accountId?: string }>();

  const accounts = useWallet((s) => s.accounts);
  const categories = useWallet((s) => s.categories);
  const transactions = useWallet((s) => s.transactions);
  const learnedCategoryRules = useWallet((s) => s.learnedCategoryRules);
  const importedOpenFinanceIds = useWallet((s) => s.importedOpenFinanceIds);
  const importOpenFinanceTransactions = useWallet((s) => s.importOpenFinanceTransactions);

  const categoryMap = useCategoryMap();

  const [targetAccountId, setTargetAccountId] = useState<string | null>(
    params.accountId ?? accounts[0]?.id ?? null,
  );

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<ClassifiedBankTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const importedSet = useMemo(
    () => new Set(importedOpenFinanceIds),
    [importedOpenFinanceIds],
  );

  function loadPreview(rawList: Parameters<typeof classifyPluggyTransactions>[0]['rawTransactions']) {
    if (!targetAccountId) {
      setError('Selecione uma conta bancária antes de buscar as compras.');
      return;
    }
    const classified = classifyPluggyTransactions({
      rawTransactions: rawList,
      targetAccountId,
      categories,
      existingTransactions: transactions,
      learnedRules: learnedCategoryRules,
      importedExternalIds: importedSet,
      today: today(),
    });
    setPreviewItems(classified);
    const initialSelected = new Set(
      classified.filter((item) => !item.alreadyImported).map((item) => item.externalId),
    );
    setSelectedIds(initialSelected);
  }

  function handleSimulateOpenFinance() {
    setError(null);
    setSuccessMsg(null);
    const sample = buildSampleOpenFinanceTransactions(today());
    loadPreview(sample);
  }

  function toggleSelection(externalId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(externalId)) next.delete(externalId);
      else next.add(externalId);
      return next;
    });
  }

  async function handleConfirmImport() {
    if (!targetAccountId) return;
    const toImport = previewItems.filter((item) => selectedIds.has(item.externalId));
    if (toImport.length === 0) return;

    setImporting(true);
    setError(null);
    const res = await importOpenFinanceTransactions(toImport, targetAccountId);
    setImporting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setSuccessMsg(t.accounts.openFinanceImportSuccess(res.value));
    setTimeout(() => {
      router.back();
    }, 650);
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          {/* Cabeçalho */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title">{t.accounts.openFinanceTitle}</Text>
              <Text variant="caption" color="textMuted">
                {t.accounts.openFinanceSubtitle}
              </Text>
            </View>
            <Pressable onPress={() => router.back()} hitSlop={12} testID="close-open-finance">
              <Text color="textMuted">{t.common.close}</Text>
            </Pressable>
          </View>

          {/* 1. Escolha da Conta de Destino */}
          <Field label={t.accounts.openFinanceTargetAccount}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {accounts.map((acc) => (
                <Chip
                  key={acc.id}
                  label={acc.name}
                  icon="business"
                  color={acc.color}
                  selected={targetAccountId === acc.id}
                  onPress={() => setTargetAccountId(acc.id)}
                />
              ))}
            </View>
          </Field>

          {/* 2. Sincronização Simulada com 1 Toque + Atalho de Extrato Real */}
          <Card style={{ gap: spacing.sm }}>
            <Button
              testID="simulate-open-finance-btn"
              label={t.accounts.openFinanceDemoBtn}
              icon="flash"
              onPress={handleSimulateOpenFinance}
            />
            <Button
              testID="open-statement-import-btn"
              label={t.settings.importTransactions}
              variant="secondary"
              icon="document-text-outline"
              onPress={() => router.push('/import')}
            />
          </Card>

          {error && (
            <Text variant="caption" color="expense" testID="open-finance-error">
              {error}
            </Text>
          )}

          {successMsg && (
            <View
              testID="open-finance-success"
              style={[
                styles.successBanner,
                { backgroundColor: colors.income + '1C', borderColor: colors.income + '55' },
              ]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.income} />
              <Text variant="bodyStrong" style={{ color: colors.income, flex: 1 }}>
                {successMsg}
              </Text>
            </View>
          )}

          {/* 3. Lista de Pré-visualização Classificada Automaticamente */}
          {previewItems.length > 0 && (
            <View style={{ gap: spacing.md }}>
              <Text variant="label" color="textMuted" style={{ letterSpacing: 1 }}>
                {t.accounts.openFinancePreviewTitle(previewItems.length)}
              </Text>

              <View style={{ gap: spacing.sm }}>
                {previewItems.map((item) => {
                  const isSelected = selectedIds.has(item.externalId);
                  const cat = categoryMap.get(item.categoryId);
                  const catLabel = cat
                    ? tCategory(cat.id, cat.name)
                    : item.categoryName;
                  const catColor = cat?.color ?? colors.primary;
                  const catIcon = (cat?.icon ?? 'pricetag') as never;

                  return (
                    <Pressable
                      key={item.externalId}
                      testID={`of-preview-item-${item.externalId}`}
                      onPress={() => toggleSelection(item.externalId)}
                      style={[
                        styles.previewCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                          opacity: item.alreadyImported && !isSelected ? 0.55 : 1,
                        },
                      ]}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? colors.primary : colors.textFaint}
                      />

                      <IconBadge icon={catIcon} color={catColor} size={38} />

                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {item.description}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: radius.pill,
                              backgroundColor: catColor + '22',
                            }}>
                            <Ionicons name="sparkles" size={10} color={catColor} />
                            <Text
                              variant="caption"
                              style={{ fontSize: 11, fontWeight: '700', color: catColor }}>
                              {catLabel}
                            </Text>
                          </View>
                          <Text variant="caption" color="textMuted" style={{ fontSize: 11 }}>
                            {formatRelativeDate(item.date, undefined, language)}
                          </Text>
                          {item.alreadyImported && (
                            <Text variant="caption" color="textFaint" style={{ fontSize: 11 }}>
                              • {t.accounts.openFinanceAlreadyImported}
                            </Text>
                          )}
                        </View>
                      </View>

                      <Text
                        variant="bodyStrong"
                        style={{
                          color: item.type === 'income' ? colors.income : colors.expense,
                        }}>
                        {item.type === 'income' ? '+ ' : '- '}
                        {item.amount.format()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Button
                testID="confirm-open-finance-import-btn"
                label={t.accounts.openFinanceImportSelectedBtn(selectedIds.size)}
                icon="checkmark-circle"
                disabled={selectedIds.size === 0}
                loading={importing}
                onPress={handleConfirmImport}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});

