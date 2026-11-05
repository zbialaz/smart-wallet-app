import {
  suggestCategory,
  type LearnedCategoryRules,
} from '@/domains/categories/auto-classify';
import type { Category } from '@/domains/categories/category';
import { GEMINI_ENDPOINT } from '@/domains/insights/gemini-advisor';
import { isValidISODate, parseDateBR, type ISODate } from '@/shared/date';
import { Money } from '@/shared/money';
import { fail, ok, type Result } from '@/shared/result';
import { normalizeText } from '@/shared/text';

import { DESCRIPTION_MAX_LENGTH, type Transaction } from './transaction';

/**
 * Leitor Inteligente de Nota Fiscal / Cupom Fiscal (NFC-e, SAT, DANFE ou comprovante).
 *
 * Responsabilidades:
 *   1. Identificar o VALOR TOTAL (`amount`) da nota/cupom
 *   2. Identificar o ESTABELECIMENTO / DESCRIÇÃO (`merchant`)
 *   3. Identificar o SEGMENTO (`segmentLabel`) e mapear para a CATEGORIA de gasto (`categoryId`)
 *   4. Extrair a DATA (`date`), quando presente e válida
 *
 * Funciona em dois modos complementares:
 *   - `analyzeReceiptWithGemini`: Visão Multimodal (`gemini-3.8-flash`) para foto/imagem da nota ou texto
 *   - `parseReceiptText`: Motor determinístico local (offline) para texto colado de cupom/NFC-e/notificação
 */
export interface ReceiptScanResult {
  amount: Money;
  merchant: string;
  segmentLabel: string;
  categoryId: string | null;
  date: ISODate | null;
  source: 'gemini' | 'local';
}

interface SegmentRule {
  categoryId: string;
  segmentLabel: string;
  keywords: readonly string[];
}

