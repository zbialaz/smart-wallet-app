import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import type { TransferField } from '@/domains/accounts/transfer';
import { suggestCategory } from '@/domains/categories/auto-classify';
import { categoriesForType } from '@/domains/categories/category';
import { detectSingleExpenseAlert } from '@/domains/insights/unusual-spending';
import { DESCRIPTION_MAX_LENGTH, type TransactionField } from '@/domains/transactions/transaction';
import { addDays, formatDateBR, parseDateBR, today, type ISODate } from '@/shared/date';
import { useI18n } from '@/shared/i18n';
import { Money } from '@/shared/money';
import type { FieldErrors } from '@/shared/result';
import type { TransactionType } from '@/shared/transaction-type';
import { useWallet } from '@/store/wallet-store';
import {
  AmountInput,
  Button,
  Chip,
  ConfirmDialog,
  Field,
  Screen,
  TextField,
} from '@/ui/components';
import { Text } from '@/ui/text';
import { radius, spacing, useTheme } from '@/ui/theme';

/**
 * Formulário de transação — US-001 (gasto), US-002 (receita), US-003 (editar), US-004 (excluir).
 * Sem `id` na URL = criar. Com `id` = editar.
 * Esta tela NÃO tem regras: só coleta dados e chama saveTransaction (que valida no domínio).
 */
