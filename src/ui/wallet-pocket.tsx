import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import type { AccountWithBalance } from '@/domains/accounts/account';
import { useI18n } from '@/shared/i18n';
import type { Money } from '@/shared/money';
import { useWallet } from '@/store/wallet-store';
import { Text } from '@/ui/text';
import { radius, spacing, usePrivacy, useTheme } from '@/ui/theme';

interface WalletPocketProps {
  consolidated: Money;
  income: Money;
  expense: Money;
  accounts: AccountWithBalance[];
}

/**
 * Desalinhamento orgânico suave:
 * Calibrado com precisão para dar autenticidade humana sem cortar nenhuma quina.
 */
const CARD_VARIATIONS = [
  { rot: '-1.4deg', y: -2 },
  { rot: '1.2deg', y: 1 },
  { rot: '-0.8deg', y: -1 },
  { rot: '1.3deg', y: 1 },
  { rot: '-1.0deg', y: 0 },
];

/**
 * Largura adaptativa dos cartões:
 * - 1 ou 2 cartões: cartões mais largos (134px)
 * - 3 cartões: 99px (exatamente os 3 bancos cabem juntos na tela da carteira sem nenhum corte!)
 * - 4 ou mais: 104px (3 visíveis confortavelmente + 4º espiando para convidar ao swipe)
 */
function getCardWidth(totalAccounts: number): number {
  if (totalAccounts <= 2) return 134;
  if (totalAccounts === 3) return 99;
  return 104;
}

export const MASKED_BALANCE = 'R$ ****';

/**
 * The Folio Wallet Pocket:
 * Carteira de couro artesanal com controle de privacidade Inline Limpo
 * posicionado ao lado do Saldo Consolidado (Lei da Proximidade & Ergonomia Fintech).
 */
