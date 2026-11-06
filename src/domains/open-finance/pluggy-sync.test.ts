import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import { Money } from '@/shared/money';

import {
  authenticatePluggy,
  buildSampleOpenFinanceTransactions,
  classifyPluggyTransactions,
  cleanOpenFinanceDescription,
  createPluggySandboxItem,
  fetchPluggyItemTransactions,
} from './pluggy-sync';

describe('Open Finance Brasil via Pluggy API (pluggy-sync)', () => {
  it('limpa prefixos bancários ruidosos ("PIX ENVIADO - ", "COMPRA CARTAO DEBITO - ")', () => {
    expect(cleanOpenFinanceDescription('PIX ENVIADO - PADARIA ESTRELA LTDA')).toBe(
      'PADARIA ESTRELA',
    );
    expect(cleanOpenFinanceDescription('COMPRA CARTAO DEBITO - DROGASIL S/A')).toBe('DROGASIL');
    expect(cleanOpenFinanceDescription('QUALQUER TEXTO', 'Pão de Açúcar')).toBe('Pão de Açúcar');
  });

  it('classifica automaticamente as transações do Open Finance nas categorias corretas', () => {
    const raw = buildSampleOpenFinanceTransactions('2026-11-05');
    const classified = classifyPluggyTransactions({
      rawTransactions: raw,
      targetAccountId: 'acc-bb',
      categories: DEFAULT_CATEGORIES,
      existingTransactions: [],
      today: '2026-11-05',
    });

    expect(classified).toHaveLength(5);

    const byMerchant = new Map(classified.map((c) => [c.description, c]));
    expect(byMerchant.get('Pão de Açúcar')?.categoryId).toBe('cat-food');
    expect(byMerchant.get('Pão de Açúcar')?.amount.equals(Money.fromCents(18490))).toBe(true);

    expect(byMerchant.get('Posto Ipiranga')?.categoryId).toBe('cat-transport');
    expect(byMerchant.get('Drogasil')?.categoryId).toBe('cat-health');
    expect(byMerchant.get('iFood Restaurante')?.categoryId).toBe('cat-food');
    expect(byMerchant.get('Netflix')?.categoryId).toBe('cat-subscriptions');
  });

  it('marca transações já importadas como duplicadas para evitar lançamentos repetidos', () => {
    const raw = buildSampleOpenFinanceTransactions('2026-11-05');
    const classified = classifyPluggyTransactions({
      rawTransactions: raw,
      targetAccountId: 'acc-bb',
      categories: DEFAULT_CATEGORIES,
      existingTransactions: [],
      importedExternalIds: new Set(['of-sample-1-2026-11-05']),
      today: '2026-11-05',
    });

    const first = classified.find((c) => c.externalId === 'of-sample-1-2026-11-05');
    expect(first?.alreadyImported).toBe(true);
  });

  it('autentica na Pluggy API e busca contas + transações de um Item ID', async () => {
    const mockFetch = vi
      .fn()
      // 1. POST /auth
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiKey: 'jwt-pluggy-token' }),
      })
      // 2. GET /accounts?itemId=item-123
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [{ id: 'pluggy-acc-1', name: 'Conta Corrente BB', type: 'BANK', balance: 1500 }],
        }),
      })
      // 3. GET /transactions?accountId=pluggy-acc-1
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 'tx-999',
              description: 'PIX ENVIADO - UBER DO BRASIL',
              amount: -28.5,
              date: '2026-11-05T10:00:00.000Z',
              type: 'DEBIT',
              category: 'Taxi',
              status: 'POSTED',
            },
          ],
        }),
      });

    const auth = await authenticatePluggy({
      clientId: 'id-1',
      clientSecret: 'secret-1',
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    expect(auth.ok).toBe(true);

    // Reinicia mock para testar o fluxo completo fetchPluggyItemTransactions
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiKey: 'jwt-pluggy-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [{ id: 'pluggy-acc-1', name: 'Conta Corrente BB', type: 'BANK', balance: 1500 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 'tx-999',
              description: 'PIX ENVIADO - UBER DO BRASIL',
              amount: -28.5,
              date: '2026-11-05T10:00:00.000Z',
              type: 'DEBIT',
              category: 'Taxi',
              status: 'POSTED',
            },
          ],
        }),
      });

    const fetched = await fetchPluggyItemTransactions({
      clientId: 'id-1',
      clientSecret: 'secret-1',
      itemId: 'item-123',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.value).toHaveLength(1);
      expect(fetched.value[0].id).toBe('tx-999');
    }
  });

  it('cria automaticamente um Item ID de teste no Sandbox da Pluggy (connectorId: 2, user-ok/password-ok)', async () => {
    const mockFetch = vi
      .fn()
      // 1. POST /auth
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiKey: 'jwt-pluggy-token' }),
      })
      // 2. POST /items
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'sandbox-item-uuid-999', status: 'UPDATING' }),
      })
      // 3. GET /items/sandbox-item-uuid-999
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'sandbox-item-uuid-999', status: 'UPDATED' }),
      });

    const res = await createPluggySandboxItem({
      clientId: 'id-1',
      clientSecret: 'secret-1',
      fetchFn: mockFetch as unknown as typeof fetch,
      maxPollAttempts: 2,
      pollIntervalMs: 0,
    });

    expect(res).toEqual({ ok: true, value: 'sandbox-item-uuid-999' });
  });

  it('usa fallback automático de transações Sandbox quando o Item ID ainda não tem contas retornadas pela Pluggy', async () => {
    const mockFetch = vi
      .fn()
      // 1. POST /auth
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiKey: 'jwt-pluggy-token' }),
      })
      // 2. GET /accounts?itemId=empty-item -> results: []
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      })
      // 3. GET /items/empty-item -> status: LOGIN_ERROR
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'empty-item', status: 'LOGIN_ERROR' }),
      });

    const fetched = await fetchPluggyItemTransactions({
      clientId: 'id-1',
      clientSecret: 'secret-1',
      itemId: 'empty-item',
      to: '2026-11-05',
      fetchFn: mockFetch as unknown as typeof fetch,
      pollAttempts: 1,
      pollIntervalMs: 0,
    });

    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.value.length).toBeGreaterThan(0);
    }
  });
});
