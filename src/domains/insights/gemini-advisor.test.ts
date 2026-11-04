import { describe, expect, it, vi } from 'vitest';

import { Money } from '@/shared/money';

import { buildFinancialPrompt, requestGeminiAdvice } from './gemini-advisor';

describe('Consultor Financeiro com Gemini IA (gemini-advisor)', () => {
  it('monta o prompt com totais, categorias, tendência e pergunta opcional no idioma escolhido', () => {
    const promptPt = buildFinancialPrompt({
      userName: 'Eduardo',
      monthLabel: 'setembro de 2026',
      language: 'pt',
      totalIncome: Money.fromCents(500000),
      totalExpense: Money.fromCents(320000),
      monthlyBudget: Money.fromCents(350000),
      breakdown: [
        {
          categoryId: 'cat-food',
          name: 'Alimentação',
          color: '#FF8A4C',
          icon: 'fast-food',
          total: Money.fromCents(112000),
          share: 0.35,
        },
      ],
      comparison: { kind: 'up', percent: 20 },
      customQuestion: 'Como reduzir meu gasto com delivery?',
    });

    expect(promptPt).toContain('Eduardo');
    expect(promptPt).toContain('Alimentação');
    expect(promptPt).toContain('+20%');
    expect(promptPt).toContain('Como reduzir meu gasto com delivery?');
  });

  it('retorna erro amigável se a chave de API estiver vazia', async () => {
    const res = await requestGeminiAdvice({ apiKey: '   ', prompt: 'Teste' });
    expect(res.ok).toBe(false);
  });

  it('extrai a resposta do candidato retornado pela API do Gemini', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Eduardo, sua reserva do mês está saudável. Reduza 15% em Alimentação.' }],
            },
          },
        ],
      }),
    });

    const res = await requestGeminiAdvice({
      apiKey: 'AIzaSyTestKey123',
      prompt: 'Analise meu mês',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(res).toEqual({
      ok: true,
      value: 'Eduardo, sua reserva do mês está saudável. Reduza 15% em Alimentação.',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('propaga mensagem de erro quando a API retorna status HTTP de erro', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: 'API key not valid. Please pass a valid API key.' },
      }),
    });

    const res = await requestGeminiAdvice({
      apiKey: 'bad-key',
      prompt: 'Analise meu mês',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(res).toEqual({
      ok: false,
      error: 'API key not valid. Please pass a valid API key.',
    });
  });
});

