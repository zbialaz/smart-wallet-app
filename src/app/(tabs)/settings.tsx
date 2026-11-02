import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { USER_NAME_MAX_LENGTH } from '@/domains/auth/user';
import { LANGUAGE_OPTIONS, useI18n } from '@/shared/i18n';
import { useConsolidatedBalance } from '@/store/selectors';
import { useWallet } from '@/store/wallet-store';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  FadeIn,
  Field,
  IconBadge,
  Screen,
  TextField,
} from '@/ui/components';
import { Text } from '@/ui/text';
import { radius, spacing, usePrivacy, useTheme, type ThemeMode } from '@/ui/theme';
import { MASKED_BALANCE } from '@/ui/wallet-pocket';

/**
 * Aba de Configurações:
 * Centraliza Perfil do Usuário, Idioma (PT / EN / ES), Aparência (Modo Claro / Noturno / Sistema),
 * Privacidade (Ocultar Saldos), Atalhos de Contas, Sign Out e Exclusão de Conta.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, isDark } = useTheme();
  const { isBalanceHidden } = usePrivacy();
  const { language, t } = useI18n();

  const currentUser = useWallet((s) => s.currentUser);
  const accounts = useWallet((s) => s.accounts);
  const categories = useWallet((s) => s.categories);
  const setThemeMode = useWallet((s) => s.setThemeMode);
  const setLanguage = useWallet((s) => s.setLanguage);
  const toggleBalanceHidden = useWallet((s) => s.toggleBalanceHidden);
  const updateUserName = useWallet((s) => s.updateUserName);
  const signOut = useWallet((s) => s.signOut);
  const deleteUserAccount = useWallet((s) => s.deleteUserAccount);
  const consolidated = useConsolidatedBalance();

  const themeOptions: {
    mode: ThemeMode;
    label: string;
    description: string;
    icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline';
  }[] = [
    {
      mode: 'system',
      label: t.common.system,
      description: t.settings.themeSystemDesc,
      icon: 'phone-portrait-outline',
    },
    {
      mode: 'light',
      label: t.common.light,
      description: t.settings.themeLightDesc,
      icon: 'sunny-outline',
    },
    {
      mode: 'dark',
      label: t.common.dark,
      description: t.settings.themeDarkDesc,
      icon: 'moon-outline',
    },
  ];

  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);

  async function handleSaveName() {
    setSavingName(true);
    setNameError(null);
    const res = await updateUserName(nameInput);
    setSavingName(false);
    if (!res.ok) {
      setNameError(res.error);
      return;
    }
    setEditingProfile(false);
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/auth');
  }

  async function handleConfirmDeleteUser() {
    setConfirmDeleteUser(false);
    await deleteUserAccount();
    router.replace('/auth');
  }

  const initials = (currentUser?.name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <FadeIn>
          <Text variant="title">{t.settings.title}</Text>
          <Text color="textMuted">{t.settings.subtitle}</Text>
        </FadeIn>

        {/* 1. PERFIL E CONTA DO USUÁRIO */}
        {currentUser && (
          <FadeIn delay={50}>
            <Card style={{ gap: spacing.lg }}>
              <View style={styles.profileHeader}>
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}>
                  <Text
                    variant="heading"
                    style={{ color: colors.primary, fontWeight: '800' }}>
                    {initials}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label" color="textMuted">
                    {t.settings.connectedProfile}
                  </Text>
                  <Text variant="heading" numberOfLines={1}>
                    {currentUser.name}
                  </Text>
                  <Text variant="caption" color="textMuted" numberOfLines={1}>
                    {currentUser.email}
                  </Text>
                </View>

                <Pressable
                  testID="edit-profile-btn"
                  onPress={() => {
                    setNameInput(currentUser.name);
                    setNameError(null);
                    setEditingProfile((v) => !v);
                  }}
                  hitSlop={10}
                  style={[
                    styles.iconPillBtn,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.border,
                    },
                  ]}>
                  <Ionicons
                    name={editingProfile ? 'close' : 'pencil'}
                    size={15}
                    color={colors.text}
                  />
                </Pressable>
              </View>

              {editingProfile && (
                <View style={{ gap: spacing.md, paddingTop: spacing.xs }}>
                  <Field label={t.settings.changeNameLabel} error={nameError ?? undefined}>
                    <TextField
                      testID="profile-name-input"
                      value={nameInput}
                      onChangeText={setNameInput}
                      maxLength={USER_NAME_MAX_LENGTH}
                      placeholder={t.settings.yourNamePlaceholder}
                      invalid={!!nameError}
                    />
                  </Field>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Button
                      label={t.common.cancel}
                      variant="secondary"
                      onPress={() => setEditingProfile(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      testID="save-profile-name-btn"
                      label={t.common.save}
                      loading={savingName}
                      onPress={handleSaveName}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </Card>
          </FadeIn>
        )}

        {/* 2. IDIOMA DO APLICATIVO (PT / EN / ES) */}
        <FadeIn delay={75}>
          <Card style={{ gap: spacing.md }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <IconBadge icon="language-outline" color={colors.primary} size={38} />
                <View>
                  <Text variant="bodyStrong">{t.settings.languageTitle}</Text>
                  <Text variant="caption" color="textMuted">
                    {t.settings.languageSubtitle}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.themeGrid}>
              {LANGUAGE_OPTIONS.map((opt) => {
                const selected = language === opt.code;
                return (
                  <Pressable
                    key={opt.code}
                    testID={`lang-option-${opt.code}`}
                    onPress={() => setLanguage(opt.code)}
                    style={({ pressed }) => [
                      styles.themeCard,
                      {
                        backgroundColor: selected
                          ? colors.primarySoft
                          : colors.surfaceRaised,
                        borderColor: selected ? colors.primary : colors.border,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}>
                    <Text style={{ fontSize: 18 }}>{opt.flag}</Text>
                    <Text
                      variant="bodyStrong"
                      style={{
                        fontSize: 13,
                        color: selected ? colors.primary : colors.text,
                      }}>
                      {opt.label}
                    </Text>
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 10.5,
                        color: colors.textMuted,
                        textAlign: 'center',
                      }}>
                      {opt.code.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </FadeIn>

        {/* 3. APARÊNCIA: MODO CLARO / NOTURNO / SISTEMA */}
        <FadeIn delay={90}>
          <Card style={{ gap: spacing.md }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <IconBadge
                  icon={isDark ? 'moon' : 'sunny'}
                  color={colors.primary}
                  size={38}
                />
                <View>
                  <Text variant="bodyStrong">{t.settings.appearanceTitle}</Text>
                  <Text variant="caption" color="textMuted">
                    {isDark ? t.settings.darkModeActive : t.settings.lightModeActive}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.themeGrid}>
              {themeOptions.map((opt) => {
                const selected = mode === opt.mode;
                return (
                  <Pressable
                    key={opt.mode}
                    testID={`theme-option-${opt.mode}`}
                    onPress={() => setThemeMode(opt.mode)}
                    style={({ pressed }) => [
                      styles.themeCard,
                      {
                        backgroundColor: selected
                          ? colors.primarySoft
                          : colors.surfaceRaised,
                        borderColor: selected ? colors.primary : colors.border,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}>
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={selected ? colors.primary : colors.textMuted}
                    />
                    <Text
                      variant="bodyStrong"
                      style={{
                        fontSize: 13,
                        color: selected ? colors.primary : colors.text,
                      }}>
                      {opt.label}
                    </Text>
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 10.5,
                        color: colors.textMuted,
                        textAlign: 'center',
                      }}>
                      {opt.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </FadeIn>

        {/* 4. PRIVACIDADE DOS VALORES */}
        <FadeIn delay={130}>
          <Card style={{ gap: spacing.md }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                <IconBadge
                  icon={isBalanceHidden ? 'eye-off' : 'eye'}
                  color={colors.primary}
                  size={38}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{t.settings.hideBalancesTitle}</Text>
                  <Text variant="caption" color="textMuted">
                    {t.settings.hideBalancesDesc(MASKED_BALANCE)}
                  </Text>
                </View>
              </View>

              <Chip
                label={isBalanceHidden ? t.settings.hiddenChip : t.settings.visibleChip}
                icon={isBalanceHidden ? 'eye-off' : 'eye'}
                selected={isBalanceHidden}
                onPress={toggleBalanceHidden}
              />
            </View>
          </Card>
        </FadeIn>

        {/* 5. RESUMO DA CARTEIRA E ATALHOS */}
        <FadeIn delay={170}>
          <Card style={{ gap: spacing.md }}>
            <Text variant="label" color="textMuted">
              {t.settings.walletSummarySection}
            </Text>

            <Pressable
              onPress={() => router.navigate('/(tabs)/accounts')}
              style={({ pressed }) => [
                styles.shortcutRow,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                <View>
                  <Text variant="bodyStrong">
                    {t.settings.bankAccountsCount(accounts.length)}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {t.accounts.consolidatedPrefix}{' '}
                    {isBalanceHidden ? MASKED_BALANCE : consolidated.format()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <View
              style={[
                styles.shortcutRow,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                },
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
                <View>
                  <Text variant="bodyStrong">
                    {t.settings.activeCategoriesCount(categories.length)}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {t.settings.activeCategoriesDesc}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </FadeIn>

        {/* 6. SESSÃO E EXCLUSÃO DE CONTA */}
        <FadeIn delay={210}>
          <Card style={{ gap: spacing.md }}>
            <Text variant="label" color="textMuted">
              {t.settings.sessionSection}
            </Text>

            <Button
              testID="sign-out-btn"
              label={t.settings.signOutBtn}
              variant="secondary"
              icon="log-out-outline"
              onPress={handleSignOut}
            />

            <Button
              testID="delete-user-account-btn"
              label={t.settings.deleteAccountBtn}
              variant="danger"
              icon="trash-outline"
              onPress={() => setConfirmDeleteUser(true)}
            />
          </Card>
        </FadeIn>
      </ScrollView>

      {/* Modal de confirmação para excluir a conta de usuário */}
      <ConfirmDialog
        visible={confirmDeleteUser}
        title={t.settings.deleteAccountConfirmTitle}
        message={t.settings.deleteAccountConfirmMessage}
        confirmLabel={t.settings.deleteAccountConfirmBtn}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setConfirmDeleteUser(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 90,
    gap: spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 4,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});

