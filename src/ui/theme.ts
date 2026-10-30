import { useColorScheme } from 'react-native';
import { create } from 'zustand';

/**
 * DESIGN TOKENS — Estética Orgânica & Editorial
 *
 * - Modo Claro (Warm Paper, Sand & Terracotta):
 *   Fundo linho/areia suave, cartões creme, textos em cacau/espresso profundo,
 *   destaque em terracota, verde sálvia para receitas e cereja queimado para gastos.
 *
 * - Modo Escuro / Noturno (Nocturnal Espresso, Dark Leather & Warm Amber):
 *   Fundo café torrado/nogueira escura, cartões em mogno escuro aveludado,
 *   textos em pergaminho quente, terracota luminoso e tons botânicos calibrados
 *   para alto conforto visual à noite (US-020).
 */

export const lightColors = {
  // Fundos & Superfícies (Warm Paper & Cream)
  background: '#F7F4EE',        // Linho suave / Areia clara
  surface: '#FFFFFF',           // Papel branco macio
  surfaceRaised: '#EFECE4',     // Bege aveludado para cards secundários e relevo
  surfacePressed: '#E5E1D6',    // Tom de clique natural
  border: 'rgba(74, 55, 40, 0.08)',       // Borda pigmentada café sutil
  borderStrong: 'rgba(74, 55, 40, 0.16)', // Borda destacada

  // Tipografia (Tons terrosos e café)
  text: '#27201B',              // Cacau 95% / Espresso profundo
  textMuted: '#796E65',         // Argila / Taupe médio
  textFaint: '#A99F94',         // Areia quente para placeholders

  // Destaque Primário (Terracota & Couro Caramelo)
  primary: '#A85A32',           // Terracota clássico elegante
  primarySoft: 'rgba(168, 90, 50, 0.12)',

  // Finanças Orgânicas (Sálvia & Cereja Queimado)
  income: '#2D7252',            // Verde botânico / Sálvia rica
  incomeSoft: 'rgba(45, 114, 82, 0.12)',
  expense: '#BA4337',           // Cereja queimado / Vinho terracota
  expenseSoft: 'rgba(186, 67, 55, 0.12)',

  white: '#FFFFFF',
  overlay: 'rgba(39, 32, 27, 0.65)',
} as const;

export const darkColors: ThemeColors = {
  // Fundos & Superfícies (Nocturnal Espresso & Dark Leather)
  background: '#14110F',        // Café torrado / Nogueira profunda
  surface: '#1F1A17',           // Mogno escuro aveludado para cartões
  surfaceRaised: '#2A231F',     // Cacau elevado para controles e relevo
  surfacePressed: '#352C27',    // Tom de toque noturno
  border: 'rgba(239, 227, 213, 0.09)',       // Borda sutil em pergaminho
  borderStrong: 'rgba(239, 227, 213, 0.18)', // Borda destacada noturna

  // Tipografia (Pergaminho & Areia Quente)
  text: '#F2ECE4',              // Pergaminho claro / Creme suave
  textMuted: '#A89C91',         // Pedra morna / Taupe claro
  textFaint: '#6E635A',         // Terra sombra para placeholders

  // Destaque Primário (Terracota Luminoso & Âmbar)
  primary: '#D47B4A',           // Terracota âmbar luminoso
  primarySoft: 'rgba(212, 123, 74, 0.18)',

  // Finanças Orgânicas Noturnas
  income: '#4CA97C',            // Sálvia luminosa
  incomeSoft: 'rgba(76, 169, 124, 0.18)',
  expense: '#E0665A',           // Coral terracota / Cereja suave
  expenseSoft: 'rgba(224, 102, 90, 0.18)',

  white: '#FFFFFF',
  overlay: 'rgba(8, 6, 5, 0.78)',
};

export type ColorToken = keyof typeof lightColors;
export type ThemeColors = { [K in ColorToken]: string };
export type ThemeMode = 'system' | 'light' | 'dark';

/** Export estático padrão (compatibilidade) */
export const colors: ThemeColors = lightColors;

interface ThemeStoreState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStoreState>()((set) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
}));

/** Hook reativo de tema (US-020): retorna a paleta ativa (clara ou escura) e estado do modo noturno. */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const activeColors = isDark ? darkColors : lightColors;

  return {
    colors: activeColors,
    isDark,
    mode,
    accentFor: (type: 'expense' | 'income') =>
      type === 'income' ? activeColors.income : activeColors.expense,
  };
}

export const gradients = {
  // Card de Saldo Consolidado estilo "Carteira de Couro / Terracota"
  hero: ['#B8653B', '#8C4320', '#5F2810'],
  income: ['#2D7252', '#1C4F37'],
  expense: ['#BA4337', '#8A2A20'],
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' },
  bodyStrong: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Cor de destaque por tipo de transação (receita = verde sálvia, gasto = cereja terracota) */
export const accentFor = (type: 'expense' | 'income') =>
  type === 'income' ? lightColors.income : lightColors.expense;