const RECEIPT_SEGMENT_RULES: readonly SegmentRule[] = [
  {
    categoryId: 'cat-food',
    segmentLabel: 'Alimentação / Supermercado',
    keywords: [
      'supermercado', 'mercado', 'atacadao', 'assai', 'carrefour', 'pao de acucar',
      'extra hiper', 'zaffari', 'condor', 'angeloni', 'muffato', 'guanabara', 'mundial',
      'hortifruti', 'sacolao', 'acougue', 'padaria', 'panificadora', 'confeitaria',
      'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'churrascaria', 'cafeteria',
      'ifood', 'rappi', 'mcdonalds', 'outback', 'starbucks', 'burger king', 'refeicao',
      'alimentos', 'mercearia', 'bebidas', 'arroz', 'feijao', 'leite', 'pao frances',
      'file de frango', 'contra file', 'horti', 'supermarket', 'grocery', 'bakery',
    ],
  },
  {
    categoryId: 'cat-health',
    segmentLabel: 'Saúde / Farmácia',
    keywords: [
      'farmacia', 'drogaria', 'drogasil', 'droga raia', 'raia drogasil', 'pague menos',
      'panvel', 'araujo', 'ultrafarma', 'sao paulo drogaria', 'nissei', 'venancio',
      'medicamento', 'remedio', 'dipirona', 'paracetamol', 'ibuprofeno', 'amoxicilina',
      'consulta', 'clinica', 'hospital', 'laboratorio', 'exame', 'odonto', 'dentista',
      'otica', 'pharmacy', 'drugstore', 'medical',
    ],
  },
  {
    categoryId: 'cat-transport',
    segmentLabel: 'Transporte / Combustível',
    keywords: [
      'posto', 'auto posto', 'combustivel', 'combustiveis', 'gasolina', 'etanol', 'diesel',
      'gnv', 'ipiranga', 'shell', 'petrobras', 'br distribuidora', 'ale combustiveis',
      'estacionamento', 'park', 'indigo', 'estapar', 'pedagio', 'sem parar', 'veloe',
      'conectcar', 'uber', '99pop', 'cabify', 'oficina', 'autocenter', 'pneu', 'troca de oleo',
      'passagem', 'rodoviaria', 'fuel', 'gas station', 'parking',
    ],
  },
  {
    categoryId: 'cat-home',
    segmentLabel: 'Moradia / Casa',
    keywords: [
      'leroy merlin', 'telhanorte', 'dicico', 'cassol', 'ferreira costa', 'obrashow',
      'material de construcao', 'tintas', 'ferragens', 'elétrica', 'hidraulica',
      'enel', 'cpfl', 'cemig', 'copel', 'celesc', 'neoenergia', 'light', 'sabesp',
      'sanepar', 'copasa', 'comgas', 'ultragaz', 'supergasbras', 'energia eletrica',
      'saneamento', 'condominio', 'aluguel', 'lavanderia',
    ],
  },
  {
    categoryId: 'cat-shopping',
    segmentLabel: 'Compras / Varejo',
    keywords: [
      'renner', 'lojas renner', 'riachuelo', 'cea', 'c&a', 'zara', 'hering', 'marisa',
      'centauro', 'decathlon', 'nike', 'adidas', 'arezzo', 'schutz', 'magazine luiza',
      'magalu', 'casas bahia', 'ponto frio', 'lojas americanas', 'americanas', 'shopee',
      'mercado livre', 'amazon', 'shein', 'vestuario', 'calcados', 'roupas', 'confecoes',
      'departamento', 'bazar', 'utilidades domesticas', 'shopping',
    ],
  },
  {
    categoryId: 'cat-tech',
    segmentLabel: 'Tecnologia / Eletrônicos',
    keywords: [
      'kabum', 'pichau', 'terabyte', 'kalunga', 'fast shop', 'iplace', 'apple', 'samsung',
      'xiaomi', 'informatica', 'eletronicos', 'computador', 'notebook', 'celular',
      'smartphone', 'teclado', 'mouse', 'monitor', 'ssd', 'headset', 'carregador',
    ],
  },
  {
    categoryId: 'cat-personal-care',
    segmentLabel: 'Cuidados Pessoais / Beleza',
    keywords: [
      'boticario', 'o boticario', 'natura', 'eudora', 'sephora', 'epocacosmeticos',
      'perfumaria', 'cosmeticos', 'barbearia', 'salao de beleza', 'cabeleireiro',
      'estetica', 'academia', 'smartfit', 'smart fit', 'bluefit', 'bodytech',
    ],
  },
  {
    categoryId: 'cat-education',
    segmentLabel: 'Educação / Papelaria',
    keywords: [
      'livraria', 'papelaria', 'saraiva', 'cultura', 'leitura', 'livro', 'apostila',
      'material escolar', 'faculdade', 'universidade', 'escola', 'colegio', 'curso',
    ],
  },
  {
    categoryId: 'cat-leisure',
    segmentLabel: 'Lazer / Entretenimento',
    keywords: [
      'cinema', 'cinemark', 'kinoplex', 'uci', 'ingresso', 'sympla', 'eventim',
      'teatro', 'show', 'bar', 'pub', 'choperia', 'cervejaria', 'hotel', 'pousada',
      'parque', 'boliche',
    ],
  },
  {
    categoryId: 'cat-gifts',
    segmentLabel: 'Presentes / Chocolates',
    keywords: [
      'cacau show', 'kopenhagen', 'lindt', 'brasil cacau', 'floricultura', 'presentes',
      'brinquedos', 'ri happy', 'pbkids',
    ],
  },
];

const DEFAULT_SEGMENT_BY_CATEGORY: Record<string, string> = {
  'cat-food': 'Alimentação',
  'cat-transport': 'Transporte',
  'cat-home': 'Moradia',
  'cat-health': 'Saúde',
  'cat-education': 'Educação',
  'cat-leisure': 'Lazer',
  'cat-shopping': 'Compras',
  'cat-subscriptions': 'Assinaturas',
  'cat-personal-care': 'Cuidados Pessoais',
  'cat-tech': 'Tecnologia',
  'cat-gifts': 'Presentes',
  'cat-other': 'Outros',
};

/**
 * Identifica o segmento e a categoria de gasto a partir do nome do estabelecimento,
 * texto da nota fiscal e categorias ativas do usuário.
 */
