import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { canModifyCategory, type Category } from '@/domains/categories/category';
import { useI18n } from '@/shared/i18n';
import { useWallet } from '@/store/wallet-store';
import { Button, Card, ConfirmDialog, FadeIn, IconBadge, Screen } from '@/ui/components';
import { Text } from '@/ui/text';
import { radius, spacing, useTheme } from '@/ui/theme';

/**
 * Gerenciar categorias — US-011 (criar), US-024 (editar/arquivar) e RN-09 (padrão protegidas).
 */
export default function CategoriesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, tCategory } = useI18n();

  const categories = useWallet((s) => s.categories);
  const removeCategory = useWallet((s) => s.removeCategory);

  const [toRemove, setToRemove] = useState<Category | null>(null);

  const active = categories.filter((c) => c.archivedAt === null);
  const custom = active.filter((c) => canModifyCategory(c));
  const defaults = active.filter((c) => !canModifyCategory(c));

  async function confirmRemove() {
    if (!toRemove) return;
    const id = toRemove.id;
    setToRemove(null);
    await removeCategory(id);
  }

  const typeLabel = (c: Category) =>
    c.type === 'expense' ? t.transactions.expense : t.transactions.income;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 }}>
        <FadeIn>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title">{t.categories.title}</Text>
            <Pressable onPress={() => router.back()} hitSlop={12} testID="close-categories">
              <Text color="textMuted">{t.common.close}</Text>
            </Pressable>
          </View>
          <Text color="textMuted">{t.categories.subtitle}</Text>
        </FadeIn>

        <Button
          testID="add-category"
          label={t.categories.newCategory}
          icon="add"
          onPress={() => router.push('/category-form')}
        />

        {/* PERSONALIZADAS (editáveis) */}
        <FadeIn delay={60} style={{ gap: spacing.md }}>
          <Text variant="label" color="textMuted">
            {t.categories.customSection}
          </Text>

          {custom.length === 0 ? (
            <Card variant="inset">
              <Text color="textMuted">{t.categories.emptyCustom}</Text>
            </Card>
          ) : (
            custom.map((c) => (
              <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconBadge icon={c.icon as never} color={c.color} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {typeLabel(c)}
                  </Text>
                </View>
                <Pressable
                  testID={`edit-category-${c.name}`}
                  accessibilityLabel={t.categories.edit}
                  onPress={() => router.push({ pathname: '/category-form', params: { id: c.id } })}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: radius.sm,
                    backgroundColor: colors.surfaceRaised,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Ionicons name="pencil" size={15} color={colors.text} />
                </Pressable>
                <Pressable
                  testID={`remove-category-${c.name}`}
                  accessibilityLabel={t.categories.removeTitle(c.name)}
                  onPress={() => setToRemove(c)}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: radius.sm,
                    backgroundColor: colors.expenseSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Ionicons name="trash-outline" size={16} color={colors.expense} />
                </Pressable>
              </Card>
            ))
          )}
        </FadeIn>

        {/* PADRÃO (somente leitura — RN-09) */}
        <FadeIn delay={120} style={{ gap: spacing.md }}>
          <Text variant="label" color="textMuted">
            {t.categories.defaultSection}
          </Text>
          <Card style={{ gap: spacing.sm }}>
            {defaults.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconBadge icon={c.icon as never} color={c.color} size={34} />
                <Text style={{ flex: 1 }} numberOfLines={1}>
                  {tCategory(c.id, c.name)}
                </Text>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textFaint} />
              </View>
            ))}
          </Card>
        </FadeIn>
      </ScrollView>

      <ConfirmDialog
        visible={!!toRemove}
        title={t.categories.removeTitle(toRemove?.name ?? '')}
        message={t.categories.removeMessage}
        confirmLabel={t.categories.removeConfirm}
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      />
    </Screen>
  );
}
