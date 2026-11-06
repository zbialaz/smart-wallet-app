import type { Account } from '@/domains/accounts/account';
import { suggestCategory, type LearnedCategoryRules } from '@/domains/categories/auto-classify';
import type { Category } from '@/domains/categories/category';
import { resolveReceiptSegmentAndCategory } from '@/domains/transactions/receipt-scanner';
import type { Transaction } from '@/domains/transactions/transaction';
import { addDays, parseDateBR, type ISODate } from '@/shared/date';
import { Money } from '@/shared/money';
import type { TransactionType } from '@/shared/transaction-type';

/**
 * Lançamento Rápido por Linguagem Natural ("Modo Pierre").
 *
 * Permite que o usuário digite ou dite uma frase curta como:
 *   - "45,90 iFood no Nubank"
 *   - "Gastei R$ 32,50 com Uber ontem pelo Itaú"
 *   - "Recebi 4500 de salário no Banco do Brasil"
 *   - "Netflix 55,90 recorrente"
 *
 * E extrai instantaneamente (100% determinístico e offline):
 *   - `type`: 'expense' | 'income'
 *   - `amount`: `Money`
 *   - `description`: nome limpo do estabelecimento/motivo
 *   - `categoryId`: categoria sugerida
 *   - `accountId`: conta bancária reconhecida pelo nome/apelido
 *   - `date`: data resolvida (hoje, ontem, anteontem ou DD/MM/AAAA)
 *   - `isRecurring`: se mencionou recorrência/assinatura mensal
 */
export interface QuickEntryParsed {
  type: TransactionType;
  amount: Money | null;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  date: ISODate;
  isRecurring: boolean;
}

const INCOME_KEYWORDS = [
  'recebi',
  'ganhei',
  'entrou',
  'depositaram',
  'salario',
  'salário',
  'freelance',
  'freela',
  'dividendo',
  'dividendos',
  'rendimento',
  'reembolso',
  'pix recebido',
  'transferencia recebida',
  'received',
  'salary',
  'recibi',
  'sueldo',
];

const RECURRING_KEYWORDS = [
  'recorrente',
  'mensal',
  'todo mes',
  'todo mês',
  'assinatura',
  'recurring',
  'monthly',
  'mensual',
];

const BANK_ALIASES: Record<string, string[]> = {
  nubank: ['nubank', 'nu ', 'roxinho'],
  itau: ['itau', 'itaú'],
  'banco do brasil': ['banco do brasil', 'bb'],
  bradesco: ['bradesco'],
  santander: ['santander'],
  inter: ['banco inter', 'inter'],
  caixa: ['caixa', 'cef'],
  c6: ['c6 bank', 'c6'],
  picpay: ['picpay'],
  mercadopago: ['mercado pago', 'mercadopago'],
  btg: ['btg'],
  sicredi: ['sicredi'],
  sicoob: ['sicoob'],
  carteira: ['carteira', 'dinheiro', 'especie', 'espécie', 'wallet', 'cash'],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrai o primeiro valor monetário válido da frase, ignorando datas (ex.: "15/05")
 * e dias isolados precedidos por "dia" (ex.: "dia 10").
 */
export function extractMoneyFromPhrase(raw: string): {
  amount: Money | null;
  matchedToken: string | null;
} {
  // Remove datas DD/MM/YYYY ou DD/MM temporariamente para não confundir com números
  const maskedDates = raw.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ');
  const maskedDays = maskedDates.replace(/\bdia\s+\d{1,2}\b/gi, ' ');

  // Procura padrões como "R$ 1.234,56", "45,90", "45.90", "1.200", "150"
  const regex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+[.,]\d{1,2}|\d{1,6})\b/i;
  const match = regex.exec(maskedDays);
  if (!match) return { amount: null, matchedToken: null };

  const fullMatch = match[0];
  const numberPart = match[1];

  let normalizedNumber: string;
  if (numberPart.includes(',') && numberPart.includes('.')) {
    // 1.234,56 -> 1234.56
    normalizedNumber = numberPart.replace(/\./g, '').replace(',', '.');
  } else if (numberPart.includes(',')) {
    // 45,9 -> 45.90 | 45,90 -> 45.90
    normalizedNumber = numberPart.replace(',', '.');
  } else {
    normalizedNumber = numberPart;
  }

  const parsedFloat = Number(normalizedNumber);
  if (!Number.isFinite(parsedFloat) || parsedFloat <= 0) {
    return { amount: null, matchedToken: null };
  }

  const cents = Math.round(parsedFloat * 100);
  return {
    amount: Money.fromCents(cents),
    matchedToken: fullMatch,
  };
}