export function resolveReceiptSegmentAndCategory(params: {
  merchant: string;
  fullText?: string;
  hintSegment?: string;
  hintCategoryId?: string | null;
  categories: Category[];
  learnedRules?: LearnedCategoryRules;
  history?: ReadonlyArray<Pick<Transaction, 'description' | 'categoryId' | 'type'>>;
}): { categoryId: string | null; segmentLabel: string } {
  const {
    merchant,
    fullText = '',
    hintSegment,
    hintCategoryId,
    categories,
    learnedRules,
    history,
  } = params;

  const activeExpenseCategories = categories.filter(
    (c) => c.type === 'expense' && c.archivedAt === null,
  );
  const activeById = new Map(activeExpenseCategories.map((c) => [c.id, c]));

  // 1. Prioriza regras aprendidas do usuário ou histórico direto para o estabelecimento
  if (merchant.trim().length >= 2) {
    const suggestedFromMerchant = suggestCategory({
      description: merchant,
      type: 'expense',
      categories,
      learnedRules,
      history,
    });
    if (
      suggestedFromMerchant &&
      (suggestedFromMerchant.source === 'learned' || suggestedFromMerchant.source === 'history')
    ) {
      const cat = activeById.get(suggestedFromMerchant.categoryId);
      return {
        categoryId: suggestedFromMerchant.categoryId,
        segmentLabel:
          hintSegment?.trim() ||
          DEFAULT_SEGMENT_BY_CATEGORY[suggestedFromMerchant.categoryId] ||
          cat?.name ||
          'Gasto',
      };
    }
  }

  // 2. Se a IA já indicou um categoryId válido entre as categorias ativas do usuário
  if (hintCategoryId && activeById.has(hintCategoryId)) {
    const cat = activeById.get(hintCategoryId)!;
    return {
      categoryId: cat.id,
      segmentLabel:
        hintSegment?.trim() || DEFAULT_SEGMENT_BY_CATEGORY[cat.id] || cat.name,
    };
  }

  // 3. Procura nas regras de segmento de notas fiscais (merchant + segmento + texto completo)
  const combinedNorm = normalizeText(`${merchant} ${hintSegment ?? ''} ${fullText}`);
  for (const rule of RECEIPT_SEGMENT_RULES) {
    if (!activeById.has(rule.categoryId)) continue;
    for (const kw of rule.keywords) {
      const kwNorm = normalizeText(kw);
      if (kwNorm && combinedNorm.includes(kwNorm)) {
        return {
          categoryId: rule.categoryId,
          segmentLabel: hintSegment?.trim() || rule.segmentLabel,
        };
      }
    }
  }

  // 4. Usa o motor geral `suggestCategory` no texto combinado
  const fallbackSuggestion = suggestCategory({
    description: `${merchant} ${hintSegment ?? ''} ${fullText}`,
    type: 'expense',
    categories,
    learnedRules,
    history,
  });
  if (fallbackSuggestion && activeById.has(fallbackSuggestion.categoryId)) {
    const cat = activeById.get(fallbackSuggestion.categoryId)!;
    return {
      categoryId: cat.id,
      segmentLabel:
        hintSegment?.trim() || DEFAULT_SEGMENT_BY_CATEGORY[cat.id] || cat.name,
    };
  }

  // 5. Fallback para 'cat-other' (Outros) ou primeira categoria ativa de despesa
  const otherCat = activeById.get('cat-other') ?? activeExpenseCategories[0] ?? null;
  return {
    categoryId: otherCat?.id ?? null,
    segmentLabel: hintSegment?.trim() || otherCat?.name || 'Outros',
  };
}

/**
 * Converte uma string numérica de cupom fiscal ("1.234,56", "145,90", "89.90") em centavos.
 */