export default function TransactionFormScreen() {
  const router = useRouter();
  const { colors, accentFor } = useTheme();
  const { t, tCategory } = useI18n();
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const isEditing = !!id;

  const accounts = useWallet((s) => s.accounts);
  const categories = useWallet((s) => s.categories);
  const transactions = useWallet((s) => s.transactions);
  const learnedCategoryRules = useWallet((s) => s.learnedCategoryRules);
  const categoryMonthlyStats = useWallet((s) => s.categoryMonthlyStats);
  const saveTransaction = useWallet((s) => s.saveTransaction);
  const transferBetweenAccounts = useWallet((s) => s.transferBetweenAccounts);
  const deleteTransaction = useWallet((s) => s.deleteTransaction);
  const findTransaction = useWallet((s) => s.findTransaction);

  const [type, setType] = useState<TransactionType>('expense');
  const [isTransfer, setIsTransfer] = useState(!isEditing && mode === 'transfer');
  const [amount, setAmount] = useState(Money.zero());
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(accounts.length === 1 ? accounts[0].id : null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [dateText, setDateText] = useState(formatDateBR(today()));
  const [errors, setErrors] = useState<FieldErrors<TransactionField | TransferField>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loaded, setLoaded] = useState(!isEditing);

  // Edição: carrega a transação existente para dentro do formulário
  useEffect(() => {
    if (!id) return;
    findTransaction(id).then((t) => {
      if (t) {
        setType(t.type);
        setAmount(t.amount);
        setDescription(t.description ?? '');
        setCategoryId(t.categoryId);
        setAccountId(t.accountId);
        setDateText(formatDateBR(t.date));
      }
      setLoaded(true);
    });
  }, [id, findTransaction]);

  const accent = isTransfer ? colors.primary : accentFor(type);
  const visibleCategories = categoriesForType(categories, type);
  const parsedDate = parseDateBR(dateText);
  const suggestion = isTransfer
    ? null
    : suggestCategory({
        description,
        type,
        categories,
        learnedRules: learnedCategoryRules,
        history: transactions,
      });

  // US-016: sugere e pré-seleciona automaticamente a categoria ao digitar a descrição
  // (a menos que o usuário já tenha escolhido uma categoria manualmente ou esteja editando).
  useEffect(() => {
    if (isEditing || manualCategory) return;
    if (suggestion) {
      setCategoryId(suggestion.categoryId);
    }
  }, [suggestion?.categoryId, isEditing, manualCategory]);

  // Mostra a categoria já selecionada mesmo que esteja arquivada (RN-10, na edição)
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const singleExpenseAlert =
    type === 'expense'
      ? detectSingleExpenseAlert({
          amount,
          categoryId,
          stats: categoryMonthlyStats,
        })
      : null;
  const categoryChips =
    selectedCategory && !visibleCategories.some((c) => c.id === selectedCategory.id) && selectedCategory.type === type
      ? [selectedCategory, ...visibleCategories]
      : visibleCategories;

  function changeType(next: TransactionType) {
    if (!isTransfer && next === type) return;
    setIsTransfer(false);
    setType(next);
    setCategoryId(null); // RN-04: a categoria precisa ser do mesmo tipo
    setManualCategory(false);
    setErrors({});
  }

  function selectTransferMode() {
    if (isTransfer) return;
    setIsTransfer(true);
    setErrors({});
  }

  async function onSave() {
    setSaving(true);
    if (isTransfer) {
      const transferResult = await transferBetweenAccounts({
        amount,
        fromAccountId: accountId,
        toAccountId,
        date: (parsedDate ?? '') as ISODate,
        description,
      });
      setSaving(false);
      if (!transferResult.ok) {
        setErrors(transferResult.error);
        return;
      }
      router.back();
      return;
    }

    const result = await saveTransaction(
      {
        type,
        amount,
        description,
        categoryId,
        accountId,
        // data inválida vira texto vazio → o domínio devolve "Data inválida"
        date: (parsedDate ?? '') as ISODate,
      },
      id,
    );
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error);
      return;
    }
    router.back();
  }

  async function onDelete() {
    if (!id) return;
    setConfirmDelete(false);
    await deleteTransaction(id);
    router.back();
  }

  if (!loaded) return <Screen><View /></Screen>;

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title">{isEditing ? t.transactions.editTitle : t.transactions.newTitle}</Text>
            <Pressable onPress={() => router.back()} hitSlop={12} testID="close-form">
              <Text color="textMuted">{t.common.close}</Text>
            </Pressable>
          </View>

          {/* Gasto / Receita / Transferência (US-002.1 e US-009) */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4 }}>
            {(['expense', 'income'] as const).map((txType) => {
              const selected = !isTransfer && type === txType;
              return (
                <Pressable
                  key={txType}
                  testID={`type-${txType}`}
                  onPress={() => changeType(txType)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    borderRadius: radius.sm,
                    backgroundColor: selected ? accentFor(txType) + '2B' : 'transparent',
                  }}>
                  <Text variant="bodyStrong" style={{ color: selected ? accentFor(txType) : colors.textMuted }}>
                    {txType === 'expense' ? t.transactions.expense : t.transactions.income}
                  </Text>
                </Pressable>
              );
            })}
            {!isEditing && accounts.length >= 2 && (
              <Pressable
                testID="type-transfer"
                onPress={selectTransferMode}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderRadius: radius.sm,
                  backgroundColor: isTransfer ? colors.primary + '2B' : 'transparent',
                }}>
                <Text variant="bodyStrong" style={{ color: isTransfer ? colors.primary : colors.textMuted }}>
                  {t.transactions.transfer}
                </Text>
              </Pressable>
            )}
          </View>

          <Field label={t.transactions.amountLabel} error={errors.amount}>
            <AmountInput value={amount} onChange={setAmount} accent={accent} autoFocus={!isEditing} invalid={!!errors.amount} />
            {singleExpenseAlert && selectedCategory && (
              <View
                testID="unusual-single-expense-alert"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: '#D99A2B55',
                  backgroundColor: '#D99A2B14',
                }}>
                <Ionicons name="warning" size={14} color="#D99A2B" />
                <Text variant="caption" style={{ color: '#D99A2B', flex: 1 }}>
                  {t.transactions.unusualSingleAlert(
                    tCategory(selectedCategory.id, selectedCategory.name),
                    singleExpenseAlert.multiplier,
                    singleExpenseAlert.averageTxAmount.format(),
                  )}
                </Text>
              </View>
            )}
          </Field>

          <Field label={t.transactions.descriptionLabel} error={errors.description}>
            <TextField
              testID="description-input"
              value={description}
              onChangeText={setDescription}
              placeholder={t.transactions.descriptionPlaceholder}
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
          </Field>

          {isTransfer ? (
            <>
              <Field label={t.transactions.fromAccountLabel} error={errors.fromAccountId}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {accounts.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      icon="business"
                      color={a.color}
                      selected={accountId === a.id}
                      onPress={() => setAccountId(a.id)}
                    />
                  ))}
                </View>
              </Field>

              <Field label={t.transactions.toAccountLabel} error={errors.toAccountId}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {accounts.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      icon="business"
                      color={a.color}
                      selected={toAccountId === a.id}
                      onPress={() => setToAccountId(a.id)}
                    />
                  ))}
                </View>
              </Field>
            </>
          ) : (
            <>
              <Field label={t.transactions.categoryLabel} error={errors.categoryId}>
                {suggestion && categoryId === suggestion.categoryId && (
                  <View
                    testID="category-suggestion-badge"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      gap: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 3,
                      borderRadius: radius.pill,
                      backgroundColor: colors.primary + '1A',
                    }}>
                    <Ionicons name="sparkles" size={12} color={colors.primary} />
                    <Text variant="caption" style={{ color: colors.primary }}>
                      {suggestion.source === 'learned'
                        ? t.transactions.learnedBadge
                        : t.transactions.autoSuggestedBadge}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {categoryChips.map((c) => (
                    <Chip
                      key={c.id}
                      label={tCategory(c.id, c.name)}
                      icon={c.icon as never}
                      color={c.color}
                      selected={categoryId === c.id}
                      onPress={() => {
                        setManualCategory(true);
                        setCategoryId(c.id);
                      }}
                    />
                  ))}
                </View>
              </Field>

              <Field label={t.transactions.accountLabel} error={errors.accountId}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {accounts.map((a) => (
                    <Chip key={a.id} label={a.name} icon="business" color={a.color} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
                  ))}
                </View>
              </Field>
            </>
          )}

          <Field label={t.transactions.dateLabel} error={errors.date ?? (parsedDate ? undefined : t.transactions.dateFormatError)}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Chip label={t.common.today} selected={parsedDate === today()} onPress={() => setDateText(formatDateBR(today()))} />
              <Chip label={t.common.yesterday} selected={parsedDate === addDays(today(), -1)} onPress={() => setDateText(formatDateBR(addDays(today(), -1)))} />
            </View>
            <TextField
              testID="date-input"
              value={dateText}
              onChangeText={setDateText}
              placeholder="DD/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              invalid={!parsedDate || !!errors.date}
            />
          </Field>

          <Button
            label={isEditing ? t.common.saveChanges : t.common.save}
            onPress={onSave}
            loading={saving}
            style={{ backgroundColor: accent }}
            testID="save-transaction"
          />

          {isEditing && (
            <Button label={t.transactions.deleteTransactionBtn} variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} testID="delete-transaction" />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title={t.transactions.deleteConfirmTitle}
        message={t.transactions.deleteConfirmMessage}
        confirmLabel={t.common.delete}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
