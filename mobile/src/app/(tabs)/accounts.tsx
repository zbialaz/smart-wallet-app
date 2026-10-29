import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useConsolidatedBalance } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import { Button, Card, FadeIn, IconBadge, Screen } from '@/ui/components';
import { Text } from '@/ui/text';
import { colors, spacing } from '@/ui/theme';

/** US-007 (cadastrar conta) e US-008 (saldo por conta). */
export default function AccountsScreen() {
  const router = useRouter();
  const accounts = useWallet((s) => s.accounts);
  const consolidated = useConsolidatedBalance();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 }}>
        <FadeIn>
          <Text variant="title">Contas</Text>
          <Text color="textMuted">Saldo total: {consolidated.format()}</Text>
        </FadeIn>

        <View style={{ gap: spacing.md }}>
          {accounts.map((account, i) => (
            <FadeIn key={account.id} delay={60 + i * 50}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <IconBadge icon="business" color={account.color} size={48} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{account.name}</Text>
                  <Text variant="caption" color="textMuted">
                    Saldo atual
                  </Text>
                </View>
                <Text
                  variant="heading"
                  testID={`balance-${account.name}`}
                  style={{ color: account.balance.isNegative() ? colors.expense : colors.text }}>
                  {account.balance.format()}
                </Text>
              </Card>
            </FadeIn>
          ))}
        </View>

        <Button label="Adicionar conta" icon="add" onPress={() => router.push('/account-form')} testID="add-account" />
      </ScrollView>
    </Screen>
  );
}
