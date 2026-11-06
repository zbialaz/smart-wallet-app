import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import type { TransferField } from '@/domains/accounts/transfer';
import { suggestCategory } from '@/domains/categories/auto-classify';
import { categoriesForType } from '@/domains/categories/category';
import { detectSingleExpenseAlert } from '@/domains/insights/unusual-spending';
import { parseQuickEntry } from '@/domains/transactions/quick-entry';
import {
  analyzeReceiptWithGemini,
  type ReceiptScanResult,
} from '@/domains/transactions/receipt-scanner';
import { dayFromISODate } from '@/domains/transactions/recurring';
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
  Card,
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
  const geminiApiKey = useWallet((s) => s.geminiApiKey);
  const saveTransaction = useWallet((s) => s.saveTransaction);
  const transferBetweenAccounts = useWallet((s) => s.transferBetweenAccounts);
  const deleteTransaction = useWallet((s) => s.deleteTransaction);
  const findTransaction = useWallet((s) => s.findTransaction);

  const defaultAccountId = (() => {
    if (accounts.length === 0) return null;
    const recentTx = transactions.find((tx) => accounts.some((a) => a.id === tx.accountId));
    return recentTx?.accountId ?? accounts[0].id;
  })();

  const [type, setType] = useState<TransactionType>('expense');
  const [isTransfer, setIsTransfer] = useState(!isEditing && mode === 'transfer');
  const [amount, setAmount] = useState(Money.zero());
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(defaultAccountId);
  const [toAccountId, setToAccountId] = useState<string | null>(
    accounts.find((a) => a.id !== defaultAccountId)?.id ?? null,
  );
  const [dateText, setDateText] = useState(formatDateBR(today()));
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [quickPhrase, setQuickPhrase] = useState('');
  const [quickEntryApplied, setQuickEntryApplied] = useState(false);
  const [showReceiptPaste, setShowReceiptPaste] = useState(false);
  const [receiptTextInput, setReceiptTextInput] = useState('');
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ReceiptScanResult | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
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

  function onApplyQuickEntry() {
    const parsed = parseQuickEntry({
      text: quickPhrase,
      accounts,
      categories,
      learnedRules: learnedCategoryRules,
      history: transactions,
      today: today(),
    });
    if (!parsed) return;

    setIsTransfer(false);
    setType(parsed.type);
    if (parsed.amount) {
      setAmount(parsed.amount);
    }
    if (parsed.description) {
      setDescription(parsed.description);
    }
    if (parsed.categoryId) {
      setManualCategory(true);
      setCategoryId(parsed.categoryId);
    }
    if (parsed.accountId) {
      setAccountId(parsed.accountId);
    }
    setDateText(formatDateBR(parsed.date));
    if (parsed.isRecurring) {
      setIsRecurring(true);
    }
    setQuickEntryApplied(true);
    setErrors({});
  }

  function applyScannedReceipt(scan: ReceiptScanResult) {
    setScannedReceipt(scan);
    setReceiptError(null);
    setAmount(scan.amount);
    setDescription(scan.merchant);
    if (scan.categoryId) {
      setManualCategory(true);
      setCategoryId(scan.categoryId);
    }
    if (scan.date) {
      setDateText(formatDateBR(scan.date));
    }
    setShowReceiptPaste(false);
    setErrors({});
  }

  async function scanFromImageAsset(base64?: string | null, mimeType?: string | null) {
    if (!base64) {
      setReceiptError('Não foi possível ler a imagem selecionada.');
      return;
    }
    setScanningReceipt(true);
    setReceiptError(null);
    const result = await analyzeReceiptWithGemini({
      apiKey: geminiApiKey,
      imageBase64: base64,
      mimeType: mimeType || 'image/jpeg',
      categories,
      learnedRules: learnedCategoryRules,
      history: transactions,
      today: today(),
    });
    setScanningReceipt(false);
    if (!result.ok) {
      setReceiptError(result.error);
      return;
    }
    applyScannedReceipt(result.value);
  }

  async function onScanReceiptCamera() {
    setReceiptError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setReceiptError(t.transactions.scanReceiptPermissionDenied);
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    await scanFromImageAsset(picked.assets[0].base64, picked.assets[0].mimeType);
  }

  async function onScanReceiptGallery() {
    setReceiptError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setReceiptError(t.transactions.scanReceiptPermissionDenied);
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    await scanFromImageAsset(picked.assets[0].base64, picked.assets[0].mimeType);
  }

  async function onScanReceiptText() {
    setScanningReceipt(true);
    setReceiptError(null);
    const result = await analyzeReceiptWithGemini({
      apiKey: geminiApiKey,
      receiptText: receiptTextInput,
      categories,
      learnedRules: learnedCategoryRules,
      history: transactions,
      today: today(),
    });
    setScanningReceipt(false);
    if (!result.ok) {
      setReceiptError(result.error);
      return;
    }
    applyScannedReceipt(result.value);
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

    const recurringDay = dayFromISODate(parsedDate ?? today());
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
      !isEditing && isRecurring ? { recurringDayOfMonth: recurringDay } : undefined,
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

          {/* Lançamento Rápido por Frase ("Modo Pierre") */}
          {!isEditing && !isTransfer && (
            <Card style={{ gap: spacing.sm }}>
              <View
                testID="quick-entry-card"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ionicons name="sparkles" size={15} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', letterSpacing: 0.6 }}>
                  {t.transactions.quickEntryTitle}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    testID="quick-entry-input"
                    value={quickPhrase}
                    onChangeText={(val) => {
                      setQuickPhrase(val);
                      if (quickEntryApplied) setQuickEntryApplied(false);
                    }}
                    placeholder={t.transactions.quickEntryPlaceholder}
                    returnKeyType="done"
                    onSubmitEditing={onApplyQuickEntry}
                  />
                </View>
                <Pressable
                  testID="quick-entry-apply-btn"
                  disabled={!quickPhrase.trim()}
                  onPress={onApplyQuickEntry}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: quickPhrase.trim() ? colors.primary : colors.surfaceRaised,
                    opacity: quickPhrase.trim() ? 1 : 0.5,
                  }}>
                  <Text
                    variant="caption"
                    style={{
                      color: quickPhrase.trim() ? '#FFFFFF' : colors.textMuted,
                      fontWeight: '700',
                    }}>
                    {t.transactions.quickEntryApplyBtn}
                  </Text>
                </Pressable>
              </View>

              {quickEntryApplied && (
                <View
                  testID="quick-entry-applied-banner"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    paddingVertical: 4,
                  }}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.income} />
                  <Text variant="caption" style={{ color: colors.income, flex: 1 }}>
                    {t.transactions.quickEntryAppliedBanner}
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Leitor de Nota Fiscal / Cupom Fiscal (Gastos) */}
          {!isEditing && !isTransfer && type === 'expense' && (
            <Card style={{ gap: spacing.sm }}>
              <View
                testID="receipt-scanner-card"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', letterSpacing: 0.6 }}>
                      {t.transactions.scanReceiptTitle}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {t.transactions.scanReceiptSubtitle}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Pressable
                  testID="scan-receipt-camera-btn"
                  disabled={scanningReceipt}
                  onPress={onScanReceiptCamera}
                  style={{
                    flex: 1,
                    minWidth: 96,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: colors.primary + '1F',
                    borderWidth: 1,
                    borderColor: colors.primary + '44',
                  }}>
                  <Ionicons name="camera-outline" size={16} color={colors.primary} />
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                    {t.transactions.scanReceiptCamera}
                  </Text>
                </Pressable>

                <Pressable
                  testID="scan-receipt-gallery-btn"
                  disabled={scanningReceipt}
                  onPress={onScanReceiptGallery}
                  style={{
                    flex: 1,
                    minWidth: 96,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: colors.primary + '1F',
                    borderWidth: 1,
                    borderColor: colors.primary + '44',
                  }}>
                  <Ionicons name="images-outline" size={16} color={colors.primary} />
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                    {t.transactions.scanReceiptGallery}
                  </Text>
                </Pressable>

                <Pressable
                  testID="scan-receipt-paste-toggle"
                  disabled={scanningReceipt}
                  onPress={() => setShowReceiptPaste((v) => !v)}
                  style={{
                    flex: 1,
                    minWidth: 96,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: showReceiptPaste ? colors.primary + '2E' : colors.surfaceRaised,
                    borderWidth: 1,
                    borderColor: showReceiptPaste ? colors.primary : colors.border,
                  }}>
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={showReceiptPaste ? colors.primary : colors.text}
                  />
                  <Text
                    variant="caption"
                    style={{
                      color: showReceiptPaste ? colors.primary : colors.text,
                      fontWeight: '600',
                    }}>
                    {t.transactions.scanReceiptPasteToggle}
                  </Text>
                </Pressable>
              </View>

              {showReceiptPaste && (
                <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                  <TextField
                    testID="receipt-text-input"
                    value={receiptTextInput}
                    onChangeText={setReceiptTextInput}
                    placeholder={t.transactions.scanReceiptTextPlaceholder}
                    multiline
                    style={{ minHeight: 76, textAlignVertical: 'top' }}
                  />
                  <Button
                    testID="extract-receipt-text-btn"
                    label={t.transactions.scanReceiptExtractBtn}
                    onPress={onScanReceiptText}
                    loading={scanningReceipt}
                    icon="sparkles"
                  />
                </View>
              )}

              {scanningReceipt && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 2 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text variant="caption" color="textMuted">
                    {t.transactions.scanReceiptAnalyzing}
                  </Text>
                </View>
              )}

              {scannedReceipt && !scanningReceipt && (
                <View
                  testID="receipt-detected-banner"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: colors.income + '18',
                    borderWidth: 1,
                    borderColor: colors.income + '44',
                  }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.income} />
                  <Text variant="caption" style={{ color: colors.income, flex: 1, fontWeight: '600' }}>
                    {t.transactions.scanReceiptDetected(
                      scannedReceipt.segmentLabel,
                      scannedReceipt.amount.format(),
                    )}
                  </Text>
                </View>
              )}

              {receiptError && !scanningReceipt && (
                <View style={{ gap: 4 }}>
                  <Text variant="caption" color="expense" testID="receipt-scan-error">
                    {receiptError}
                  </Text>
                  {!geminiApiKey && (
                    <Pressable onPress={() => router.push('/settings')} testID="configure-gemini-from-receipt">
                      <Text
                        variant="caption"
                        style={{ color: colors.primary, textDecorationLine: 'underline' }}>
                        {t.dashboard.askGeminiConfigureLink}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>
          )}

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
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Chip
                label={t.common.today}
                selected={!showCustomDate && parsedDate === today()}
                onPress={() => {
                  setShowCustomDate(false);
                  setDateText(formatDateBR(today()));
                }}
              />
              <Chip
                label={t.common.yesterday}
                selected={!showCustomDate && parsedDate === addDays(today(), -1)}
                onPress={() => {
                  setShowCustomDate(false);
                  setDateText(formatDateBR(addDays(today(), -1)));
                }}
              />
              <Chip
                label={t.transactions.otherDateChip}
                icon="calendar-outline"
                selected={
                  showCustomDate ||
                  (parsedDate !== today() && parsedDate !== addDays(today(), -1))
                }
                onPress={() => setShowCustomDate((v) => !v)}
              />
              {!isEditing && !isTransfer && (
                <Chip
                  label={t.transactions.recurringToggle}
                  icon="repeat"
                  color={colors.primary}
                  selected={isRecurring}
                  onPress={() => setIsRecurring((v) => !v)}
                />
              )}
            </View>
            {!isEditing && !isTransfer && isRecurring && (
              <Text variant="caption" color="primary" testID="recurring-hint">
                {t.transactions.recurringHint(dayFromISODate(parsedDate ?? today()))}
              </Text>
            )}
            {(showCustomDate ||
              !parsedDate ||
              !!errors.date ||
              (parsedDate !== today() && parsedDate !== addDays(today(), -1))) && (
              <TextField
                testID="date-input"
                value={dateText}
                onChangeText={setDateText}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
                invalid={!parsedDate || !!errors.date}
              />
            )}
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
