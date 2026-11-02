import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  USER_NAME_MAX_LENGTH,
  type AuthField,
  type SocialProvider,
} from '@/domains/auth/user';
import { LANGUAGE_OPTIONS, useI18n } from '@/shared/i18n';
import type { FieldErrors } from '@/shared/result';
import { useWallet } from '@/store/wallet-store';
import {
  Button,
  Card,
  FadeIn,
  Field,
  IconBadge,
  Screen,
  TextField,
} from '@/ui/components';
import { Text } from '@/ui/text';
import { ForcedThemeContext, lightColors, radius, spacing } from '@/ui/theme';

type AuthMode = 'login' | 'register';

/**
 * Tela de Autenticação:
 * - Login Social (Continuar com Apple / Continuar com Google)
 * - Login e Criação de Conta por E-mail e Senha
 */
export default function AuthScreen() {
  const router = useRouter();
  const colors = lightColors;
  const { language, t } = useI18n();
  const setLanguage = useWallet((s) => s.setLanguage);
  const loginUser = useWallet((s) => s.loginUser);
  const registerUser = useWallet((s) => s.registerUser);
  const loginWithSocial = useWallet((s) => s.loginWithSocial);

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<AuthField>>({});
  const [submitting, setSubmitting] = useState(false);

  // Modal de autenticação social (Google / Apple)
  const [socialModalProvider, setSocialModalProvider] = useState<SocialProvider | null>(null);
  const [socialName, setSocialName] = useState('Eduardo Bialas');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  function switchMode(next: AuthMode) {
    if (next === authMode) return;
    setAuthMode(next);
    setErrors({});
  }

  async function onSubmit() {
    setSubmitting(true);
    setErrors({});

    if (authMode === 'login') {
      const res = await loginUser({ email, password });
      setSubmitting(false);
      if (!res.ok) {
        setErrors(res.error);
        return;
      }
      router.replace('/');
    } else {
      const res = await registerUser({
        name,
        email,
        password,
        confirmPassword,
      });
      setSubmitting(false);
      if (!res.ok) {
        setErrors(res.error);
        return;
      }
      router.replace('/');
    }
  }

  /**
   * Inicia o fluxo de login com Google ou Apple.
   * - Se EXPO_PUBLIC_GOOGLE_CLIENT_ID estiver definido no ambiente para o Google,
   *   abre o fluxo OAuth 2.0 real via navegador seguro (expo-web-browser).
   * - Caso contrário, abre a folha interativa de seleção de conta (Apple ID / Conta Google)
   *   para funcionar imediatamente no Expo Go / Simulador sem exigir chaves pagas.
   */
  async function handleStartSocialAuth(provider: SocialProvider) {
    setSocialError(null);

    const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    if (provider === 'google' && googleClientId) {
      try {
        setSocialLoading(true);
        const redirectUri = Linking.createURL('auth');
        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth` +
          `?client_id=${encodeURIComponent(googleClientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token` +
          `&scope=${encodeURIComponent('openid profile email')}`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (result.type === 'success' && result.url) {
          const match = result.url.match(/access_token=([^&]+)/);
          const accessToken = match?.[1];
          if (accessToken) {
            const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = (await resp.json()) as { sub?: string; name?: string; email?: string };
            if (profile.email) {
              const loginRes = await loginWithSocial({
                provider: 'google',
                name: profile.name ?? 'Usuário Google',
                email: profile.email,
                providerId: profile.sub,
              });
              setSocialLoading(false);
              if (loginRes.ok) {
                router.replace('/');
                return;
              }
            }
          }
        }
        setSocialLoading(false);
        return;
      } catch {
        setSocialLoading(false);
      }
    }

    // Abre a folha de autenticação rápida para Apple ID ou Conta Google
    setSocialName('Eduardo Bialas');
    setSocialEmail(
      provider === 'apple' ? 'eduardo@icloud.com' : 'eduardo.bialas@gmail.com',
    );
    setSocialModalProvider(provider);
  }

  async function handleConfirmSocialSheet() {
    if (!socialModalProvider) return;
    setSocialLoading(true);
    setSocialError(null);

    const res = await loginWithSocial({
      provider: socialModalProvider,
      name: socialName,
      email: socialEmail,
    });
    setSocialLoading(false);

    if (!res.ok) {
      setSocialError(res.error.email ?? 'Não foi possível autenticar');
      return;
    }

    setSocialModalProvider(null);
    router.replace('/');
  }

  return (
    <ForcedThemeContext.Provider value="light">
      <StatusBar style="dark" />
      <Screen edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Cabeçalho com Marca (Sempre no modo claro) + Seletor de Idioma */}
            <FadeIn style={styles.header}>
              <View style={styles.topRow}>
                <IconBadge icon="wallet" color={colors.primary} size={56} />
                <View style={[styles.langPillGroup, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const active = language === opt.code;
                    return (
                      <Pressable
                        key={opt.code}
                        testID={`auth-lang-${opt.code}`}
                        onPress={() => setLanguage(opt.code)}
                        style={[
                          styles.langPillItem,
                          active && { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1 },
                        ]}>
                        <Text
                          variant="caption"
                          style={{
                            fontWeight: active ? '800' : '600',
                            color: active ? colors.primary : colors.textMuted,
                            fontSize: 11,
                          }}>
                          {opt.flag} {opt.code.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <Text variant="display">Smart Wallet</Text>
                <Text color="textMuted">
                  {authMode === 'login' ? t.auth.loginSubtitle : t.auth.registerSubtitle}
                </Text>
              </View>
            </FadeIn>

            {/* Botões de Login Social: Apple & Google */}
            <FadeIn delay={45} style={{ gap: spacing.sm }}>
              {/* Botão Continuar com Apple */}
              <Pressable
                testID="oauth-apple-btn"
                onPress={() => handleStartSocialAuth('apple')}
                style={({ pressed }) => [
                  styles.socialButton,
                  {
                    backgroundColor: '#1E1916',
                    borderColor: '#1E1916',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}>
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                <Text variant="bodyStrong" style={{ color: '#FFFFFF' }}>
                  {t.auth.continueWithApple}
                </Text>
              </Pressable>

            {/* Botão Continuar com Google */}
            <Pressable
              testID="oauth-google-btn"
              onPress={() => handleStartSocialAuth('google')}
              style={({ pressed }) => [
                styles.socialButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderStrong,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}>
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text variant="bodyStrong" style={{ color: colors.text }}>
                {t.auth.continueWithGoogle}
              </Text>
            </Pressable>
          </FadeIn>

          {/* Divisor Editorial */}
          <FadeIn delay={70} style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text variant="label" color="textFaint" style={{ fontSize: 10 }}>
              {t.auth.orWithEmail}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </FadeIn>

          {/* Seletor Entrar / Criar Conta */}
          <FadeIn delay={90}>
            <View
              style={[
                styles.segmentedContainer,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}>
              <Pressable
                testID="tab-login"
                onPress={() => switchMode('login')}
                style={[
                  styles.segmentButton,
                  authMode === 'login' && {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderStrong,
                    borderWidth: 1,
                  },
                ]}>
                <Text
                  variant="bodyStrong"
                  style={{
                    color: authMode === 'login' ? colors.primary : colors.textMuted,
                  }}>
                  {t.auth.loginTab}
                </Text>
              </Pressable>

              <Pressable
                testID="tab-register"
                onPress={() => switchMode('register')}
                style={[
                  styles.segmentButton,
                  authMode === 'register' && {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderStrong,
                    borderWidth: 1,
                  },
                ]}>
                <Text
                  variant="bodyStrong"
                  style={{
                    color: authMode === 'register' ? colors.primary : colors.textMuted,
                  }}>
                  {t.auth.registerTab}
                </Text>
              </Pressable>
            </View>
          </FadeIn>

          {/* Formulário de E-mail e Senha */}
          <FadeIn delay={120}>
            <Card style={{ gap: spacing.lg }}>
              {authMode === 'register' && (
                <Field label={t.auth.yourNameLabel} error={errors.name}>
                  <TextField
                    testID="auth-name-input"
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                    }}
                    placeholder={t.auth.yourNamePlaceholder}
                    autoCapitalize="words"
                    maxLength={USER_NAME_MAX_LENGTH}
                    invalid={!!errors.name}
                  />
                </Field>
              )}

              <Field label={t.auth.emailLabel} error={errors.email}>
                <TextField
                  testID="auth-email-input"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                  }}
                  placeholder={t.auth.emailPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  invalid={!!errors.email}
                />
              </Field>

              <Field label={t.auth.passwordLabel} error={errors.password}>
                <View style={{ justifyContent: 'center' }}>
                  <TextField
                    testID="auth-password-input"
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                    }}
                    placeholder={
                      authMode === 'register'
                        ? t.auth.passwordRegisterPlaceholder
                        : t.auth.passwordLoginPlaceholder
                    }
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    invalid={!!errors.password}
                    style={{ paddingRight: 46 }}
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={10}
                    style={styles.eyeIconButton}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </Field>

              {authMode === 'register' && (
                <Field label={t.auth.confirmPasswordLabel} error={errors.confirmPassword}>
                  <TextField
                    testID="auth-confirm-password-input"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (errors.confirmPassword) {
                        setErrors((e) => ({ ...e, confirmPassword: undefined }));
                      }
                    }}
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    invalid={!!errors.confirmPassword}
                  />
                </Field>
              )}

              <Button
                testID="auth-submit-btn"
                label={authMode === 'login' ? t.auth.submitLogin : t.auth.submitRegister}
                icon={authMode === 'login' ? 'log-in-outline' : 'person-add-outline'}
                onPress={onSubmit}
                loading={submitting}
              />
            </Card>
          </FadeIn>

          {/* Rodapé alternador rápido */}
          <FadeIn delay={160} style={{ alignItems: 'center' }}>
            <Pressable
              onPress={() => switchMode(authMode === 'login' ? 'register' : 'login')}
              hitSlop={10}>
              <Text color="textMuted">
                {authMode === 'login' ? t.auth.noAccountPrompt : t.auth.hasAccountPrompt}
                <Text variant="bodyStrong" color="primary">
                  {authMode === 'login' ? t.auth.noAccountAction : t.auth.hasAccountAction}
                </Text>
              </Text>
            </Pressable>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Folha Nativa de Autenticação Social (Apple ID / Google) */}
      <Modal
        transparent
        visible={!!socialModalProvider}
        animationType="fade"
        onRequestClose={() => setSocialModalProvider(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.socialSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
              },
            ]}>
            <View style={styles.socialSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View
                  style={[
                    styles.providerBadge,
                    {
                      backgroundColor:
                        socialModalProvider === 'apple'
                          ? '#1E1916'
                          : colors.surfaceRaised,
                    },
                  ]}>
                  <Ionicons
                    name={socialModalProvider === 'apple' ? 'logo-apple' : 'logo-google'}
                    size={20}
                    color={socialModalProvider === 'apple' ? '#FFFFFF' : '#DB4437'}
                  />
                </View>
                <View>
                  <Text variant="heading">
                    {socialModalProvider === 'apple'
                      ? t.auth.appleSheetTitle
                      : t.auth.googleSheetTitle}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {socialModalProvider === 'apple'
                      ? t.auth.appleSheetSubtitle
                      : t.auth.googleSheetSubtitle}
                  </Text>
                </View>
              </View>
            </View>

            <Field label={t.auth.accountNameField}>
              <TextField
                testID="social-name-input"
                value={socialName}
                onChangeText={setSocialName}
                placeholder={t.auth.yourNameLabel}
              />
            </Field>

            <Field
              label={
                socialModalProvider === 'apple'
                  ? t.auth.appleEmailField
                  : t.auth.googleEmailField
              }
              error={socialError ?? undefined}>
              <TextField
                testID="social-email-input"
                value={socialEmail}
                onChangeText={setSocialEmail}
                placeholder={
                  socialModalProvider === 'apple' ? 'seu@icloud.com' : 'seu@gmail.com'
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                invalid={!!socialError}
              />
            </Field>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
              <Button
                label={t.common.cancel}
                variant="secondary"
                onPress={() => setSocialModalProvider(null)}
                style={{ flex: 1 }}
              />
              <Button
                testID="social-confirm-btn"
                label={t.common.continue}
                icon={socialModalProvider === 'apple' ? 'scan-outline' : 'checkmark-circle-outline'}
                loading={socialLoading}
                onPress={handleConfirmSocialSheet}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
    </ForcedThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langPillGroup: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    gap: 2,
  },
  langPillItem: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  socialButton: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  eyeIconButton: {
    position: 'absolute',
    right: 14,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  socialSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  socialSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
