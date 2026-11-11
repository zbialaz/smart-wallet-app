import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/domains/categories/category';
import { Money } from '@/shared/money';

import { exportTransactionsToCsv, parseBankStatementText } from './statement-parser';

describe('Importação de Extrato CSV/OFX e Exportação CSV (statement-parser)', () => {
  it('lê extrato CSV da conta do Nubank (Data,Valor,Identificador,Descrição)', () => {
    const csv = [
      'Data,Valor,Identificador,Descrição',
      '05/11/2026,-58.90,8f14e45f-ceea-467a-a111-222233334444,Transferência enviada pelo Pix - IFOOD',
      '06/11/2026,3500.00,9a14e45f-ceea-467a-a111-222233335555,Transferência recebida - SALARIO EMPRESA',
    ].join('\n');

    const parsed = parseBankStatementText(csv, '2026-11-05');
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      id: '8f14e45f-ceea-467a-a111-222233334444',
      date: '2026-11-05',
      amount: -58.9,
      type: 'DEBIT',
      description: 'Transferência enviada pelo Pix - IFOOD',
    });
    expect(parsed[1]).toMatchObject({
      date: '2026-11-06',
      amount: 3500,
      type: 'CREDIT',
    });
  });

  it('lê fatura CSV de cartão do Nubank (date,title,amount)', () => {
    const csv = [
      'date,title,amount',
      '2026-11-04,Uber *Trip,32.90',
      '2026-11-05,Netflix.Com,55.90',
    ].join('\n');

    const parsed = parseBankStatementText(csv, '2026-11-05');
    expect(parsed).toHaveLength(2);
    expect(parsed[0].amount).toBe(-32.9);
    expect(parsed[0].type).toBe('DEBIT');
    expect(parsed[1].description).toBe('Netflix.Com');
  });

  it('lê arquivo OFX bancário (<STMTTRN>)', () => {
    const ofx = `
      <OFX>
        <STMTTRN>
          <TRNTYPE>DEBIT
          <DTPOSTED>20261105120000[-3:BRT]
          <TRNAMT>-184.90
          <FITID>OFX-998877
          <MEMO>SUPERMERCADO PAO DE ACUCAR
        </STMTTRN>
      </OFX>
    `;

    const parsed = parseBankStatementText(ofx, '2026-11-05');
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: 'OFX-998877',
      date: '2026-11-05',
      amount: -184.9,
      type: 'DEBIT',
      description: 'SUPERMERCADO PAO DE ACUCAR',
    });
  });

  it('exporta transações para CSV padronizado', () => {
    const csv = exportTransactionsToCsv({
      transactions: [
        {
          id: 'tx-1',
          type: 'expense',
          amount: Money.fromCents(3290),
          description: 'Uber Centro',
          categoryId: 'cat-transport',
          accountId: 'acc-1',
          date: '2026-11-05',
          createdAt: '2026-11-05T10:00:00Z',
          updatedAt: '2026-11-05T10:00:00Z',
        },
      ],
      categories: DEFAULT_CATEGORIES,
      accounts: [
        {
          id: 'acc-1',
          name: 'Nubank',
          color: '#8A05BE',
          initialBalance: Money.zero(),
          createdAt: '2026-11-01T00:00:00Z',
          archivedAt: null,
        },
      ],
    });

    expect(csv).toContain('Data,Tipo,Descrição,Categoria,Conta,Valor');
    expect(csv).toContain('2026-11-05,Gasto,Uber Centro,Transporte,Nubank,-32.90');
  });
});

