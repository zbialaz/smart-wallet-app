import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  BANK_PRESETS,
  DEFAULT_ACCOUNT_COLOR,
  ACCOUNT_NAME_MAX_LENGTH,
  type AccountField,
} from '@/domains/accounts/account';
import { Money } from '@/shared/money';
import type { FieldErrors } from '@/shared/result';
import { useWallet } from '@/store/wallet-store';
import { AmountInput, Button, Chip, Field, TextField } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/** Formulário de conta, usado no onboarding (US-023) e em "Adicionar conta" (US-007). */
export function AccountForm({ submitLabel, onDone }: { submitLabel: string; onDone: () => void }) {
  const { colors } = useTheme();
  const createAccount = useWallet((s) => s.createAccount);

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_ACCOUNT_COLOR);
  const [initialBalance, setInitialBalance] = useState(Money.zero());
  const [errors, setErrors] = useState<FieldErrors<AccountField>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    setSaving(true);
    const result = await createAccount({ name, color, initialBalance });
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
      <Field label="Banco mais usado">
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

      <Field label="Nome / apelido da conta" error={errors.name}>
        <TextField
          testID="account-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Nubank, Carteira…"
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          invalid={!!errors.name}
          style={{ borderColor: errors.name ? colors.expense : undefined }}
        />
      </Field>

      <Field label="Saldo inicial" error={errors.initialBalance}>
        <AmountInput value={initialBalance} onChange={setInitialBalance} accent={colors.income} invalid={!!errors.initialBalance} />
      </Field>

      <Button label={submitLabel} onPress={onSubmit} loading={saving} testID="save-account" />
    </ScrollView>
  );
}
