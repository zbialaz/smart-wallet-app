import {
  suggestCategory,
  type LearnedCategoryRules,
} from '@/domains/categories/auto-classify';
import {
  OTHER_INCOME_CATEGORY_ID,
  type Category,
} from '@/domains/categories/category';
import { resolveReceiptSegmentAndCategory } from '@/domains/transactions/receipt-scanner';
import {
  DESCRIPTION_MAX_LENGTH,
  type Transaction,
  type TransactionDraft,
} from '@/domains/transactions/transaction';
import { isValidISODate, type ISODate } from '@/shared/date';
import { Money } from '@/shared/money';
import { fail, ok, type Result } from '@/shared/result';
import { normalizeText } from '@/shared/text';
import type { TransactionType } from '@/shared/transaction-type';

/**
 * Integração Open Finance Brasil via Pluggy API (`https://api.pluggy.ai`).
 *
 * Responsabilidades:
 *   1. Autenticar na API Pluggy (`clientId` + `clientSecret` -> `apiKey`) e gerar `connectToken`.
 *   2. Buscar contas (`GET /accounts?itemId=...`) e transações (`GET /transactions?accountId=...`).
 *   3. Limpar descrições bancárias brutas (ex.: "PIX ENVIADO - ", "COMPRA CARTAO DEBITO - ").
 *   4. Classificar automaticamente cada gasto/receita na categoria correta do usuário
 *      usando o histórico, regras aprendidas, CNAE/categoria do Open Finance e palavras-chave.
 *   5. Evitar duplicatas (idempotência por ID do Open Finance ou combinação data + valor + descrição).
 */

export const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
  itemId?: string;
}

export interface PluggyRawTransaction {
  id: string;
  description: string;
  descriptionRaw?: string | null;
  amount: number;
  date: string;
  type?: 'DEBIT' | 'CREDIT' | string;
  category?: string | null;
  status?: 'POSTED' | 'PENDING' | string;
  merchant?: {
    name?: string | null;
    businessName?: string | null;
    cnae?: string | null;
  } | null;
  paymentData?: {
    receiver?: { name?: string | null } | null;
    payer?: { name?: string | null } | null;
  } | null;
}

