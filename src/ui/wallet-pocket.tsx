import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import type { AccountWithBalance } from '@/domains/accounts/account';
import type { Money } from '@/shared/money';
import { useWallet } from '@/store/wallet-store';
import { Text } from '@/ui/text';
import { radius, spacing, usePrivacy, useTheme, type PrivacyMode } from '@/ui/theme';

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
 * The Folio Wallet Pocket
 * Suporta dois modos de privacidade para teste:
 * 1. 'asterisks'   -> Substitui todos os saldos por asteriscos (R$ ****) mantendo a carteira aberta.
 * 2. 'wallet-flap' -> Animação realista com física de molas (spring physics) em que os cartões
 *                     mergulham no bolso, a aba superior de couro dobra em perspectiva 3D e trava
 *                     no fecho de pressão em latão com impacto tátil.
 */
export function WalletPocket({
  consolidated,
  income,
  expense,
  accounts,
}: WalletPocketProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isBalanceHidden, privacyMode } = usePrivacy();
  const toggleBalanceHidden = useWallet((s) => s.toggleBalanceHidden);
  const setPrivacyMode = useWallet((s) => s.setPrivacyMode);

  const cardWidth = getCardWidth(accounts.length);

  // Estados derivados dos dois modos de ocultação
  const isAsteriskMask = isBalanceHidden && privacyMode === 'asterisks';
  const isWalletClosed = isBalanceHidden && privacyMode === 'wallet-flap';

  // Valores animados para física realista da carteira
  const cardsTuckAnim = useRef(new Animated.Value(isWalletClosed ? 1 : 0)).current;
  const flapFoldAnim = useRef(new Animated.Value(isWalletClosed ? 1 : 0)).current;
  const walletImpactAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWalletClosed) {
      // FECHANDO A CARTEIRA:
      // 1) Cartões deslizam para o fundo do bolso de couro
      // 2) Aba superior de couro dobra por cima com inércia e trava no botão de latão
      // 3) Impacto físico ("click/thud") no corpo da carteira quando o fecho trava
      Animated.parallel([
        Animated.spring(cardsTuckAnim, {
          toValue: 1,
          stiffness: 190,
          damping: 17,
          mass: 0.85,
          useNativeDriver: false,
        }),
        Animated.spring(flapFoldAnim, {
          toValue: 1,
          stiffness: 160,
          damping: 13,
          mass: 1.15,
          delay: 40,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(165),
          Animated.timing(walletImpactAnim, {
            toValue: 1,
            duration: 70,
            useNativeDriver: false,
          }),
          Animated.spring(walletImpactAnim, {
            toValue: 0,
            stiffness: 340,
            damping: 11,
            mass: 0.6,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    } else {
      // ABRINDO A CARTEIRA:
      // 1) Pequeno impulso ao destravar o botão de latão
      // 2) Aba superior de couro levanta rapidamente
      // 3) Cartões saltam de volta para fora com elasticidade orgânica
      Animated.parallel([
        Animated.sequence([
          Animated.timing(walletImpactAnim, {
            toValue: -0.6,
            duration: 60,
            useNativeDriver: false,
          }),
          Animated.spring(walletImpactAnim, {
            toValue: 0,
            stiffness: 280,
            damping: 12,
            mass: 0.6,
            useNativeDriver: false,
          }),
        ]),
        Animated.spring(flapFoldAnim, {
          toValue: 0,
          stiffness: 185,
          damping: 16,
          mass: 0.9,
          useNativeDriver: false,
        }),
        Animated.spring(cardsTuckAnim, {
          toValue: 0,
          stiffness: 145,
          damping: 12,
          mass: 0.85,
          delay: 85,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isWalletClosed, cardsTuckAnim, flapFoldAnim, walletImpactAnim]);

  // Interpolações físicas
  const chamberHeight = cardsTuckAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [110, 30],
    extrapolate: 'clamp',
  });

  const cardsTranslateY = cardsTuckAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 78],
  });

  const cardsScale = cardsTuckAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.93],
  });

  const cardsOpacity = cardsTuckAnim.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Aba superior de couro dobrando de cima para baixo com perspectiva 3D
  const topFlapTranslateY = flapFoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-130, 0],
  });

  const topFlapRotateX = flapFoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-75deg', '0deg'],
  });

  const topFlapOpacity = flapFoldAnim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  // Interior do bolso (Saldo Consolidado e Rodapé) recolhendo ao fechar a carteira
  const openBodyMaxHeight = flapFoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [160, 0],
    extrapolate: 'clamp',
  });

  const openBodyOpacity = flapFoldAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  const closedBadgeHeight = flapFoldAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 20, 62],
    extrapolate: 'clamp',
  });

  const closedBadgeOpacity = flapFoldAnim.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Impacto físico no corpo todo da carteira quando o fecho de latão bate
  const walletScale = walletImpactAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1.012, 1, 0.974],
  });

  const walletBounceY = walletImpactAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-2, 0, 3.5],
  });

  const snapButtonScale = walletImpactAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1.18, 1, 1.25],
  });

  function handleSelectMode(nextMode: PrivacyMode) {
    setPrivacyMode(nextMode);
    // Se os valores estavam visíveis quando o usuário clicou em um modo para testar,
    // já ativa a ocultação imediatamente para demonstrar o efeito!
    if (!isBalanceHidden) {
      toggleBalanceHidden();
    }
  }

  return (
    <View style={styles.container}>
      {/* BARRA DE TESTE DOS 2 MODOS DE PRIVACIDADE (Asteriscos vs Fechar Carteira) */}
      <View
        style={[
          styles.privacyBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>
        <Pressable
          testID="toggle-privacy-btn"
          onPress={toggleBalanceHidden}
          style={({ pressed }) => [
            styles.eyeToggleBtn,
            {
              backgroundColor: isBalanceHidden ? colors.primarySoft : colors.surfaceRaised,
              borderColor: isBalanceHidden ? colors.primary : colors.border,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}>
          <Ionicons
            name={isBalanceHidden ? 'eye-off' : 'eye'}
            size={14}
            color={isBalanceHidden ? colors.primary : colors.text}
          />
          <Text
            variant="caption"
            style={{
              fontSize: 11.5,
              fontWeight: '700',
              color: isBalanceHidden ? colors.primary : colors.text,
            }}>
            {isBalanceHidden ? 'Oculto' : 'Visível'}
          </Text>
        </Pressable>

        <View style={[styles.modeSegmented, { backgroundColor: colors.surfaceRaised }]}>
          <Pressable
            testID="privacy-mode-asterisks"
            onPress={() => handleSelectMode('asterisks')}
            style={[
              styles.modePill,
              privacyMode === 'asterisks' && {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
                borderWidth: 1,
              },
            ]}>
            <Ionicons
              name="medical"
              size={11}
              color={privacyMode === 'asterisks' ? colors.primary : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: privacyMode === 'asterisks' ? '700' : '600',
                color: privacyMode === 'asterisks' ? colors.text : colors.textMuted,
              }}>
              Asteriscos
            </Text>
          </Pressable>

          <Pressable
            testID="privacy-mode-flap"
            onPress={() => handleSelectMode('wallet-flap')}
            style={[
              styles.modePill,
              privacyMode === 'wallet-flap' && {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
                borderWidth: 1,
              },
            ]}>
            <Ionicons
              name="wallet"
              size={12}
              color={privacyMode === 'wallet-flap' ? colors.primary : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: privacyMode === 'wallet-flap' ? '700' : '600',
                color: privacyMode === 'wallet-flap' ? colors.text : colors.textMuted,
              }}>
              Fechar Carteira
            </Text>
          </Pressable>
        </View>
      </View>

      {/* CORPO DA CARTEIRA DE COURO COM FÍSICA DE RECUO NO FECHO */}
      <Animated.View
        style={[
          styles.leatherMainShell,
          isDark && { borderColor: 'rgba(212, 123, 74, 0.35)' },
          {
            transform: [
              { translateY: walletBounceY },
              { scale: walletScale },
            ],
          },
        ]}>
        <ImageBackground
          source={require('@/assets/textures/leather.jpg')}
          resizeMode="cover"
          imageStyle={styles.leatherImage}
          style={styles.leatherBacking}>
          
          <View style={styles.leatherDarkOverlay} />

          {/* 
            ABA SUPERIOR DE COURO QUE DOBRA POR CIMA DOS CARTÕES (Modo 'wallet-flap')
            Com costura pespontada e tira de couro central que trava no fecho de latão!
          */}
          <Animated.View
            pointerEvents={isWalletClosed ? 'auto' : 'none'}
            style={[
              styles.topClosureHood,
              {
                opacity: topFlapOpacity,
                transform: [
                  { perspective: 900 },
                  { translateY: topFlapTranslateY },
                  { rotateX: topFlapRotateX },
                ],
              },
            ]}>
            <Pressable onPress={toggleBalanceHidden} style={{ flex: 1 }}>
              <ImageBackground
                source={require('@/assets/textures/leather.jpg')}
                resizeMode="cover"
                style={styles.topClosureLeather}>
                <View style={styles.topClosureDarkTint} />
                <View style={styles.topClosureStitchLine} />

                {/* Tira vertical de couro da lingueta do fecho */}
                <View style={styles.leatherClaspStrap}>
                  <View style={styles.leatherClaspStrapStitch} />
                </View>
              </ImageBackground>
            </Pressable>
          </Animated.View>

          {/* 
            1. CÂMARA DOS CARTÕES (Com respiro e profundidade)
            No modo 'wallet-flap', os cartões mergulham para dentro do bolso com física de mola!
          */}
          <Animated.View style={[styles.chamberWrapper, { height: chamberHeight }]}>
            <ScrollView
              horizontal
              scrollEnabled={!isWalletClosed}
              showsHorizontalScrollIndicator={false}
              style={styles.cardsScrollView}
              contentContainerStyle={styles.cardsScrollContent}>
              {accounts.map((acc, index) => {
                const { rot, y } = CARD_VARIATIONS[index % CARD_VARIATIONS.length];

                return (
                  <Animated.View
                    key={acc.id}
                    style={[
                      styles.cardRotator,
                      {
                        zIndex: index + 1,
                        opacity: cardsOpacity,
                        transform: [
                          { translateY: Animated.add(cardsTranslateY, new Animated.Value(y)) },
                          { scale: cardsScale },
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

                      {/* Saldo da Conta: Visível ou Mascarado com Asteriscos */}
                      <View style={styles.cardBalanceBox}>
                        <Text style={styles.cardBalanceLabel}>SALDO</Text>
                        <Text
                          style={styles.cardBalanceValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}>
                          {isAsteriskMask ? MASKED_BALANCE : acc.balance.format()}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}

              {/* Botão de adicionar nova conta (slot vago na carteira) */}
              <Animated.View
                style={[
                  styles.cardRotator,
                  {
                    opacity: cardsOpacity,
                    transform: [{ translateY: cardsTranslateY }, { scale: cardsScale }],
                  },
                ]}>
                <Pressable
                  onPress={() => router.push('/account-form')}
                  style={({ pressed }) => [
                    styles.addCardSlot,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}>
                  <Ionicons name="add-circle-outline" size={16} color="#E4D5C7" />
                  <Text style={styles.addCardText}>Nova conta</Text>
                </Pressable>
              </Animated.View>
            </ScrollView>
          </Animated.View>

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

              {/* Cabeçalho da Carteira + Fecho de Pressão em Latão Interativo */}
              <View style={styles.walletHeader}>
                <View style={styles.brandEmboss}>
                  <Ionicons
                    name={isWalletClosed ? 'lock-closed' : 'wallet-outline'}
                    size={13}
                    color="#E4D5C7"
                  />
                  <Text style={styles.brandEmbossText}>
                    {isWalletClosed ? 'SMART WALLET • FECHADA' : 'SMART WALLET'}
                  </Text>
                </View>

                {/* Fecho de pressão em latão: tocar nele fecha ou abre a carteira! */}
                <Pressable
                  testID="wallet-brass-snap"
                  onPress={toggleBalanceHidden}
                  hitSlop={14}
                  accessibilityRole="button"
                  accessibilityLabel={isBalanceHidden ? 'Abrir carteira e mostrar saldo' : 'Fechar carteira e ocultar saldo'}
                  style={styles.snapButtonHitArea}>
                  <Text style={styles.snapHintLabel}>
                    {isBalanceHidden ? 'ABRIR' : 'FECHAR'}
                  </Text>
                  <Animated.View
                    style={[
                      styles.snapButtonOuter,
                      isBalanceHidden && styles.snapButtonOuterLocked,
                      { transform: [{ scale: snapButtonScale }] },
                    ]}>
                    <View style={styles.snapButtonBevel}>
                      <View style={styles.snapButtonCore}>
                        {isBalanceHidden ? (
                          <Ionicons name="lock-closed" size={8} color="#F7D996" />
                        ) : (
                          <View style={styles.snapButtonCenterPin} />
                        )}
                      </View>
                    </View>
                  </Animated.View>
                </Pressable>
              </View>

              {/* ESTADO ABERTO (OU MODO ASTERISCOS): Saldo Consolidado + Entradas/Saídas */}
              <Animated.View
                pointerEvents={isWalletClosed ? 'none' : 'auto'}
                style={{
                  maxHeight: openBodyMaxHeight,
                  opacity: openBodyOpacity,
                  overflow: 'hidden',
                  gap: spacing.md,
                }}>
                {/* Saldo Consolidado */}
                <Pressable onPress={toggleBalanceHidden} style={styles.balanceArea}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.balancePrefix}>SALDO CONSOLIDADO</Text>
                    {isAsteriskMask && (
                      <View style={styles.maskedPillBadge}>
                        <Ionicons name="eye-off" size={10} color="#EFE3D5" />
                        <Text style={styles.maskedPillText}>OCULTO</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    variant="display"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[
                      styles.balanceText,
                      isAsteriskMask && { letterSpacing: 2 },
                    ]}>
                    {isAsteriskMask ? MASKED_BALANCE : consolidated.format()}
                  </Text>
                </Pressable>

                {/* Entradas e Saídas do Mês */}
                <View style={styles.walletFooter}>
                  <View style={styles.footerCol}>
                    <Text style={styles.footerLabel}>ENTRADAS DO MÊS</Text>
                    <Text style={styles.footerValueIncome}>
                      {isAsteriskMask ? `+${MASKED_BALANCE}` : `+${income.format()}`}
                    </Text>
                  </View>

                  <View style={styles.footerDivider} />

                  <View style={styles.footerCol}>
                    <Text style={styles.footerLabel}>SAÍDAS DO MÊS</Text>
                    <Text style={styles.footerValueExpense}>
                      {isAsteriskMask ? `-${MASKED_BALANCE}` : `-${expense.format()}`}
                    </Text>
                  </View>
                </View>
              </Animated.View>

              {/* ESTADO CARTEIRA FECHADA (Modo 'wallet-flap'): Selo em Couro com Toque para Abrir */}
              <Animated.View
                pointerEvents={isWalletClosed ? 'auto' : 'none'}
                style={{
                  height: closedBadgeHeight,
                  opacity: closedBadgeOpacity,
                  overflow: 'hidden',
                  justifyContent: 'center',
                }}>
                <Pressable
                  onPress={toggleBalanceHidden}
                  style={styles.closedWalletSeal}>
                  <View style={styles.closedSealLeft}>
                    <View style={styles.closedBrassRing}>
                      <Ionicons name="shield-checkmark" size={15} color="#E5BC78" />
                    </View>
                    <View>
                      <Text style={styles.closedSealTitle}>Carteira Fechada</Text>
                      <Text style={styles.closedSealSubtitle}>
                        Cartões e saldos guardados no bolso
                      </Text>
                    </View>
                  </View>
                  <View style={styles.openWalletCta}>
                    <Text style={styles.openWalletCtaText}>Abrir</Text>
                    <Ionicons name="chevron-down" size={13} color="#EFE3D5" />
                  </View>
                </Pressable>
              </Animated.View>
            </ImageBackground>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  privacyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  eyeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  modeSegmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    padding: 2,
    gap: 2,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
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
  topClosureHood: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 54,
    zIndex: 60,
    borderBottomWidth: 2,
    borderBottomColor: '#241005',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.55,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 14 },
      default: {},
    }),
  },
  topClosureLeather: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  topClosureDarkTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 13, 5, 0.48)',
  },
  topClosureStitchLine: {
    marginBottom: 7,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 226, 213, 0.38)',
    borderStyle: 'dashed',
  },
  leatherClaspStrap: {
    position: 'absolute',
    right: 21,
    top: 0,
    bottom: -26,
    width: 30,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    backgroundColor: '#3B1D0D',
    borderWidth: 1.5,
    borderColor: '#220F05',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  leatherClaspStrapStitch: {
    position: 'absolute',
    top: 4,
    bottom: 5,
    left: 4,
    right: 4,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(240, 226, 213, 0.32)',
    borderStyle: 'dashed',
  },
  chamberWrapper: {
    zIndex: 1,
    paddingTop: 8,
    overflow: 'hidden',
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
  snapButtonHitArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snapHintLabel: {
    color: 'rgba(239, 227, 213, 0.65)',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  snapButtonOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  snapButtonOuterLocked: {
    borderColor: '#F3C878',
    backgroundColor: '#8F642E',
  },
  snapButtonBevel: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D1A362',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8A6028',
  },
  snapButtonCore: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#4D3212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapButtonCenterPin: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
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
  maskedPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 227, 213, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  maskedPillText: {
    color: '#EFE3D5',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
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
  closedWalletSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 9, 3, 0.42)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(229, 188, 120, 0.28)',
  },
  closedSealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closedBrassRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(209, 163, 98, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(229, 188, 120, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedSealTitle: {
    color: '#FFFDFC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  closedSealSubtitle: {
    color: 'rgba(239, 227, 213, 0.72)',
    fontSize: 11,
    fontWeight: '500',
  },
  openWalletCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 227, 213, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  openWalletCtaText: {
    color: '#EFE3D5',
    fontSize: 11,
    fontWeight: '700',
  },
});
