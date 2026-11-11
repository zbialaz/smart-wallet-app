import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  BANK_PRESETS,
  DEFAULT_ACCOUNT_COLOR,
  ACCOUNT_NAME_MAX_LENGTH,
  type AccountField,
} from '@/domains/accounts/account';
import { useI18n } from '@/shared/i18n';
import { Money } from '@/shared/money';
import type { FieldErrors } from '@/shared/result';
import { useWallet } from '@/store/wallet-store';
import { AmountInput, Button, Chip, Field, TextField } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/** Formulário de conta, usado no onboarding (US-023), em "Adicionar conta" (US-007) e na edição de conta. */
export function AccountForm({
  accountId,
  submitLabel,
  onDone,
}: {
  accountId?: string;
  submitLabel: string;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const accounts = useWallet((s) => s.accounts);
  const createAccount = useWallet((s) => s.createAccount);
  const updateAccount = useWallet((s) => s.updateAccount);

  const existing = accountId ? accounts.find((a) => a.id === accountId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? DEFAULT_ACCOUNT_COLOR);
  const [initialBalance, setInitialBalance] = useState(existing?.initialBalance ?? Money.zero());
  const [errors, setErrors] = useState<FieldErrors<AccountField>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    setSaving(true);
    const result = existing
      ? await updateAccount(existing.id, { name, color, initialBalance })
      : await createAccount({ name, color, initialBalance });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error);
      return;
    }
    onDone();
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.xxxl }}>
      <Field label={t.accounts.mostUsedBankLabel}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {BANK_PRESETS.map((bank) => (
            <Chip
              key={bank.name}
              label={bank.name}
              color={bank.color}
              selected={name === bank.name}
              onPress={() => {
                setName(bank.name);
                setColor(bank.color);
                setErrors((e) => ({ ...e, name: undefined }));
              }}
            />
          ))}
        </View>
      </Field>

      <Field label={t.accounts.accountNameLabel} error={errors.name}>
        <TextField
          testID="account-name-input"
          value={name}
          onChangeText={setName}
          placeholder={t.accounts.accountNamePlaceholder}
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          invalid={!!errors.name}
          style={{ borderColor: errors.name ? colors.expense : undefined }}
        />
      </Field>

      <Field label={t.accounts.initialBalanceLabel} error={errors.initialBalance}>
        <AmountInput value={initialBalance} onChange={setInitialBalance} accent={colors.income} invalid={!!errors.initialBalance} />
      </Field>

      <Button label={submitLabel} onPress={onSubmit} loading={saving} testID="save-account" />
    </ScrollView>
  );
}
