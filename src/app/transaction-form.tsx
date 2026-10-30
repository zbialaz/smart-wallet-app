import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { categoriesForType } from '@/domains/categories/category';
import { DESCRIPTION_MAX_LENGTH, type TransactionField } from '@/domains/transactions/transaction';
import { addDays, formatDateBR, parseDateBR, today, type ISODate } from '@/shared/date';
import { Money } from '@/shared/money';
import type { FieldErrors } from '@/shared/result';
import { TRANSACTION_TYPE_LABEL, type TransactionType } from '@/shared/transaction-type';
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const accounts = useWallet((s) => s.accounts);
  const categories = useWallet((s) => s.categories);
  const saveTransaction = useWallet((s) => s.saveTransaction);
  const deleteTransaction = useWallet((s) => s.deleteTransaction);
  const findTransaction = useWallet((s) => s.findTransaction);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState(Money.zero());
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(accounts.length === 1 ? accounts[0].id : null);
  const [dateText, setDateText] = useState(formatDateBR(today()));
  const [errors, setErrors] = useState<FieldErrors<TransactionField>>({});
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

  const accent = accentFor(type);
  const visibleCategories = categoriesForType(categories, type);
  const parsedDate = parseDateBR(dateText);

  // Mostra a categoria já selecionada mesmo que esteja arquivada (RN-10, na edição)
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryChips =
    selectedCategory && !visibleCategories.some((c) => c.id === selectedCategory.id) && selectedCategory.type === type
      ? [selectedCategory, ...visibleCategories]
      : visibleCategories;

  function changeType(next: TransactionType) {
    if (next === type) return;
    setType(next);
    setCategoryId(null); // RN-04: a categoria precisa ser do mesmo tipo
    setErrors({});
  }

  async function onSave() {
    setSaving(true);
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
            <Text variant="title">{isEditing ? 'Editar transação' : 'Nova transação'}</Text>
            <Pressable onPress={() => router.back()} hitSlop={12} testID="close-form">
              <Text color="textMuted">Fechar</Text>
            </Pressable>
          </View>

          {/* Gasto / Receita — o destaque muda de cor (US-002.1) */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4 }}>
            {(['expense', 'income'] as const).map((t) => (
              <Pressable
                key={t}
                testID={`type-${t}`}
                onPress={() => changeType(t)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderRadius: radius.sm,
                  backgroundColor: type === t ? accentFor(t) + '2B' : 'transparent',
                }}>
                <Text variant="bodyStrong" style={{ color: type === t ? accentFor(t) : colors.textMuted }}>
                  {TRANSACTION_TYPE_LABEL[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field label="Valor" error={errors.amount}>
            <AmountInput value={amount} onChange={setAmount} accent={accent} autoFocus={!isEditing} invalid={!!errors.amount} />
          </Field>

          <Field label="Descrição (opcional)" error={errors.description}>
            <TextField
              testID="description-input"
              value={description}
              onChangeText={setDescription}
              placeholder="Ex.: iFood, mercado, salário…"
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
          </Field>

          <Field label="Categoria" error={errors.categoryId}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {categoryChips.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  icon={c.icon as never}
                  color={c.color}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </View>
          </Field>

          <Field label="Conta" error={errors.accountId}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {accounts.map((a) => (
                <Chip key={a.id} label={a.name} icon="business" color={a.color} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
              ))}
            </View>
          </Field>

          <Field label="Data" error={errors.date ?? (parsedDate ? undefined : 'Use o formato DD/MM/AAAA')}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Chip label="Hoje" selected={parsedDate === today()} onPress={() => setDateText(formatDateBR(today()))} />
              <Chip label="Ontem" selected={parsedDate === addDays(today(), -1)} onPress={() => setDateText(formatDateBR(addDays(today(), -1)))} />
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
            label={isEditing ? 'Salvar alterações' : 'Salvar'}
            onPress={onSave}
            loading={saving}
            style={{ backgroundColor: accent }}
            testID="save-transaction"
          />

          {isEditing && (
            <Button label="Excluir transação" variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} testID="delete-transaction" />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Excluir transação?"
        message="Essa ação não pode ser desfeita e o saldo da conta será ajustado."
        confirmLabel="Excluir"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