export interface PluggyAccountSummary {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface ClassifiedBankTransaction {
  externalId: string;
  type: TransactionType;
  amount: Money;
  description: string;
  rawDescription: string;
  categoryId: string;
  categoryName: string;
  segmentLabel: string;
  date: ISODate;
  alreadyImported: boolean;
}

/** Mapeamento das categorias padrão em inglês da Pluggy / Open Finance para palavras-chave em PT. */
const OPEN_FINANCE_CATEGORY_HINTS: Record<string, string> = {
  groceries: 'supermercado alimentacao',
  'eating out': 'restaurante alimentacao',
  restaurants: 'restaurante alimentacao',
  'food and drinks': 'alimentacao restaurante',
  delivery: 'ifood delivery alimentacao',
  supermarkets: 'supermercado alimentacao',
  bakery: 'padaria alimentacao',
  healthcare: 'saude farmacia medico',
  pharmacy: 'farmacia drogaria saude',
  pharmacies: 'farmacia drogaria saude',
  medical: 'medico consulta saude',
  dentist: 'dentista odonto saude',
  hospital: 'hospital clinica saude',
  transport: 'transporte uber combustivel',
  transportation: 'transporte uber combustivel',
  'gas stations': 'posto combustivel gasolina',
  fuel: 'combustivel posto gasolina',
  parking: 'estacionamento pedagio',
  taxi: 'uber 99pop taxi transporte',
  'public transit': 'onibus metro passagem transporte',
  automotive: 'oficina mecanico transporte',
  housing: 'moradia aluguel condominio',
  rent: 'aluguel moradia',
  utilities: 'energia luz agua gas internet moradia',
  electricity: 'energia conta de luz moradia',
  water: 'agua saneamento moradia',
  internet: 'internet fibra moradia',
  telecommunications: 'internet celular moradia',
  'home improvement': 'leroy merlin reforma construcao moradia',
  shopping: 'compras loja vestuario',
  clothing: 'roupa vestuario compras',
  electronics: 'eletronicos tecnologia computador celular',
  'digital services': 'assinatura streaming',
  subscriptions: 'assinatura netflix spotify',
  entertainment: 'lazer cinema show ingresso',
  leisure: 'lazer entretenimento viagem',
  travel: 'viagem hotel passagem lazer',
  hotels: 'hotel hospedagem lazer',
  education: 'educacao faculdade escola curso',
  bookstore: 'livraria papelaria educacao',
  'personal care': 'cuidados pessoais beleza farmacia',
  gyms: 'academia smartfit cuidados pessoais',
  gifts: 'presente floricultura chocolate',
  salary: 'salario pagamento',
  investments: 'investimento dividendo rendimento',
  freelance: 'freelance servico prestado',
};

const BANK_NOISE_PREFIXES: readonly RegExp[] = [
  /^pix\s+(?:enviado|recebido|transf|transferencia|qr\s*code)\s*[-:–]?\s*/i,
  /^transf(?:erencia)?\s+pix\s*[-:–]?\s*/i,
  /^compra\s+(?:com\s+)?(?:cartao\s+)?(?:de\s+)?(?:debito|credito|elo|visa|mastercard|maestro)\s*[-:–]?\s*/i,
  /^compra\s+no\s+(?:debito|credito)\s*[-:–]?\s*/i,
  /^pagamento\s+(?:de\s+)?(?:boleto|titulo|fatura|conta)\s*[-:–]?\s*/i,
  /^deb(?:ito)?\s+aut(?:omatico)?\s*[-:–]?\s*/i,
  /^ted\s+(?:enviada|recebida)\s*[-:–]?\s*/i,
  /^doc\s+(?:enviado|recebido)\s*[-:–]?\s*/i,
  /^pgto\s*[-:–]?\s*/i,
  /^cp\s*:\s*\d+\s*[-:–]?\s*/i,
];

/**
 * Remove prefixos bancários ruidosos ("PIX ENVIADO - ", "COMPRA CARTAO DEBITO - ")
 * e códigos numéricos de terminal para deixar a descrição limpa e legível.
 */
export function cleanOpenFinanceDescription(raw: string, merchantName?: string | null): string {
  if (merchantName && merchantName.trim().length >= 2) {
    return merchantName.trim().slice(0, DESCRIPTION_MAX_LENGTH);
  }

  let cleaned = raw.trim();
  for (const regex of BANK_NOISE_PREFIXES) {
    cleaned = cleaned.replace(regex, '');
  }

  // Remove datas curtas no início do histórico bancário (ex.: "04/11 18:30 SUPERMERCADO")
  cleaned = cleaned.replace(/^\d{2}\/\d{2}(?:\s+\d{2}:\d{2})?\s*[-:–]?\s*/, '');
  // Remove sufixo CNPJ ou números longos de documento
  cleaned = cleaned
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '')
    .replace(/\s+\b(LTDA|S\.?A\.?|S\/A|EIRELI|ME|EPP)\b\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) {
    return raw.trim().slice(0, DESCRIPTION_MAX_LENGTH) || 'Movimentação Bancária';
  }
  return cleaned.slice(0, DESCRIPTION_MAX_LENGTH);
}

/**
 * Verifica se uma transação do banco já foi importada anteriormente no Smart Wallet.
 */
export function isDuplicateBankTransaction(params: {
  externalId: string;
  date: ISODate;
  amountCents: number;
  description: string;
  type: TransactionType;
  accountId: string;
  existingTransactions: ReadonlyArray<Transaction>;
  importedExternalIds?: ReadonlySet<string>;
}): boolean {
  const {
    externalId,
    date,
    amountCents,
    description,
    type,
    accountId,
    existingTransactions,
    importedExternalIds,
  } = params;

  if (externalId && importedExternalIds?.has(externalId)) {
    return true;
  }

  const normDesc = normalizeText(description);
  return existingTransactions.some(
    (tx) =>
      tx.accountId === accountId &&
      tx.type === type &&
      tx.date === date &&
      tx.amount.cents === amountCents &&
      normalizeText(tx.description ?? '') === normDesc,
  );
}

/**
 * Converte e classifica uma lista de transações brutas do Open Finance (Pluggy)
 * em transações prontas para o Smart Wallet.
 */
