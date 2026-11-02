import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AccountForm } from '@/domains/accounts/account-form';
import { useWallet } from '@/store/wallet-store';
import { FadeIn, IconBadge, Screen, ThemeToggleButton } from '@/ui/components';
import { Text } from '@/ui/text';
import { spacing, useTheme } from '@/ui/theme';

/** Primeira abertura (US-023): o app só funciona com ao menos uma conta bancária. */
export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const currentUser = useWallet((s) => s.currentUser);
  const signOut = useWallet((s) => s.signOut);

  const firstName = currentUser?.name.split(' ')[0] ?? 'você';

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl }}>
        <FadeIn style={{ gap: spacing.md, paddingTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <IconBadge icon="wallet" color={colors.primary} size={64} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemeToggleButton />
              <Pressable
                onPress={async () => {
                  await signOut();
                  router.replace('/auth');
                }}
                hitSlop={10}
                style={{ paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                <Text variant="caption" color="textMuted">
                  Sair
                </Text>
              </Pressable>
            </View>
          </View>
          <Text variant="display">Olá, {firstName}!</Text>
          <Text color="textMuted">
            Vamos começar cadastrando sua primeira conta bancária. Você pode adicionar outras depois.
          </Text>
        </FadeIn>
        <AccountForm submitLabel="Começar" onDone={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
