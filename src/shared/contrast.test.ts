import { describe, expect, it } from 'vitest';

import {
  getColorLuminance,
  getContrastForeground,
  getReadableAccent,
  isLightColor,
} from './contrast';

describe('Contraste Automático de Cores (Banco do Brasil, Carteira, Nubank, etc.)', () => {
  it('usa texto escuro (#1D160B) sobre fundos claros como Banco do Brasil (#F8D117) e Carteira (#2ED3A0)', () => {
    const bb = getContrastForeground('#F8D117');
    expect(bb.isLight).toBe(true);
    expect(bb.text).toBe('#1D160B');

    const wallet = getContrastForeground('#2ED3A0');
    expect(wallet.isLight).toBe(true);
    expect(wallet.text).toBe('#1D160B');
  });

  it('mantém texto branco (#FFFFFF) sobre fundos escuros como Nubank (#8A05BE), Santander (#EC0000) e Caixa (#005CA9)', () => {
    expect(getContrastForeground('#8A05BE').text).toBe('#FFFFFF');
    expect(getContrastForeground('#EC0000').text).toBe('#FFFFFF');
    expect(getContrastForeground('#005CA9').text).toBe('#FFFFFF');
    expect(isLightColor('#8A05BE')).toBe(false);
  });

  it('escurece ícones amarelos muito claros no tema claro para leitura sobre fundo branco', () => {
    const readableOnLight = getReadableAccent('#F8D117', false);
    expect(getColorLuminance(readableOnLight)).toBeLessThan(0.55);

    // No tema escuro mantém a cor vibrante original
    expect(getReadableAccent('#F8D117', true)).toBe('#F8D117');
  });
});
