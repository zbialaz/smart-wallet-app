import type { Account } from '@/domains/accounts/account';
import type { Category } from '@/domains/categories/category';
import type { Transaction } from '@/domains/transactions/transaction';
import { isValidISODate, parseDateBR, type ISODate } from '@/shared/date';

import type { PluggyRawTransaction } from './pluggy-sync';

function normalizeStatementDate(raw: string, fallbackDate: ISODate): ISODate {
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  const isoCandidate = clean.slice(0, 10);
  if (isValidISODate(isoCandidate)) return isoCandidate;

  const brParsed = parseDateBR(clean.slice(0, 10));
  if (brParsed) return brParsed;

  // Formato OFX: YYYYMMDD...
  const ofxMatch = /^(\d{4})(\d{2})(\d{2})/.exec(clean);
  if (ofxMatch) {
    const iso = `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
    if (isValidISODate(iso)) return iso;
  }

  return fallbackDate;
}

function parseStatementAmount(raw: string): number | null {
  const clean = raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[R$\s]/g, '');
  if (!clean) return null;

  let normalized = clean;
  if (clean.includes(',') && clean.includes('.')) {
    // Ex.: -1.250,90 -> -1250.90
    normalized = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // Ex.: -58,90 -> -58.90
    normalized = clean.replace(',', '.');
  }

  const num = Number(normalized);
  if (!Number.isFinite(num) || num === 0) return null;
  return num;
}

function splitCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cols.push(current.trim());
  return cols;
}

function parseOfxBlocks(text: string, fallbackDate: ISODate): PluggyRawTransaction[] {
  const results: PluggyRawTransaction[] = [];
  const blockRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|$))/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = blockRegex.exec(text)) !== null) {
    const block = match[1];
    const amountRaw = /<TRNAMT>([^\r\n<]+)/i.exec(block)?.[1];
    const dateRaw = /<DTPOSTED>([^\r\n<]+)/i.exec(block)?.[1];
    const memoRaw =
      /<MEMO>([^\r\n<]+)/i.exec(block)?.[1] ?? /<NAME>([^\r\n<]+)/i.exec(block)?.[1];
    const fitId = /<FITID>([^\r\n<]+)/i.exec(block)?.[1];

    if (!amountRaw || !memoRaw) continue;
    const amount = parseStatementAmount(amountRaw);
    if (amount === null) continue;

    const isoDate = dateRaw ? normalizeStatementDate(dateRaw, fallbackDate) : fallbackDate;
    idx += 1;

    results.push({
      id: fitId?.trim() || `ofx-${isoDate}-${idx}-${Math.abs(Math.round(amount * 100))}`,
      description: memoRaw.trim(),
      amount,
      date: isoDate,
      type: amount < 0 ? 'DEBIT' : 'CREDIT',
      status: 'POSTED',
    });
  }

  return results;
}

/**
 * Lê extratos bancários em texto (CSV do Nubank, Itaú, Inter, BB ou arquivo OFX)
 * e converte para o formato padronizado de pré-visualização e classificação automática.
 */
export function parseBankStatementText(
  rawText: string,
  fallbackDate: ISODate = '2026-11-05',
): PluggyRawTransaction[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  if (/<STMTTRN>/i.test(trimmed)) {
    return parseOfxBlocks(trimmed, fallbackDate);
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter: ',' | ';' = lines[0].includes(';') ? ';' : ',';
  const firstCols = splitCsvLine(lines[0], delimiter).map((c) => c.toLowerCase());

  const hasHeader = firstCols.some((c) =>
    ['data', 'date', 'valor', 'amount', 'descrição', 'descricao', 'title', 'historico', 'histórico'].includes(c),
  );

  // Detecta formato de fatura de cartão do Nubank (date,title,amount ou date,category,title,amount)
  // onde gastos positivos na fatura representam despesas (DEBIT).
  const isNubankCardInvoice =
    hasHeader &&
    firstCols.includes('date') &&
    firstCols.includes('title') &&
    firstCols.includes('amount');

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const results: PluggyRawTransaction[] = [];

  dataLines.forEach((line, idx) => {
    const cols = splitCsvLine(line, delimiter);
    if (cols.length < 2) return;

    let dateIso: ISODate | null = null;
    let amount: number | null = null;
    let externalId: string | null = null;
    const textParts: string[] = [];

    for (const col of cols) {
      const clean = col.trim();
      if (!clean) continue;

      if (
        !dateIso &&
        (/^\d{4}-\d{2}-\d{2}/.test(clean) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean))
      ) {
        dateIso = normalizeStatementDate(clean, fallbackDate);
        continue;
      }

      if (
        !externalId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
      ) {
        externalId = clean;
        continue;
      }

      const parsedNum =
        /^-?(?:R\$\s*)?\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?$/.test(clean)
          ? parseStatementAmount(clean)
          : null;
      if (amount === null && parsedNum !== null) {
        amount = parsedNum;
        continue;
      }

      textParts.push(clean);
    }

    if (amount === null) return;
    const description = textParts[textParts.length - 1] || 'Lançamento importado';
    const resolvedDate = dateIso ?? fallbackDate;

    const finalAmount = isNubankCardInvoice ? -amount : amount;

    results.push({
      id:
        externalId ||
        `csv-${resolvedDate}-${idx + 1}-${Math.abs(Math.round(finalAmount * 100))}`,
      description,
      amount: finalAmount,
      date: resolvedDate,
      type: finalAmount < 0 ? 'DEBIT' : 'CREDIT',
      status: 'POSTED',
    });
  });

  return results;
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exporta transações para CSV compatível com Excel / Google Sheets.
 */
export function exportTransactionsToCsv(params: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}): string {
  const { transactions, categories, accounts } = params;
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const header = 'Data,Tipo,Descrição,Categoria,Conta,Valor';
  const rows = transactions.map((tx) => {
    const typeLabel = tx.type === 'income' ? 'Receita' : 'Gasto';
    const desc = tx.description ?? '';
    const cat = catMap.get(tx.categoryId) ?? 'Outros';
    const acc = accMap.get(tx.accountId) ?? 'Conta';
    const signedValue = (tx.type === 'income' ? tx.amount.cents : -tx.amount.cents) / 100;

    return [
      tx.date,
      typeLabel,
      escapeCsvCell(desc),
      escapeCsvCell(cat),
      escapeCsvCell(acc),
      signedValue.toFixed(2),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}
