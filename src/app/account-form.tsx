import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AccountForm } from '@/domains/accounts/account-form';
import { Screen } from '@/ui/components';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';

export default function AccountFormScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="title">Nova conta</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text color="textMuted">Fechar</Text>
          </Pressable>
        </View>
        <AccountForm submitLabel="Cadastrar conta" onDone={() => router.back()} />
      </View>
    </Screen>
  );
}
