import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useI18n } from '@/shared/i18n';
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
  const { t } = useI18n();

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
      <Tabs.Screen name="index" options={tab(t.tabs.home, 'home-outline', 'home')} />
      <Tabs.Screen name="analytics" options={tab(t.tabs.analytics, 'pie-chart-outline', 'pie-chart')} />
      <Tabs.Screen name="transactions" options={tab(t.tabs.transactions, 'swap-vertical-outline', 'swap-vertical')} />
      <Tabs.Screen name="accounts" options={tab(t.tabs.accounts, 'wallet-outline', 'wallet')} />
      <Tabs.Screen name="settings" options={tab(t.tabs.settings, 'settings-outline', 'settings')} />
    </Tabs>
  );
}
