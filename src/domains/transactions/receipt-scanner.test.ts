import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import { Money } from '@/shared/money';

import {
  analyzeReceiptWithGemini,
  extractReceiptAmount,
  extractReceiptDate,
  extractReceiptMerchant,
  parseReceiptText,
  resolveReceiptSegmentAndCategory,
} from './receipt-scanner';

describe('Leitor de Nota Fiscal / Cupom Fiscal (receipt-scanner)', () => {
  it('extrai o valor total de um cupom fiscal NFC-e ignorando subtotal, desconto e troco', () => {
    const receipt = `
      DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA
      SUPERMERCADO PAO DE ACUCAR LTDA
      CNPJ: 47.508.411/0001-56
      AV PAULISTA, 1000 - SAO PAULO - SP
      ----------------------------------------
      001 ARROZ 5KG                R$ 29,90
      002 CAFE TORRADO 500G        R$ 22,50
      003 FILE DE FRANGO           R$ 35,00
      SUBTOTAL                     R$ 87,40
      DESCONTO                     R$  5,00
      VALOR A PAGAR R$             82,40
      CARTAO DE CREDITO            82,40
      TROCO R$                     0,00
      Tributos Totais Incidentes   R$ 14,20
      Emissão: 03/11/2026 18:42:10
    `;

    const parsed = parseReceiptText({
      text: receipt,
      categories: DEFAULT_CATEGORIES,
      today: '2026-11-04',
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.amount.equals(Money.fromCents(8240))).toBe(true);
    expect(parsed.value.merchant).toBe('SUPERMERCADO PAO DE ACUCAR');
    expect(parsed.value.categoryId).toBe('cat-food');
    expect(parsed.value.segmentLabel).toContain('Alimentação');
    expect(parsed.value.date).toBe('2026-11-03');
    expect(parsed.value.source).toBe('local');
  });

  it('identifica valores acima de R$ 1.000,00 formatados com ponto de milhar', () => {
    const amount = extractReceiptAmount('VALOR TOTAL: R$ 1.459,90');
    expect(amount?.cents).toBe(145990);
  });

  it('identifica automaticamente o segmento de Farmácia (Saúde) e Posto de Combustível (Transporte)', () => {
    const pharmacy = parseReceiptText({
      text: `
        DROGASIL S/A
        CNPJ 61.585.865/0001-51
        DIPIRONA 1G 10 COMP   18,90
        VALOR TOTAL R$ 47,80
        04/11/2026
      `,
      categories: DEFAULT_CATEGORIES,
      today: '2026-11-04',
    });

    expect(pharmacy.ok).toBe(true);
    if (pharmacy.ok) {
      expect(pharmacy.value.merchant).toBe('DROGASIL');
      expect(pharmacy.value.categoryId).toBe('cat-health');
      expect(pharmacy.value.segmentLabel).toContain('Saúde');
      expect(pharmacy.value.amount.cents).toBe(4780);
    }

    const fuel = parseReceiptText({
      text: `
        AUTO POSTO IPIRANGA LTDA
        GASOLINA ADITIVADA 38,5L
        TOTAL A PAGAR: R$ 234,85
      `,
      categories: DEFAULT_CATEGORIES,
      today: '2026-11-04',
    });

    expect(fuel.ok).toBe(true);
    if (fuel.ok) {
      expect(fuel.value.merchant).toBe('AUTO POSTO IPIRANGA');
      expect(fuel.value.categoryId).toBe('cat-transport');
      expect(fuel.value.segmentLabel).toContain('Transporte');
      expect(fuel.value.amount.cents).toBe(23485);
    }
  });

  it('respeita regras aprendidas do usuário ao classificar o estabelecimento da nota', () => {
    const resolved = resolveReceiptSegmentAndCategory({
      merchant: 'Mercadinho da Esquina',
      categories: DEFAULT_CATEGORIES,
      learnedRules: { 'expense:mercadinho da esquina': 'cat-home' },
    });

    expect(resolved.categoryId).toBe('cat-home');
  });

  it('rejeita datas futuras ao extrair a data do cupom fiscal', () => {
    expect(extractReceiptDate('Data: 10/11/2026', '2026-11-04')).toBeNull();
    expect(extractReceiptDate('Data: 02/11/2026', '2026-11-04')).toBe('2026-11-02');
    expect(extractReceiptMerchant('CUPOM FISCAL\nLOJAS RENNER S.A.\nTOTAL 129,90')).toBe(
      'LOJAS RENNER',
    );
  });

  it('analisa imagem base64 da nota fiscal com Gemini (gemini-3.8-flash) e retorna valor, estabelecimento e segmento', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    amountReais: 156.4,
                    merchant: 'Carrefour Hipermercado',
                    segment: 'Supermercado / Alimentação',
                    categoryId: 'cat-food',
                    date: '2026-11-04',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const result = await analyzeReceiptWithGemini({
      apiKey: 'AQ.test-key',
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      mimeType: 'image/jpeg',
      categories: DEFAULT_CATEGORIES,
      today: '2026-11-04',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.amount.cents).toBe(15640);
    expect(result.value.merchant).toBe('Carrefour Hipermercado');
    expect(result.value.segmentLabel).toBe('Supermercado / Alimentação');
    expect(result.value.categoryId).toBe('cat-food');
    expect(result.value.date).toBe('2026-11-04');
    expect(result.value.source).toBe('gemini');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, reqInit] = mockFetch.mock.calls[0];
    const body = JSON.parse(reqInit.body);
    expect(body.contents[0].parts[1].inlineData).toEqual({
      mimeType: 'image/jpeg',
      data: '/9j/4AAQSkZJRg==',
    });
  });

  it('faz fallback automático para o parser local quando não há chave do Gemini mas há texto da nota', async () => {
    const result = await analyzeReceiptWithGemini({
      apiKey: '',
      receiptText: 'PADARIA ESTRELA\nVALOR A PAGAR R$ 24,50',
      categories: DEFAULT_CATEGORIES,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount.cents).toBe(2450);
    expect(result.value.categoryId).toBe('cat-food');
    expect(result.value.source).toBe('local');
  });
});

