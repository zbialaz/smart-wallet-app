import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  CATEGORY_NAME_MAX_LENGTH,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  type CategoryField,
} from '@/domains/categories/category';
import { useI18n } from '@/shared/i18n';
import type { FieldErrors } from '@/shared/result';
import type { TransactionType } from '@/shared/transaction-type';
import { useWallet } from '@/store/wallet-store';
import { Button, Field, IconBadge, Screen, TextField } from '@/ui/components';
import { Text } from '@/ui/text';
import { radius, spacing, useTheme } from '@/ui/theme';

/**
 * Formulário de categoria — US-011 (criar) e US-024 (editar).
 * Sem `id` na URL = criar. Com `id` = editar (o tipo fica travado: RN-04).
 */
export default function CategoryFormScreen() {
  const router = useRouter();
  const { colors, accentFor } = useTheme();
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const categories = useWallet((s) => s.categories);
  const saveCategory = useWallet((s) => s.saveCategory);

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [icon, setIcon] = useState<string>(DEFAULT_CATEGORY_ICON);
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [errors, setErrors] = useState<FieldErrors<CategoryField>>({});
  const [saving, setSaving] = useState(false);

  // Edição: carrega a categoria existente dentro do formulário
  useEffect(() => {
    if (!id) return;
    const existing = categories.find((c) => c.id === id);
    if (existing) {
      setName(existing.name);
      setType(existing.type);
      setIcon(existing.icon);
      setColor(existing.color);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave() {
    setSaving(true);
    const result = await saveCategory({ name, icon, color, type }, id);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error);
      return;
    }
    router.back();
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title">
              {isEditing ? t.categories.formEditTitle : t.categories.formNewTitle}
            </Text>
            <Pressable onPress={() => router.back()} hitSlop={12} testID="close-category-form">
              <Text color="textMuted">{t.common.close}</Text>
            </Pressable>
          </View>

          {/* Prévia ao vivo */}
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <IconBadge icon={icon as never} color={color} size={72} />
            <Text variant="bodyStrong">{name.trim() || t.categories.namePlaceholder}</Text>
          </View>

          <Field label={t.categories.nameLabel} error={errors.name}>
            <TextField
              testID="category-name-input"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder={t.categories.namePlaceholder}
              maxLength={CATEGORY_NAME_MAX_LENGTH}
              invalid={!!errors.name}
            />
          </Field>

          <Field label={t.categories.typeLabel}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: 4,
                opacity: isEditing ? 0.55 : 1,
              }}>
              {(['expense', 'income'] as const).map((txType) => (
                <Pressable
                  key={txType}
                  testID={`category-type-${txType}`}
                  disabled={isEditing}
                  onPress={() => setType(txType)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    borderRadius: radius.sm,
                    backgroundColor: type === txType ? accentFor(txType) + '2B' : 'transparent',
                  }}>
                  <Text
                    variant="bodyStrong"
                    style={{ color: type === txType ? accentFor(txType) : colors.textMuted }}>
                    {txType === 'expense' ? t.transactions.expense : t.transactions.income}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t.categories.iconLabel} error={errors.icon}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {CATEGORY_ICON_OPTIONS.map((option) => {
                const selected = icon === option;
                return (
                  <Pressable
                    key={option}
                    testID={`category-icon-${option}`}
                    onPress={() => setIcon(option)}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: selected ? color : colors.border,
                      backgroundColor: selected ? color + '26' : colors.surface,
                    }}>
                    <Ionicons
                      name={option as never}
                      size={21}
                      color={selected ? color : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label={t.categories.colorLabel} error={errors.color}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {CATEGORY_COLOR_OPTIONS.map((option) => {
                const selected = color === option;
                return (
                  <Pressable
                    key={option}
                    testID={`category-color-${option}`}
                    onPress={() => setColor(option)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: option,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: selected ? 3 : 0,
                      borderColor: colors.text,
                    }}>
                    {selected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Button
            testID="save-category"
            label={isEditing ? t.common.saveChanges : t.categories.createSubmit}
            onPress={onSave}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