export function classifyPluggyTransactions(params: {
  rawTransactions: ReadonlyArray<PluggyRawTransaction>;
  targetAccountId: string;
  categories: Category[];
  existingTransactions: ReadonlyArray<Transaction>;
  learnedRules?: LearnedCategoryRules;
  importedExternalIds?: ReadonlySet<string>;
  today: ISODate;
}): ClassifiedBankTransaction[] {
  const {
    rawTransactions,
    targetAccountId,
    categories,
    existingTransactions,
    learnedRules,
    importedExternalIds,
    today: maxDate,
  } = params;

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const results: ClassifiedBankTransaction[] = [];

  for (const raw of rawTransactions) {
    if (raw.status === 'PENDING') continue;
    const cents = Math.round(Math.abs(raw.amount) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) continue;

    const upperType = (raw.type ?? '').toUpperCase();
    const isExpense =
      upperType === 'DEBIT' || (upperType !== 'CREDIT' && raw.amount < 0);
    const txType: TransactionType = isExpense ? 'expense' : 'income';

    const merchantHint =
      raw.merchant?.name ||
      raw.merchant?.businessName ||
      (isExpense ? raw.paymentData?.receiver?.name : raw.paymentData?.payer?.name) ||
      null;

    const description = cleanOpenFinanceDescription(raw.description || '', merchantHint);

    const rawDateSlice = typeof raw.date === 'string' ? raw.date.slice(0, 10) : '';
    const date: ISODate =
      isValidISODate(rawDateSlice) && rawDateSlice <= maxDate ? rawDateSlice : maxDate;

    const categoryHintKey = (raw.category ?? '').trim().toLowerCase();
    const translatedHint = OPEN_FINANCE_CATEGORY_HINTS[categoryHintKey] ?? raw.category ?? '';

    let categoryId: string;
    let segmentLabel: string;

    if (txType === 'expense') {
      const resolved = resolveReceiptSegmentAndCategory({
        merchant: description,
        fullText: `${raw.description ?? ''} ${raw.descriptionRaw ?? ''} ${translatedHint}`,
        hintSegment: raw.category ?? undefined,
        categories,
        learnedRules,
        history: existingTransactions,
      });
      categoryId = resolved.categoryId ?? 'cat-other';
      segmentLabel = resolved.segmentLabel;
    } else {
      const incomeSuggestion = suggestCategory({
        description: `${description} ${raw.description ?? ''} ${translatedHint}`,
        type: 'income',
        categories,
        learnedRules,
        history: existingTransactions,
      });
      const fallbackIncome =
        categories.find((c) => c.id === OTHER_INCOME_CATEGORY_ID && c.archivedAt === null) ??
        categories.find((c) => c.type === 'income' && c.archivedAt === null);
      categoryId = incomeSuggestion?.categoryId ?? fallbackIncome?.id ?? OTHER_INCOME_CATEGORY_ID;
      segmentLabel = categoryById.get(categoryId)?.name ?? 'Receita';
    }

    const cat = categoryById.get(categoryId);
    const alreadyImported = isDuplicateBankTransaction({
      externalId: raw.id,
      date,
      amountCents: cents,
      description,
      type: txType,
      accountId: targetAccountId,
      existingTransactions,
      importedExternalIds,
    });

    results.push({
      externalId: raw.id,
      type: txType,
      amount: Money.fromCents(cents),
      description,
      rawDescription: raw.description,
      categoryId,
      categoryName: cat?.name ?? segmentLabel,
      segmentLabel,
      date,
      alreadyImported,
    });
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Converte um item já classificado em `TransactionDraft` para ser validado e persistido.
 */
export function toTransactionDraft(
  item: ClassifiedBankTransaction,
  accountId: string,
): TransactionDraft {
  return {
    type: item.type,
    amount: item.amount,
    description: item.description,
    categoryId: item.categoryId,
    accountId,
    date: item.date,
  };
}

/**
 * Autentica na API Pluggy (`POST /auth`) e retorna o `apiKey` temporário.
 */
export async function authenticatePluggy(params: {
  clientId: string;
  clientSecret: string;
  fetchFn?: typeof fetch;
}): Promise<Result<string, string>> {
  const clientId = params.clientId.trim();
  const clientSecret = params.clientSecret.trim();
  if (!clientId || !clientSecret) {
    return fail('Informe o Client ID e o Client Secret da Pluggy (Open Finance)');
  }

  const fetchImpl = params.fetchFn ?? fetch;
  try {
    const res = await fetchImpl(`${PLUGGY_BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const data = (await res.json()) as { apiKey?: string; message?: string };
    if (!res.ok || !data.apiKey) {
      return fail(data?.message || `Falha na autenticação Pluggy (HTTP ${res.status})`);
    }
    return ok(data.apiKey);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Erro de conexão com a API Pluggy');
  }
}

/**
 * Cria um `connectToken` (`POST /connect_token`) para abrir o widget Pluggy Connect no navegador.
 */
export async function createPluggyConnectToken(params: {
  apiKey: string;
  fetchFn?: typeof fetch;
}): Promise<Result<string, string>> {
  const fetchImpl = params.fetchFn ?? fetch;
  try {
    const res = await fetchImpl(`${PLUGGY_BASE_URL}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': params.apiKey,
      },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { accessToken?: string; message?: string };
    if (!res.ok || !data.accessToken) {
      return fail(data?.message || `Não foi possível gerar o Connect Token (HTTP ${res.status})`);
    }
    return ok(data.accessToken);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Erro ao gerar Connect Token da Pluggy');
  }
}

/**
 * Busca todas as transações das contas vinculadas a um `itemId` na Pluggy (`GET /accounts` + `GET /transactions`).
 */
export async function fetchPluggyItemTransactions(params: {
  clientId: string;
  clientSecret: string;
  itemId: string;
  from?: ISODate;
  to?: ISODate;
  fetchFn?: typeof fetch;
}): Promise<Result<PluggyRawTransaction[], string>> {
  const { clientId, clientSecret, itemId, from, to, fetchFn = fetch } = params;
  const cleanItemId = itemId.trim();
  if (!cleanItemId) {
    return fail('Informe o Item ID da conexão bancária na Pluggy');
  }

  const authRes = await authenticatePluggy({ clientId, clientSecret, fetchFn });
  if (!authRes.ok) return authRes;
  const apiKey = authRes.value;

  try {
    const accRes = await fetchFn(
      `${PLUGGY_BASE_URL}/accounts?itemId=${encodeURIComponent(cleanItemId)}`,
      {
        method: 'GET',
        headers: { 'X-API-KEY': apiKey },
      },
    );
    const accData = (await accRes.json()) as {
      results?: PluggyAccountSummary[];
      message?: string;
    };
    if (!accRes.ok || !accData.results) {
      return fail(
        accData?.message || `Não foi possível listar contas do Item ID (HTTP ${accRes.status})`,
      );
    }

    if (accData.results.length === 0) {
      return fail('Nenhuma conta encontrada para este Item ID no Open Finance');
    }

    const allTransactions: PluggyRawTransaction[] = [];
    for (const acc of accData.results) {
      const query = new URLSearchParams({
        accountId: acc.id,
        pageSize: '100',
      });
      if (from) query.set('from', from);
      if (to) query.set('to', to);

      const txRes = await fetchFn(`${PLUGGY_BASE_URL}/transactions?${query.toString()}`, {
        method: 'GET',
        headers: { 'X-API-KEY': apiKey },
      });
      const txData = (await txRes.json()) as { results?: PluggyRawTransaction[] };
      if (txRes.ok && Array.isArray(txData.results)) {
        allTransactions.push(...txData.results);
      }
    }

    return ok(allTransactions);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Falha ao buscar transações no Open Finance');
  }
}

/**
 * Gera um lote realista de transações do Open Finance Brasil (Sandbox) para o usuário
 * testar imediatamente a classificação e importação automática no celular.
 */
export function buildSampleOpenFinanceTransactions(referenceDate: ISODate): PluggyRawTransaction[] {
  return [
    {
      id: `of-sample-1-${referenceDate}`,
      description: 'PIX ENVIADO - SUPERMERCADO PAO DE ACUCAR LTDA',
      amount: -184.9,
      date: `${referenceDate}T14:20:00.000Z`,
      type: 'DEBIT',
      category: 'Groceries',
      status: 'POSTED',
      merchant: { name: 'Pão de Açúcar' },
    },
    {
      id: `of-sample-2-${referenceDate}`,
      description: 'COMPRA CARTAO DEBITO - AUTO POSTO IPIRANGA',
      amount: -210.0,
      date: `${referenceDate}T11:10:00.000Z`,
      type: 'DEBIT',
      category: 'Gas Stations',
      status: 'POSTED',
      merchant: { name: 'Posto Ipiranga' },
    },
    {
      id: `of-sample-3-${referenceDate}`,
      description: 'COMPRA NO DEBITO - DROGASIL S/A',
      amount: -64.5,
      date: `${referenceDate}T09:45:00.000Z`,
      type: 'DEBIT',
      category: 'Pharmacies',
      status: 'POSTED',
      merchant: { name: 'Drogasil' },
    },
    {
      id: `of-sample-4-${referenceDate}`,
      description: 'COMPRA CARTAO DEBITO - IFOOD *RESTAURANTE',
      amount: -58.9,
      date: `${referenceDate}T20:15:00.000Z`,
      type: 'DEBIT',
      category: 'Eating Out',
      status: 'POSTED',
      merchant: { name: 'iFood Restaurante' },
    },
    {
      id: `of-sample-5-${referenceDate}`,
      description: 'DEB AUTOMATICO - NETFLIX.COM',
      amount: -55.9,
      date: `${referenceDate}T08:00:00.000Z`,
      type: 'DEBIT',
      category: 'Subscriptions',
      status: 'POSTED',
      merchant: { name: 'Netflix' },
    },
  ];
}
