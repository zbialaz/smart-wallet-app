import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import type { AccountWithBalance } from '@/domains/accounts/account';
import type { Money } from '@/shared/money';
import { Text } from '@/ui/text';
import { radius, spacing } from '@/ui/theme';

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

/**
 * The Folio Wallet Pocket (Cartões 100% Íntegros e Visíveis com Toque Orgânico)
 */
export function WalletPocket({
  consolidated,
  income,
  expense,
  accounts,
}: WalletPocketProps) {
  const router = useRouter();
  const cardWidth = getCardWidth(accounts.length);

  return (
    <View style={styles.container}>
      <View style={styles.leatherMainShell}>
        <ImageBackground
          source={require('@/assets/textures/leather.jpg')}
          resizeMode="cover"
          imageStyle={styles.leatherImage}
          style={styles.leatherBacking}>
          
          <View style={styles.leatherDarkOverlay} />

          {/* 
            1. CÂMARA DOS CARTÕES (Com respiro e profundidade)
            Os cartões mergulham 38px dentro do bolso e ficam 100% visíveis, sem cortes!
          */}
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
                        transform: [
                          { translateY: y },
                          { rotate: rot },
                        ],
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
                      {/* Brilho laminado suave */}
                      <View style={styles.cardSheen} />

                      {/* Cabeçalho do Cartão: Banco + Microchip */}
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

                      {/* Saldo da Conta: Totalmente visível com folga generosa */}
                      <View style={styles.cardBalanceBox}>
                        <Text style={styles.cardBalanceLabel}>SALDO</Text>
                        <Text
                          style={styles.cardBalanceValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}>
                          {acc.balance.format()}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}

              {/* Botão de adicionar nova conta (slot vago na carteira) */}
              <View style={styles.cardRotator}>
                <Pressable
                  onPress={() => router.push('/account-form')}
                  style={({ pressed }) => [
                    styles.addCardSlot,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}>
                  <Ionicons name="add-circle-outline" size={16} color="#E4D5C7" />
                  <Text style={styles.addCardText}>Nova conta</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* 
            2. A LAPELA FRONTAL DE COURO (Boca do Bolso)
            Sobrepõe os 38px inferiores dos cartões com sombra realista de profundidade.
          */}
          <View style={styles.frontPocketFlap}>
            <ImageBackground
              source={require('@/assets/textures/leather.jpg')}
              resizeMode="cover"
              imageStyle={styles.frontFlapImage}
              style={styles.frontPocketContent}>
              
              <View style={styles.frontLeatherOverlay} />
              <View style={styles.stitchLine} />

              {/* Cabeçalho da Carteira */}
              <View style={styles.walletHeader}>
                <View style={styles.brandEmboss}>
                  <Ionicons name="wallet-outline" size={13} color="#E4D5C7" />
                  <Text style={styles.brandEmbossText}>SMART WALLET</Text>
                </View>

                {/* Fecho de pressão em latão */}
                <View style={styles.snapButtonOuter}>
                  <View style={styles.snapButtonBevel}>
                    <View style={styles.snapButtonCore}>
                      <View style={styles.snapButtonCenterPin} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Saldo Consolidado */}
              <View style={styles.balanceArea}>
                <Text style={styles.balancePrefix}>SALDO CONSOLIDADO</Text>
                <Text
                  variant="display"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={styles.balanceText}>
                  {consolidated.format()}
                </Text>
              </View>

              {/* Entradas e Saídas do Mês */}
              <View style={styles.walletFooter}>
                <View style={styles.footerCol}>
                  <Text style={styles.footerLabel}>ENTRADAS DO MÊS</Text>
                  <Text style={styles.footerValueIncome}>+{income.format()}</Text>
                </View>

                <View style={styles.footerDivider} />

                <View style={styles.footerCol}>
                  <Text style={styles.footerLabel}>SAÍDAS DO MÊS</Text>
                  <Text style={styles.footerValueExpense}>-{expense.format()}</Text>
                </View>
              </View>
            </ImageBackground>
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  leatherMainShell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4A2814',
    ...Platform.select({
      ios: {
        shadowColor: '#180B04',
        shadowOpacity: 0.38,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  leatherBacking: {
    paddingTop: 12,
  },
  leatherImage: {
    borderRadius: radius.xl,
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
  cardRotator: {
    // Permite sombra e rotação sem colidir com overflow
  },
  cardItem: {
    height: 96, // Altura que permite 34px entrarem no bolso e 62px ficarem visíveis
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingTop: 8,
    gap: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.28,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: -2 },
      },
      android: { elevation: 4 },
      default: {},
    }),
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: -3 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  frontFlapImage: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  frontPocketContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
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
  snapButtonOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7A5528',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4A3212',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  snapButtonBevel: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#D1A362',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8A6028',
  },
  snapButtonCore: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#4D3212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapButtonCenterPin: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#E5BC78',
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
  balanceText: {
    color: '#FFFDFC',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
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