/**
 * Identifica se o usuário mencionou alguma das contas cadastradas na frase
 * (ex.: "no Nubank", "pelo Itaú", "no BB", "na Carteira").
 */
export function matchAccountInPhrase(
  raw: string,
  accounts: ReadonlyArray<Account>,
): { accountId: string | null; matchedFragments: string[] } {
  if (accounts.length === 0) return { accountId: null, matchedFragments: [] };

  const normPhrase = normalizeText(raw);

  // 1. Tenta casar pelo nome exato da conta cadastrada (do maior para o menor nome)
  const sortedAccounts = [...accounts].sort((a, b) => b.name.length - a.name.length);
  for (const acc of sortedAccounts) {
    const normAccName = normalizeText(acc.name);
    if (!normAccName) continue;
    const wordBoundary = new RegExp(`(?:^|\\s|[.,;/-])${escapeRegex(normAccName)}(?:$|\\s|[.,;/-])`, 'i');
    if (wordBoundary.test(` ${normPhrase} `)) {
      return { accountId: acc.id, matchedFragments: [acc.name, normAccName] };
    }
  }

  // 2. Tenta casar por apelidos conhecidos de bancos (ex.: "bb" -> conta "Banco do Brasil")
  for (const acc of sortedAccounts) {
    const normAccName = normalizeText(acc.name);
    for (const [canonical, aliases] of Object.entries(BANK_ALIASES)) {
      const accountMatchesCanonical =
        normAccName.includes(canonical) || aliases.some((a) => normAccName.includes(a.trim()));
      if (!accountMatchesCanonical) continue;

      for (const alias of aliases) {
        const cleanAlias = alias.trim();
        const aliasRegex = new RegExp(
          `(?:^|\\s)(?:no|na|pelo|pela|via|do|da|em|cart[aã]o|conta)?\\s*${escapeRegex(cleanAlias)}(?:$|\\s|[.,;/-])`,
          'i',
        );
        if (aliasRegex.test(` ${normPhrase} `)) {
          return { accountId: acc.id, matchedFragments: [cleanAlias, acc.name] };
        }
      }
    }
  }

  return { accountId: null, matchedFragments: [] };
}

