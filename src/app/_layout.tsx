import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrateDatabase } from '@/infrastructure/database/migrations';
import { useWallet } from '@/store/wallet-store';
import { Text } from '@/ui/text';
import { useTheme } from '@/ui/theme';

/**
 * Raiz do app. Ordem de inicialização:
 *   SQLiteProvider abre o banco e roda as migrações (onInit)
 *   → Bootstrap entrega o banco para a store
 *   → só então as telas são renderizadas.
 */
export default function RootLayout() {
  const { isDark } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <Bootstrap />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function Bootstrap() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const status = useWallet((s) => s.status);
  const errorMessage = useWallet((s) => s.errorMessage);

  useEffect(() => {
    useWallet.getState().init(db);
  }, [db]);

  const centered = {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    padding: 32,
    backgroundColor: colors.background,
  };

  if (status === 'error') {
    return (
      <View style={centered}>
        <Text variant="heading">Não foi possível abrir seus dados</Text>
        <Text color="textMuted" style={{ textAlign: 'center' }}>
          {errorMessage}
        </Text>
      </View>
    );
  }

  if (status !== 'ready') {
    return (
      <View style={centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="transaction-form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="account-form" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
