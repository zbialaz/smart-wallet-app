import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useWallet } from '@/store/wallet-store';
import { useTheme } from '@/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, iconActive: IconName) => ({
  title,
  tabBarIcon: ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? iconActive : icon} size={size} color={color as string} />
  ),
});

export default function TabsLayout() {
  const { colors } = useTheme();
  const hasAccounts = useWallet((s) => s.accounts.length > 0);

  // US-023: sem nenhuma conta o app não funciona → onboarding
  if (!hasAccounts) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', paddingBottom: 6 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={tab('Início', 'pie-chart-outline', 'pie-chart')} />
      <Tabs.Screen name="transactions" options={tab('Transações', 'swap-vertical-outline', 'swap-vertical')} />
      <Tabs.Screen name="accounts" options={tab('Contas', 'wallet-outline', 'wallet')} />
    </Tabs>
  );
}