function cleanDescriptionFromPhrase(params: {
  raw: string;
  matchedAmountToken: string | null;
  matchedAccountFragments: string[];
}): string {
  let working = params.raw;

  // Remove o token do valor monetário
  if (params.matchedAmountToken) {
    working = working.replace(params.matchedAmountToken, ' ');
  }

  // Remove datas explícitas DD/MM/AAAA
  working = working.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ');

  // Remove referências à conta bancária (suportando acentos como "Itaú" onde \b falha no fim da palavra)
  for (const frag of params.matchedAccountFragments) {
    if (!frag) continue;
    const reg = new RegExp(
      `(?:^|\\s)(?:(?:no|na|pelo|pela|via|do|da|em|conta|cart[aã]o)\\s+)?${escapeRegex(frag)}(?=$|\\s|[.,;/-])`,
      'gi',
    );
    working = working.replace(reg, ' ');
  }

  // Remove verbos de abertura e palavras de ruído comuns em frases faladas/digitadas
  const noisePatterns = [
    /\b(?:gastei|paguei|comprei|passei|torrei|custou|foi|deu|recebi|ganhei|entrou|depositaram)\b/gi,
    /\b(?:r\$|reais|real|conto|contos|pila|pilas)\b/gi,
    /\b(?:hoje|ontem|anteontem|yesterday|today|ayer|recorrente|mensal|todo\s+m[eê]s)\b/gi,
    /\b(?:no\s+cart[aã]o|no\s+cr[eé]dito|no\s+d[eé]bito|no\s+pix|via\s+pix|pelo\s+pix)\b/gi,
  ];
  for (const pattern of noisePatterns) {
    working = working.replace(pattern, ' ');
  }

  // Remove preposições soltas no começo ou no fim da descrição
  working = working.replace(/\s+/g, ' ').trim();
  working = working
    .replace(/^(?:de|do|da|dos|das|no|na|nos|nas|em|com|para|por|pelo|pela|um|uma)\s+/i, '')
    .replace(/\s+(?:de|do|da|no|na|em|com|para|por|pelo|pela)$/i, '')
    .trim();

  // Capitaliza a primeira letra se a descrição começar com minúscula
  if (working.length > 0) {
    working = working.charAt(0).toUpperCase() + working.slice(1);
  }

  return working;
}

export function parseQuickEntry(params: {
  text: string;
  accounts: ReadonlyArray<Account>;
  categories: Category[];
  learnedRules?: LearnedCategoryRules;
  history?: ReadonlyArray<Transaction>;
  today: ISODate;
}): QuickEntryParsed | null {
  const raw = params.text.trim();
  if (!raw) return null;

  const norm = normalizeText(raw);

  // 1. Tipo (Gasto vs Receita)
  const isIncome = INCOME_KEYWORDS.some((kw) => norm.includes(normalizeText(kw)));
  const type: TransactionType = isIncome ? 'income' : 'expense';

  // 2. Valor monetário
  const { amount, matchedToken } = extractMoneyFromPhrase(raw);

  // 3. Conta bancária mencionada
  const { accountId, matchedFragments } = matchAccountInPhrase(raw, params.accounts);

  // 4. Data (hoje / ontem / anteontem / DD/MM/AAAA)
  let date: ISODate = params.today;
  const explicitDateMatch = /\b(\d{2}\/\d{2}\/\d{4})\b/.exec(raw);
  if (explicitDateMatch) {
    const parsed = parseDateBR(explicitDateMatch[1]);
    if (parsed) date = parsed;
  } else if (/\banteontem\b/i.test(norm)) {
    date = addDays(params.today, -2);
  } else if (/\b(?:ontem|yesterday|ayer)\b/i.test(norm)) {
    date = addDays(params.today, -1);
  }

  // 5. Recorrência
  const isRecurring = RECURRING_KEYWORDS.some((kw) => norm.includes(normalizeText(kw)));

  // 6. Descrição limpa
  const description = cleanDescriptionFromPhrase({
    raw,
    matchedAmountToken: matchedToken,
    matchedAccountFragments: matchedFragments,
  });

  // 7. Categoria sugerida (combina auto-classify + regras de segmento de notas fiscais)
  const searchTarget = description || raw;
  const suggestion = suggestCategory({
    description: searchTarget,
    type,
    categories: params.categories,
    learnedRules: params.learnedRules,
    history: params.history,
  });

  let categoryId = suggestion?.categoryId ?? null;
  if (!categoryId && type === 'expense') {
    const resolved = resolveReceiptSegmentAndCategory({
      merchant: searchTarget,
      fullText: raw,
      categories: params.categories,
      learnedRules: params.learnedRules,
      history: params.history,
    });
    categoryId = resolved.categoryId;
  }

  return {
    type,
    amount,
    description,
    categoryId,
    accountId,
    date,
    isRecurring,
  };
}
