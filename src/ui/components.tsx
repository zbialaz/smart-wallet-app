import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Money } from '@/shared/money';

import { Text } from './text';
import { colors, radius, spacing } from './theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Fundo padrão de toda tela com padding e respeitando safe area. */
export function Screen({
  children,
  edges = ['top'],
  style,
}: {
  children: React.ReactNode;
  edges?: ('top' | 'bottom')[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Card com toque artesanal: elevação suave quente, borda fina e cantos aveludados. */
export function Card({
  children,
  style,
  variant = 'default',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'inset' | 'accent';
}) {
  const cardStyle = variant === 'inset' ? styles.cardInset : styles.card;
  return <View style={[cardStyle, style]}>{children}</View>;
}

/** Botão com toque tátil, tipografia sólida e leve sombra cálida. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const bg = {
    primary: colors.primary,
    secondary: colors.surfaceRaised,
    danger: colors.expenseSoft,
  }[variant];
  const fg = variant === 'danger' ? colors.expense : variant === 'secondary' ? colors.text : colors.white;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' && styles.buttonPrimaryShadow,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text variant="bodyStrong" style={{ color: fg, letterSpacing: 0.2 }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Botão flutuante refinado (+ nova transação) com acabamento squircle editorial. */
export function Fab({ onPress, testID }: { onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { transform: [{ scale: pressed ? 0.93 : 1 }] },
      ]}>
      <LinearGradient
        colors={['#C46E40', '#9E4E25']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}>
        <Ionicons name="add" size={28} color={colors.white} />
      </LinearGradient>
    </Pressable>
  );
}

/** Chip com toque linho/orgânico. */
export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && {
          backgroundColor: color + '1A',
          borderColor: color,
        },
        pressed && { opacity: 0.75 },
      ]}>
      {icon && <Ionicons name={icon} size={15} color={selected ? color : colors.textMuted} />}
      <Text
        variant="caption"
        style={{
          color: selected ? colors.text : colors.textMuted,
          fontWeight: selected ? '700' : '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Ícone em cápsula quadrada suave (Squircle) em vez de círculo comum. */
export function IconBadge({
  icon,
  color,
  size = 44,
}: {
  icon: IconName;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.35, // Formato squircle moderno
        backgroundColor: color + '18',
        borderWidth: 1,
        borderColor: color + '26',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

/** Rótulo + campo + mensagem de erro. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      {children}
      {error ? (
        <Text variant="caption" color="expense" style={{ fontWeight: '600' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField(props: TextInputProps & { invalid?: boolean }) {
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...rest}
      style={[styles.input, invalid && { borderColor: colors.expense }, style]}
    />
  );
}

/**
 * Campo de valor nobre: visual imponente de caderneta de despesas.
 */
export function AmountInput({
  value,
  onChange,
  accent,
  autoFocus,
  invalid,
}: {
  value: Money;
  onChange: (m: Money) => void;
  accent: string;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  return (
    <View style={[styles.amountBox, invalid && { borderColor: colors.expense }]}>
      <Text variant="heading" style={{ color: accent, opacity: 0.85, fontWeight: '800' }}>
        R$
      </Text>
      <TextInput
        testID="amount-input"
        value={value.isZero() ? '' : value.toInputString()}
        onChangeText={(t) => onChange(Money.fromDigitInput(t))}
        placeholder="0,00"
        placeholderTextColor={colors.textFaint}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        style={[styles.amountText, { color: accent }]}
      />
    </View>
  );
}

/** Modal de confirmação editorial. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text variant="heading">{title}</Text>
          <Text color="textMuted" style={{ lineHeight: 20 }}>
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
            <Button label="Cancelar" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button
              label={confirmLabel}
              variant="danger"
              onPress={onConfirm}
              style={{ flex: 1 }}
              testID="confirm-yes"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <IconBadge icon={icon} color={colors.primary} size={56} />
      <Text variant="heading">{title}</Text>
      <Text color="textMuted" style={{ textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
        {message}
      </Text>
      {action}
    </View>
  );
}

/** Entrada suave. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    // Sombra suave difusa com tom quente
    ...Platform.select({
      ios: {
        shadowColor: '#362419',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  cardInset: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonPrimaryShadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl + 4,
    width: 58,
    height: 58,
    borderRadius: 20, // Squircle elegante
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6B3113',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
  },
  amountText: {
    flex: 1,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    padding: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.xxl,
  },
});
