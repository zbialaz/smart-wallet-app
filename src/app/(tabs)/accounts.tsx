import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useConsolidatedBalance } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import { Button, Card, Chip, FadeIn, IconBadge, Screen, ThemeToggleButton } from '@/ui/components';
import { Text } from '@/ui/text';
import { spacing, usePrivacy, useTheme, type ThemeMode } from '@/ui/theme';
import { MASKED_BALANCE } from '@/ui/wallet-pocket';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { mode: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Noturno', icon: 'moon-outline' },
];

/** US-007 (cadastrar conta), US-008 (saldo por conta), US-020 (tema claro/escuro) e Privacidade. */
export default function AccountsScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const { isBalanceHidden } = usePrivacy();
  const accounts = useWallet((s) => s.accounts);
  const setThemeMode = useWallet((s) => s.setThemeMode);
  const toggleBalanceHidden = useWallet((s) => s.toggleBalanceHidden);
  const consolidated = useConsolidatedBalance();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 }}>
        <FadeIn style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="title">Contas</Text>
            <Pressable
              onPress={toggleBalanceHidden}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text color="textMuted">
                Saldo total: {isBalanceHidden ? MASKED_BALANCE : consolidated.format()}
              </Text>
              <Ionicons
                name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
                size={15}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          <ThemeToggleButton />
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
              </Card>
            </FadeIn>
          ))}
        </View>

        <Button label="Adicionar conta" icon="add" onPress={() => router.push('/account-form')} testID="add-account" />

        {/* Preferência de Ocultação de Saldo (Asteriscos) */}
        <FadeIn delay={120}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
            <View style={{ gap: 2, flex: 1 }}>
              <Text variant="label" color="textMuted">
                PRIVACIDADE DOS VALORES
              </Text>
              <Text variant="caption" color="textMuted">
                Ocultar saldos das contas com asteriscos ({MASKED_BALANCE}).
              </Text>
            </View>
            <Chip
              label={isBalanceHidden ? 'Oculto' : 'Visível'}
              icon={isBalanceHidden ? 'eye-off' : 'eye'}
              selected={isBalanceHidden}
              onPress={toggleBalanceHidden}
            />
          </Card>
        </FadeIn>

        {/* Preferência de Aparência / Tema (US-020) */}
        <FadeIn delay={160}>
          <Card style={{ gap: spacing.md }}>
            <View style={{ gap: 2 }}>
              <Text variant="label" color="textMuted">
                APARÊNCIA DO APP
              </Text>
              <Text variant="caption" color="textMuted">
                Escolha entre seguir o sistema, tema claro ou modo noturno.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {THEME_OPTIONS.map((opt) => (
                <Chip
                  key={opt.mode}
                  label={opt.label}
                  icon={opt.icon}
                  selected={mode === opt.mode}
                  onPress={() => setThemeMode(opt.mode)}
                />
              ))}
            </View>
          </Card>
        </FadeIn>
      </ScrollView>
    </Screen>
  );
}
