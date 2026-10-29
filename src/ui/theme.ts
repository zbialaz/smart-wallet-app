/**
 * DESIGN TOKENS — Estética Orgânica & Editorial (Warm Paper, Sand & Terracotta)
 * 
 * Substitui o preto/neon genérico por uma paleta acolhedora, artesanal e sofisticada:
 * - Fundo Linho/Areia suave
 * - Cartões Creme com bordas sutis com pigmento café
 * - Textos em Cacau/Espresso profundo (sem preto cru #000)
 * - Terracota / Couro Caramelo como cor de destaque
 * - Verde Sálvia Botânico para Receitas e Cereja Queimado para Gastos
 */

export const colors = {
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
export type ColorToken = keyof typeof colors;

/** Cor de destaque por tipo de transação (receita = verde sálvia, gasto = cereja terracota) */
export const accentFor = (type: 'expense' | 'income') =>
  type === 'income' ? colors.income : colors.expense;
