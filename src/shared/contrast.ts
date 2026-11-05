/**
 * Utilitários puros de contraste e luminância de cores (WCAG / YIQ).
 * Garante legibilidade automática em cartões bancários claros (ex.: amarelo Banco do Brasil
 * `#F8D117`, verde Carteira `#2ED3A0`) e escuros (ex.: Nubank `#8A05BE`, Santander `#EC0000`).
 */

/**
 * Converte uma cor hexadecimal (`#RRGGBB` ou `#RGB`) em componentes RGB (0..255).
 */
export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (/^[0-9a-fA-F]{6,8}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

/**
 * Calcula a luminância perceptiva (0 = preto, 1 = branco) de uma cor hexadecimal.
 */
export function getColorLuminance(hex: string): number {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/**
 * Retorna `true` quando a cor de fundo é clara (ex.: amarelo Banco do Brasil `#F8D117`,
 * verde menta `#2ED3A0`) e exige texto escuro para leitura nítida.
 */
export function isLightColor(hex: string, threshold = 0.6): boolean {
  return getColorLuminance(hex) >= threshold;
}

/**
 * Retorna a paleta de texto/ícone ideal (escura ou clara) para ser exibida SOBRE
 * um fundo preenchido com `backgroundHex` (ex.: cartões da carteira ou bolas selecionadas).
 */
export function getContrastForeground(backgroundHex: string): {
  text: string;
  textMuted: string;
  border: string;
  sheen: string;
  chipBg: string;
  chipCore: string;
  isLight: boolean;
} {
  const light = isLightColor(backgroundHex);
  if (light) {
    return {
      text: '#1D160B',
      textMuted: 'rgba(29, 22, 11, 0.72)',
      border: 'rgba(29, 22, 11, 0.22)',
      sheen: 'rgba(255, 255, 255, 0.28)',
      chipBg: 'rgba(29, 22, 11, 0.18)',
      chipCore: 'rgba(29, 22, 11, 0.55)',
      isLight: true,
    };
  }
  return {
    text: '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.78)',
    border: 'rgba(255, 255, 255, 0.35)',
    sheen: 'rgba(255, 255, 255, 0.14)',
    chipBg: '#E5C667',
    chipCore: '#826214',
    isLight: false,
  };
}

/**
 * Quando uma cor muito clara (ex.: `#F8D117`) é usada como cor de ícone/texto sobre
 * superfície clara (`#FFFFFF`), escurece o tom para garantir contraste de leitura.
 */
export function getReadableAccent(hex: string, isDarkTheme: boolean): string {
  if (isDarkTheme) return hex;
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  if (lum < 0.68) return hex;

  // Escurece proporcionalmente para garantir nitidez no modo claro
  const factor = 0.58;
  const r = Math.round(rgb.r * factor)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(rgb.g * factor)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(rgb.b * factor)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}`;
}
