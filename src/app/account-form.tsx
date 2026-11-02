import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AccountForm } from '@/domains/accounts/account-form';
import { useI18n } from '@/shared/i18n';
import { Screen } from '@/ui/components';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';

export default function AccountFormScreen() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="title">{t.accounts.newAccountModalTitle}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text color="textMuted">{t.common.close}</Text>
          </Pressable>
        </View>
        <AccountForm submitLabel={t.accounts.createAccountSubmit} onDone={() => router.back()} />
      </View>
    </Screen>
  );
}