function parseMonetaryTokenToCents(token: string): number | null {
  const cleaned = token.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Ex.: "1.234,56" -> "1234.56" ou "1,234.56" -> "1234.56"
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  const match = /^(\d+)\.(\d{2})$/.exec(normalized);
  if (!match) return null;

  const cents = Number(match[1]) * 100 + Number(match[2]);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/**
 * Extrai o valor total em centavos de um texto de nota fiscal / cupom fiscal.
 */
export function extractReceiptAmount(rawText: string): Money | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Padrões prioritários de linha de TOTAL em cupons fiscais (NFC-e / SAT / comprovantes)
  const totalLineKeywords = [
    'valor a pagar',
    'valor total',
    'total a pagar',
    'total liquido',
    'valor pago',
    'vl total',
    'vlr total',
    'total r$',
    'total:',
    'total geral',
  ];

  const numberPattern = /(?:R\$\s*)?(\d{1,3}(?:[.\s]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/gi;

  for (const line of lines) {
    const normLine = normalizeText(line);
    // Ignora linhas de subtotal ou desconto para não confundir com o valor final
    if (normLine.includes('subtotal') || normLine.includes('desconto') || normLine.includes('troco')) {
      continue;
    }

    const isTotalLine =
      totalLineKeywords.some((kw) => normLine.includes(normalizeText(kw))) ||
      /^total\b/.test(normLine);

    if (isTotalLine) {
      const matches = [...line.matchAll(numberPattern)];
      if (matches.length > 0) {
        const lastToken = matches[matches.length - 1][1];
        const cents = parseMonetaryTokenToCents(lastToken);
        if (cents && cents > 0) {
          return Money.fromCents(cents);
        }
      }
    }
  }

  // Fallback 1: procura qualquer ocorrência explícita com cifrão "R$ 123,45" (exceto troco/desconto)
  const currencyCents: number[] = [];
  for (const line of lines) {
    const normLine = normalizeText(line);
    if (normLine.includes('troco') || normLine.includes('desconto') || normLine.includes('tributo')) {
      continue;
    }
    const rMatches = [...line.matchAll(/R\$\s*(\d{1,3}(?:[.\s]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/gi)];
    for (const m of rMatches) {
      const cents = parseMonetaryTokenToCents(m[1]);
      if (cents && cents > 0) currencyCents.push(cents);
    }
  }
  if (currencyCents.length > 0) {
    return Money.fromCents(Math.max(...currencyCents));
  }

  // Fallback 2: maior valor decimal com 2 casas no texto (excluindo linhas de tributos/troco)
  const allCents: number[] = [];
  for (const line of lines) {
    const normLine = normalizeText(line);
    if (normLine.includes('troco') || normLine.includes('tributo') || normLine.includes('ibpt')) {
      continue;
    }
    const matches = [...line.matchAll(numberPattern)];
    for (const m of matches) {
      const cents = parseMonetaryTokenToCents(m[1]);
      if (cents && cents > 0) allCents.push(cents);
    }
  }
  if (allCents.length > 0) {
    return Money.fromCents(Math.max(...allCents));
  }

  return null;
}

const IGNORED_HEADER_PATTERNS: readonly RegExp[] = [
  /^cupom\s+fiscal/i,
  /^nota\s+fiscal/i,
  /^danfe/i,
  /^documento\s+auxiliar/i,
  /^extrato\s+n/i,
  /^nfc-?e/i,
  /^sat\s+/i,
  /^cnpj/i,
  /^cpf/i,
  /^ie\s*:/i,
  /^im\s*:/i,
  /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/,
  /^(rua|av\.?|avenida|alameda|praca|rodovia|estrada|cep)\b/i,
  /^[-=*_.]{3,}$/,
  /^data\s*:/i,
  /^hora\s*:/i,
  /^item\s+cod/i,
  /^cod\s+desc/i,
  /^qtd\s+un/i,
  /^consumidor\b/i,
  /^chave\s+de\s+acesso/i,
  /^consulte\s+pela/i,
];

function cleanMerchantName(raw: string): string {
  return raw
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '')
    .replace(/\bCNPJ\s*:?\s*[\d./-]*/gi, '')
    .replace(/\s+\b(LTDA|S\.?A\.?|S\/A|EIRELI|ME|EPP|COMERCIO|INDUSTRIA)\b\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DESCRIPTION_MAX_LENGTH);
}

/**
 * Extrai o nome do estabelecimento a partir das linhas da nota fiscal.
 */
export function extractReceiptMerchant(rawText: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2);

  // 1. Procura rótulo explícito (ex.: "Estabelecimento: Supermercado X", "Emitente: ...")
  for (const line of lines) {
    const labeled = /^(?:estabelecimento|emitente|loja|razao\s+social|fantasia|comercio)\s*:\s*(.+)$/i.exec(
      line,
    );
    if (labeled && labeled[1].trim().length >= 2) {
      return cleanMerchantName(labeled[1]);
    }
  }

  // 2. Procura a primeira linha de cabeçalho que pareça nome de loja/estabelecimento
  for (const line of lines) {
    if (IGNORED_HEADER_PATTERNS.some((re) => re.test(line))) continue;
    // Ignora linhas que são apenas valores ou datas
    if (/^(?:R\$\s*)?[\d.,\s/-]+$/.test(line)) continue;
    if (/^(?:total|valor\s+a\s+pagar|valor\s+total|subtotal|troco|pagamento|cartao|pix)\b/i.test(line)) {
      continue;
    }

    const cleaned = cleanMerchantName(line);
    if (cleaned.length >= 2) {
      return cleaned;
    }
  }

  return 'Nota Fiscal';
}

/**
 * Extrai a data de emissão (`YYYY-MM-DD`) do texto da nota fiscal, se houver.
 */
export function extractReceiptDate(rawText: string, maxDate?: ISODate): ISODate | null {
  // 1. Formato brasileiro DD/MM/AAAA
  const brMatches = rawText.matchAll(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/g);
  for (const m of brMatches) {
    const parsed = parseDateBR(`${m[1]}/${m[2]}/${m[3]}`);
    if (parsed && (!maxDate || parsed <= maxDate)) {
      return parsed;
    }
  }

  // 2. Formato ISO AAAA-MM-DD
  const isoMatches = rawText.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g);
  for (const m of isoMatches) {
    if (isValidISODate(m[1]) && (!maxDate || m[1] <= maxDate)) {
      return m[1];
    }
  }

  return null;
}

/**
 * Faz a leitura local (100% offline e determinística) do texto de uma nota fiscal / cupom.
 */
export function parseReceiptText(params: {
  text: string;
  categories: Category[];
  learnedRules?: LearnedCategoryRules;
  history?: ReadonlyArray<Pick<Transaction, 'description' | 'categoryId' | 'type'>>;
  today?: ISODate;
}): Result<ReceiptScanResult, string> {
  const { text, categories, learnedRules, history, today: maxDate } = params;
  const trimmed = text.trim();
  if (!trimmed) {
    return fail('Cole ou informe o texto da nota fiscal para identificar os dados');
  }

  const amount = extractReceiptAmount(trimmed);
  if (!amount || !amount.isPositive()) {
    return fail('Não foi possível identificar o valor total na nota fiscal');
  }

  const merchant = extractReceiptMerchant(trimmed);
  const { categoryId, segmentLabel } = resolveReceiptSegmentAndCategory({
    merchant,
    fullText: trimmed,
    categories,
    learnedRules,
    history,
  });
  const date = extractReceiptDate(trimmed, maxDate);

  return ok({
    amount,
    merchant,
    segmentLabel,
    categoryId,
    date,
    source: 'local',
  });
}

interface GeminiReceiptRawJson {
  amountReais?: number | string;
  merchant?: string;
  segment?: string;
  categoryId?: string;
  date?: string | null;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Extrai e faz o parse seguro do JSON retornado pelo Gemini (mesmo se vier envolto em ```json ... ```).
 */
export function parseGeminiReceiptJson(rawText: string): GeminiReceiptRawJson | null {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const jsonBraceMatch = /\{[\s\S]*\}/.exec(cleaned);
  const candidate = jsonBraceMatch ? jsonBraceMatch[0] : cleaned;

  try {
    const parsed: unknown = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as GeminiReceiptRawJson;
  } catch {
    return null;
  }
}

/**
 * Analisa uma foto/imagem de nota fiscal (base64) ou texto usando o Google Gemini (`gemini-3.8-flash`).
 * Identifica o valor total, o nome do estabelecimento, o segmento e a categoria correspondente.
 */
export async function analyzeReceiptWithGemini(params: {
  apiKey: string;
  imageBase64?: string;
  mimeType?: string;
  receiptText?: string;
  categories: Category[];
  learnedRules?: LearnedCategoryRules;
  history?: ReadonlyArray<Pick<Transaction, 'description' | 'categoryId' | 'type'>>;
  today?: ISODate;
  fetchFn?: typeof fetch;
}): Promise<Result<ReceiptScanResult, string>> {
  const {
    apiKey,
    imageBase64,
    mimeType = 'image/jpeg',
    receiptText,
    categories,
    learnedRules,
    history,
    today: maxDate,
    fetchFn = fetch,
  } = params;

  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    // Se não há chave da IA mas há texto, usa o motor determinístico local
    if (receiptText?.trim()) {
      return parseReceiptText({
        text: receiptText,
        categories,
        learnedRules,
        history,
        today: maxDate,
      });
    }
    return fail('Configure sua chave da API do Google Gemini nas Configurações para ler fotos de notas fiscais');
  }

  if (!imageBase64 && !receiptText?.trim()) {
    return fail('Envie uma foto da nota fiscal ou cole o texto do comprovante');
  }

  const activeExpenseCategories = categories.filter(
    (c) => c.type === 'expense' && c.archivedAt === null,
  );
  const categoryOptionsText = activeExpenseCategories
    .map((c) => `- "${c.id}": ${c.name}`)
    .join('\n');

  const prompt = [
    'Você é um leitor especialista de Notas Fiscais, Cupons Fiscais (NFC-e / SAT / DANFE) e comprovantes de pagamento no Brasil e no mundo.',
    'Extraia os dados do comprovante e retorne APENAS um objeto JSON válido com as chaves exatas:',
    '{',
    '  "amountReais": number (valor total final pago, ex: 145.90),',
    '  "merchant": string (nome comercial limpo do estabelecimento, máx 50 caracteres),',
    '  "segment": string (segmento identificado, ex: "Supermercado", "Farmácia", "Posto de Combustível", "Restaurante"),',
    '  "categoryId": string (ID exato da categoria mais adequada da lista abaixo),',
    '  "date": string | null (data da compra no formato "YYYY-MM-DD" ou null se ilegível)',
    '}',
    '',
    'Categorias de gasto disponíveis (escolha o ID mais adequado para "categoryId"):',
    categoryOptionsText || '- "cat-other": Outros',
    receiptText?.trim() ? `\nTexto da nota fiscal:\n${receiptText.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: prompt }];

  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    });
  }

  try {
    const response = await fetchFn(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 320,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = (await response.json()) as GeminiApiResponse;
    if (!response.ok) {
      if (receiptText?.trim()) {
        return parseReceiptText({
          text: receiptText,
          categories,
          learnedRules,
          history,
          today: maxDate,
        });
      }
      return fail(data?.error?.message || `Erro HTTP ${response.status}`);
    }

    const rawOutput = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();

    if (!rawOutput) {
      return fail('Não foi possível extrair os dados da nota fiscal');
    }

    const parsed = parseGeminiReceiptJson(rawOutput);
    if (!parsed) {
      if (receiptText?.trim()) {
        return parseReceiptText({
          text: receiptText,
          categories,
          learnedRules,
          history,
          today: maxDate,
        });
      }
      return fail('Não foi possível interpretar os dados da nota fiscal');
    }

    let cents = 0;
    if (typeof parsed.amountReais === 'number' && Number.isFinite(parsed.amountReais)) {
      cents = Math.round(parsed.amountReais * 100);
    } else if (typeof parsed.amountReais === 'string') {
      const fromToken = parseMonetaryTokenToCents(parsed.amountReais);
      if (fromToken) cents = fromToken;
    }

    if (cents <= 0) {
      return fail('Não foi possível identificar um valor positivo na nota fiscal');
    }

    const amount = Money.fromCents(cents);
    const merchant = cleanMerchantName(parsed.merchant || 'Nota Fiscal') || 'Nota Fiscal';
    const { categoryId, segmentLabel } = resolveReceiptSegmentAndCategory({
      merchant,
      fullText: receiptText,
      hintSegment: parsed.segment,
      hintCategoryId: parsed.categoryId,
      categories,
      learnedRules,
      history,
    });

    let validDate: ISODate | null = null;
    if (typeof parsed.date === 'string' && isValidISODate(parsed.date)) {
      if (!maxDate || parsed.date <= maxDate) {
        validDate = parsed.date;
      }
    }

    return ok({
      amount,
      merchant,
      segmentLabel,
      categoryId,
      date: validDate,
      source: 'gemini',
    });
  } catch (err) {
    if (receiptText?.trim()) {
      return parseReceiptText({
        text: receiptText,
        categories,
        learnedRules,
        history,
        today: maxDate,
      });
    }
    return fail(err instanceof Error ? err.message : 'Falha ao analisar a nota fiscal');
  }
}
