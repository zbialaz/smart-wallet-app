import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AccountForm } from '@/domains/accounts/account-form';
import { FadeIn, IconBadge, Screen, ThemeToggleButton } from '@/ui/components';
import { Text } from '@/ui/text';
import { spacing, useTheme } from '@/ui/theme';

/** Primeira abertura (US-023): o app só funciona com ao menos uma conta. */
export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl }}>
        <FadeIn style={{ gap: spacing.md, paddingTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <IconBadge icon="wallet" color={colors.primary} size={64} />
            <ThemeToggleButton />
          </View>
          <Text variant="display">Bem-vindo ao Smart Wallet</Text>
          <Text color="textMuted">
            Vamos começar cadastrando sua primeira conta. Você pode adicionar outras depois.
          </Text>
        </FadeIn>
        <AccountForm submitLabel="Começar" onDone={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