export function WalletPocket({
  consolidated,
  income,
  expense,
  accounts,
}: WalletPocketProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const { isBalanceHidden } = usePrivacy();
  const { t } = useI18n();
  const toggleBalanceHidden = useWallet((s) => s.toggleBalanceHidden);
  const cardWidth = getCardWidth(accounts.length);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.leatherMainShell,
          isDark && { borderColor: 'rgba(212, 123, 74, 0.35)' },
        ]}>
        <View style={styles.leatherBacking}>
          <Image
            source={require('@/assets/textures/leather.jpg')}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, styles.leatherImage]}
          />
          <View style={styles.leatherDarkOverlay} />

          {/* 1. CÂMARA DOS CARTÕES */}
          <View style={styles.chamberWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cardsScrollView}
              contentContainerStyle={styles.cardsScrollContent}>
              {accounts.map((acc, index) => {
                const { rot, y } = CARD_VARIATIONS[index % CARD_VARIATIONS.length];

                return (
                  <View
                    key={acc.id}
                    style={[
                      styles.cardRotator,
                      {
                        zIndex: index + 1,
                        transform: [{ translateY: y }, { rotate: rot }],
                      },
                    ]}>
                    <Pressable
                      onPress={() => router.push('/(tabs)/accounts')}
                      style={({ pressed }) => [
                        styles.cardItem,
                        {
                          width: cardWidth,
                          backgroundColor: acc.color,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        },
                      ]}>
                      <View style={styles.cardSheen} />

                      <View style={styles.cardHeaderRow}>
                        <Text
                          variant="caption"
                          style={styles.cardName}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}>
                          {acc.name}
                        </Text>
                        <View style={styles.cardChip}>
                          <View style={styles.cardChipCore} />
                        </View>
                      </View>

                      <View style={styles.cardBalanceBox}>
                        <Text style={styles.cardBalanceLabel}>{t.wallet.cardBalance}</Text>
                        <Text
                          style={styles.cardBalanceValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}>
                          {isBalanceHidden ? MASKED_BALANCE : acc.balance.format()}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}

              {/* Slot para adicionar nova conta bancária */}
              <View style={styles.cardRotator}>
                <Pressable
                  onPress={() => router.push('/account-form')}
                  style={({ pressed }) => [
                    styles.addCardSlot,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}>
                  <Ionicons name="add-circle-outline" size={16} color="#E4D5C7" />
                  <Text style={styles.addCardText}>{t.wallet.newAccountSlot}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* 2. LAPELA FRONTAL DE COURO */}
          <View style={styles.frontPocketFlap}>
            <View style={styles.frontPocketContent}>
              <Image
                source={require('@/assets/textures/leather.jpg')}
                resizeMode="cover"
                style={[StyleSheet.absoluteFill, styles.frontFlapImage]}
              />
              <View style={styles.frontLeatherOverlay} />
              <View style={styles.stitchLine} />

              {/* Cabeçalho limpo com gravação da marca */}
              <View style={styles.walletHeader}>
                <View style={styles.brandEmboss}>
                  <Ionicons name="wallet-outline" size={13} color="#E4D5C7" />
                  <Text style={styles.brandEmbossText}>SMART WALLET</Text>
                </View>
              </View>

              {/* Saldo Consolidado + Botão Circular Inline Limpo */}
              <View style={styles.balanceArea}>
                <Text style={styles.balancePrefix}>{t.wallet.consolidatedBalance}</Text>

                <View style={styles.balanceValueRow}>
                  <Pressable onPress={toggleBalanceHidden} style={{ flexShrink: 1 }}>
                    <Text
                      variant="display"
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      style={[
                        styles.balanceText,
                        isBalanceHidden && { letterSpacing: 2 },
                      ]}>
                      {isBalanceHidden ? MASKED_BALANCE : consolidated.format()}
                    </Text>
                  </Pressable>

                  <Pressable
                    testID="toggle-privacy-btn"
                    onPress={toggleBalanceHidden}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isBalanceHidden ? t.wallet.showValues : t.wallet.hideValues
                    }
                    style={({ pressed }) => [
                      styles.inlineEyeCircleBtn,
                      pressed && {
                        backgroundColor: 'rgba(255, 255, 255, 0.24)',
                        transform: [{ scale: 0.92 }],
                      },
                    ]}>
                    <Ionicons
                      name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color="#FFFDFC"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Entradas e Saídas do Mês */}
              <View style={styles.walletFooter}>
                <View style={styles.footerCol}>
                  <Text style={styles.footerLabel}>{t.wallet.monthlyIncome}</Text>
                  <Text style={styles.footerValueIncome}>
                    {isBalanceHidden ? `+${MASKED_BALANCE}` : `+${income.format()}`}
                  </Text>
                </View>

                <View style={styles.footerDivider} />

                <View style={styles.footerCol}>
                  <Text style={styles.footerLabel}>{t.wallet.monthlyExpense}</Text>
                  <Text style={styles.footerValueExpense}>
                    {isBalanceHidden ? `-${MASKED_BALANCE}` : `-${expense.format()}`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    backgroundColor: '#241208',
    ...Platform.select({
      ios: {
        shadowColor: '#180B04',
        shadowOpacity: 0.26,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  leatherMainShell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4A2814',
    backgroundColor: '#241208',
  },
  leatherBacking: {
    paddingTop: 12,
    overflow: 'hidden',
    backgroundColor: '#1E0E06',
  },
  leatherImage: {
    width: '100%',
    height: '100%',
  },
  leatherDarkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 12, 5, 0.45)',
  },
  chamberWrapper: {
    zIndex: 1,
    height: 110,
    paddingTop: 8,
  },
  cardsScrollView: {
    height: 102,
  },
  cardsScrollContent: {
    paddingHorizontal: 14,
    gap: 9,
    alignItems: 'flex-start',
    paddingTop: 4,
    paddingBottom: 0,
  },
  cardRotator: {},
  cardItem: {
    height: 96,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingTop: 8,
    gap: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    flex: 1,
    marginRight: 4,
  },
  cardChip: {
    width: 11,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#E5C667',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardChipCore: {
    width: 5,
    height: 1,
    backgroundColor: '#826214',
  },
  cardBalanceBox: {
    marginTop: 2,
    gap: 1,
  },
  cardBalanceLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardBalanceValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  addCardSlot: {
    width: 82,
    height: 96,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(228, 213, 199, 0.38)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(38, 18, 8, 0.55)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    gap: 4,
  },
  addCardText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E4D5C7',
    textAlign: 'center',
  },
  frontPocketFlap: {
    zIndex: 50,
    marginTop: -46,
    borderTopWidth: 2,
    borderTopColor: '#361B0B',
    backgroundColor: '#261208',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  frontFlapImage: {
    width: '100%',
    height: '100%',
  },
  frontPocketContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    backgroundColor: '#261208',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  frontLeatherOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(38, 18, 8, 0.34)',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  stitchLine: {
    position: 'absolute',
    top: 7,
    left: 14,
    right: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 226, 213, 0.35)',
    borderStyle: 'dashed',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    zIndex: 2,
  },
  brandEmboss: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandEmbossText: {
    color: '#EFE3D5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  balanceArea: {
    gap: 2,
    paddingVertical: spacing.xs,
    zIndex: 2,
  },
  balancePrefix: {
    color: 'rgba(239, 227, 213, 0.75)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  balanceText: {
    color: '#FFFDFC',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  inlineEyeCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 227, 213, 0.18)',
    paddingTop: spacing.md,
    zIndex: 2,
  },
  footerCol: {
    flex: 1,
    gap: 2,
  },
  footerLabel: {
    color: 'rgba(239, 227, 213, 0.7)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerValueIncome: {
    color: '#84E4B3',
    fontSize: 14,
    fontWeight: '700',
  },
  footerValueExpense: {
    color: '#FFA89E',
    fontSize: 14,
    fontWeight: '700',
  },
  footerDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(239, 227, 213, 0.18)',
    marginHorizontal: spacing.md,
  },
});
