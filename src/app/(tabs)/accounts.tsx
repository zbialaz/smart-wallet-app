import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { AccountWithBalance } from '@/domains/accounts/account';
import { useI18n } from '@/shared/i18n';
import { useConsolidatedBalance } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import {
  Button,
  Card,
  ConfirmDialog,
  FadeIn,
  IconBadge,
  Screen,
} from '@/ui/components';
import { Text } from '@/ui/text';
import { radius, spacing, usePrivacy, useTheme } from '@/ui/theme';
import { MASKED_BALANCE } from '@/ui/wallet-pocket';

/** US-007 (cadastrar conta bancária), US-008 (saldo por conta) e US-022 (excluir conta bancária). */
export default function AccountsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isBalanceHidden } = usePrivacy();
  const { t } = useI18n();

  const accounts = useWallet((s) => s.accounts);
  const toggleBalanceHidden = useWallet((s) => s.toggleBalanceHidden);
  const deleteBankAccount = useWallet((s) => s.deleteBankAccount);
  const consolidated = useConsolidatedBalance();

  const [bankAccountToDelete, setBankAccountToDelete] = useState<AccountWithBalance | null>(null);

  async function handleConfirmDeleteBankAccount() {
    if (!bankAccountToDelete) return;
    const id = bankAccountToDelete.id;
    setBankAccountToDelete(null);
    await deleteBankAccount(id);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 }}>
        <FadeIn>
          <Text variant="title">{t.accounts.title}</Text>
          <Pressable
            onPress={toggleBalanceHidden}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text color="textMuted">
              {t.accounts.consolidatedPrefix}{' '}
              {isBalanceHidden ? MASKED_BALANCE : consolidated.format()}
            </Text>
            <Ionicons
              name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
              size={15}
              color={colors.textMuted}
            />
          </Pressable>
        </FadeIn>

        <View style={{ gap: spacing.md }}>
          {accounts.map((account, i) => (
            <FadeIn key={account.id} delay={60 + i * 50}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Pressable
                  testID={`open-account-statement-${account.name}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/transactions',
                      params: { accountId: account.id },
                    })
                  }
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <IconBadge icon="business" color={account.color} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{account.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {t.accounts.currentBalance}
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={toggleBalanceHidden}>
                  <Text
                    variant="heading"
                    testID={`balance-${account.name}`}
                    style={{
                      color:
                        isBalanceHidden
                          ? colors.textMuted
                          : account.balance.isNegative()
                            ? colors.expense
                            : colors.text,
                    }}>
                    {isBalanceHidden ? MASKED_BALANCE : account.balance.format()}
                  </Text>
                </Pressable>
                <Pressable
                  testID={`edit-bank-account-${account.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={t.common.saveChanges}
                  onPress={() => router.push({ pathname: '/account-form', params: { id: account.id } })}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: radius.sm,
                    backgroundColor: colors.surfaceRaised,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  testID={`delete-bank-account-${account.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={t.accounts.deleteTitle(account.name)}
                  onPress={() => setBankAccountToDelete(account)}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: radius.sm,
                    backgroundColor: colors.expenseSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Ionicons name="trash-outline" size={16} color={colors.expense} />
                </Pressable>
              </Card>
            </FadeIn>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button label={t.accounts.addBankAccount} icon="add" onPress={() => router.push('/account-form')} testID="add-account" />
          {accounts.length >= 1 && (
            <Button
              label={t.accounts.openFinanceBtn}
              variant="secondary"
              icon="sync"
              onPress={() => router.push('/open-finance')}
              testID="open-finance-sync-btn"
            />
          )}
          {accounts.length >= 2 && (
            <Button
              label={t.accounts.transferBetweenAccounts}
              variant="secondary"
              icon="swap-horizontal"
              onPress={() => router.push({ pathname: '/transaction-form', params: { mode: 'transfer' } })}
              testID="transfer-between-accounts"
            />
          )}
        </View>
      </ScrollView>

      {/* Modal de confirmação para excluir uma conta bancária */}
      <ConfirmDialog
        visible={!!bankAccountToDelete}
        title={t.accounts.deleteTitle(bankAccountToDelete?.name ?? '')}
        message={t.accounts.deleteMessage}
        confirmLabel={t.accounts.deleteConfirmBtn}
        onConfirm={handleConfirmDeleteBankAccount}
        onCancel={() => setBankAccountToDelete(null)}
      />
    </Screen>
  );
}
