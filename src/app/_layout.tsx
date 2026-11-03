import { Stack, useRouter, useSegments } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrateDatabase } from '@/infrastructure/database/migrations';
import { useWallet } from '@/store/wallet-store';
import { Text } from '@/ui/text';
import { useTheme } from '@/ui/theme';

/**
 * Raiz do app.
 * IMPORTANTE (Expo Router): O <Stack> deve permanecer sempre montado desde o 1º render
 * para que o navegador raiz processe a árvore de rotas ('ROUTE_NAMES_CHANGED').
 * O estado de carregamento/erro é exibido como camada sobreposta (overlay).
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
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  const status = useWallet((s) => s.status);
  const errorMessage = useWallet((s) => s.errorMessage);
  const currentUser = useWallet((s) => s.currentUser);
  const hasAccounts = useWallet((s) => s.accounts.length > 0);

  useEffect(() => {
    useWallet.getState().init(db);
  }, [db]);

  // Guarda central de navegação: redireciona conforme sessão do usuário e contas bancárias
  useEffect(() => {
    if (status !== 'ready') return;

    const currentRoute = segments[0];
    const inAuth = currentRoute === 'auth';
    const inOnboarding = currentRoute === 'onboarding';

    if (!currentUser) {
      if (!inAuth) {
        router.replace('/auth');
      }
      return;
    }

    // US-023: usuário logado mas ainda sem nenhuma conta bancária -> Onboarding
    if (!hasAccounts) {
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
      return;
    }

    // Usuário logado e com conta bancária: se estiver em auth ou onboarding, vai para a home
    if (inAuth || inOnboarding) {
      router.replace('/');
    }
  }, [status, currentUser, hasAccounts, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="transaction-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="categories" />
        <Stack.Screen name="category-form" options={{ presentation: 'modal' }} />
      </Stack>

      {status === 'error' && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <Text variant="heading">Não foi possível abrir seus dados</Text>
          <Text color="textMuted" style={{ textAlign: 'center' }}>
            {errorMessage}
          </Text>
        </View>
      )}

      {status !== 'ready' && status !== 'error' && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    zIndex: 999,
  },
});
