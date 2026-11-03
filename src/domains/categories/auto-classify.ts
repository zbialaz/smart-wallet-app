import type { Transaction } from '@/domains/transactions/transaction';
import { normalizeText } from '@/shared/text';
import type { TransactionType } from '@/shared/transaction-type';

import type { Category } from './category';

/**
 * US-016 — Classificação automática de gastos e receitas.
 *
 * Ordem de prioridade da sugestão (100% determinística e offline):
 *   1. `learned`: correções aprendidas explicitamente do próprio usuário (US-016.3)
 *   2. `history`: transações anteriores do usuário com a mesma descrição
 *   3. `keyword`: nome da própria categoria (inclui personalizadas) ou dicionário de palavras-chave
 */
export type SuggestionSource = 'learned' | 'history' | 'keyword';

export interface CategorySuggestion {
  categoryId: string;
  source: SuggestionSource;
}

/** Mapa `"${type}:${normalizedDescription}"` → `categoryId`. */
export type LearnedCategoryRules = Record<string, string>;

const MIN_DESCRIPTION_LENGTH = 2;

const EXPENSE_KEYWORDS: ReadonlyArray< readonly [string, readonly string[]] > = [
  [
    'cat-subscriptions',
    [
      'netflix', 'spotify', 'disney', 'prime video', 'amazon prime', 'hbo', 'apple tv',
      'icloud', 'google one', 'youtube premium', 'chatgpt', 'openai', 'claude', 'canva',
      'adobe', 'xbox game pass', 'ps plus', 'assinatura', 'subscription', 'suscripcion',
    ],
  ],
  [
    'cat-food',
    [
      'ifood', 'rappi', 'uber eats', 'ze delivery', 'aiqfome', 'restaurante', 'lanchonete',
      'lanche', 'almoco', 'jantar', 'padaria', 'panificadora', 'supermercado', 'mercado',
      'atacadao', 'assai', 'carrefour', 'pao de acucar', 'acougue', 'hortifruti', 'sacolao',
      'pizzaria', 'pizza', 'burger', 'hamburguer', 'mcdonalds', 'outback', 'starbucks',
      'sushi', 'churrasco', 'sorvete', 'acai', 'cafeteria', 'cafe', 'bk',
      'grocery', 'supermarket', 'restaurant', 'lunch', 'dinner', 'coffee', 'bakery',
      'almuerzo', 'cena', 'panaderia', 'comida',
    ],
  ],
  [
    'cat-transport',
    [
      'uber', '99pop', '99taxi', 'cabify', 'indrive', 'taxi', 'combustivel', 'gasolina',
      'etanol', 'diesel', 'posto', 'ipiranga', 'shell', 'petrobras', 'estacionamento',
      'zona azul', 'pedagio', 'sem parar', 'veloe', 'conectcar', 'metro', 'onibus',
      'bilhete unico', 'top sp', 'passagem', 'latam', 'gol', 'azul linhas', 'oficina',
      'mecanico', 'ipva', 'seguro auto', 'parking', 'fuel', 'subway', 'train', 'flight',
      'peaje', 'gasolinera', 'autobus', '99',
    ],
  ],
  [
    'cat-home',
    [
      'aluguel', 'condominio', 'iptu', 'energia', 'conta de luz', 'enel', 'cpfl', 'cemig',
      'copel', 'celesc', 'neoenergia', 'light', 'conta de agua', 'sabesp', 'sanepar',
      'copasa', 'cedae', 'comgas', 'gas encanado', 'botijao', 'internet', 'vivo fibra',
      'claro net', 'tim live', 'oi fibra', 'faxina', 'diarista', 'lavanderia', 'reforma',
      'leroy merlin', 'telhanorte', 'rent', 'electricity', 'utilities', 'alquiler',
      'electricidad', 'luz', 'agua',
    ],
  ],
  [
    'cat-health',
    [
      'farmacia', 'drogaria', 'droga raia', 'drogasil', 'pague menos', 'panvel', 'araujo',
      'remedio', 'medicamento', 'consulta', 'medico', 'dentista', 'odonto', 'exame',
      'laboratorio', 'fleury', 'delboni', 'lavoisier', 'hospital', 'psicologo', 'terapia',
      'fisioterapia', 'plano de saude', 'unimed', 'amil', 'bradesco saude', 'sulamerica',
      'hapvida', 'notredame', 'otica', 'oculos', 'pharmacy', 'doctor', 'dentist', 'health',
      'medical', 'salud',
    ],
  ],
  [
    'cat-education',
    [
      'faculdade', 'universidade', 'escola', 'colegio', 'creche', 'curso', 'udemy',
      'alura', 'coursera', 'rocketseat', 'origamid', 'ebac', 'livro', 'livraria',
      'saraiva', 'cultura', 'mensalidade escolar', 'ingles', 'espanhol', 'duolingo',
      'papelaria', 'material escolar', 'pos graduacao', 'mba', 'school', 'college',
      'university', 'course', 'book', 'tuition', 'escuela', 'universidad', 'libro',
    ],
  ],
  [
    'cat-leisure',
    [
      'cinema', 'cinemark', 'ingresso', 'sympla', 'eventim', 'teatro', 'show', 'concerto',
      'cerveja', 'chopp', 'balada', 'festa', 'viagem', 'hotel', 'airbnb', 'booking',
      'decolar', 'hospedagem', 'pousada', 'parque', ' boliche', 'jogo', 'steam',
      'playstation', 'nintendo', 'spotify', 'bar', 'pub', 'movie', 'concert', 'travel',
      'cine', 'viaje', 'cerveza',
    ],
  ],
  [
    'cat-shopping',
    [
      'amazon', 'mercado livre', 'mercadolivre', 'shopee', 'shein', 'aliexpress',
      'magalu', 'magazine luiza', 'casas bahia', 'ponto frio', 'americanas', 'fast shop',
      'renner', 'riachuelo', 'cea', 'zara', 'hering', 'centauro', 'decathlon', 'nike',
      'adidas', 'roupa', 'camisa', 'camiseta', 'calca', 'vestido', 'tenis', 'sapato',
      'bolsa', 'relogio', 'shopping', 'clothes', 'shoes', 'mall', 'ropa', 'zapatos', 'tienda',
    ],
  ],
  [
    'cat-personal-care',
    [
      'barbearia', 'barbeiro', 'corte de cabelo', 'cabelo', 'cabeleireiro', 'salao',
      'manicure', 'pedicure', 'unha', 'depilacao', 'estetica', 'skincare', 'perfume',
      'cosmetico', 'maquiagem', 'boticario', 'natura', 'eudora', 'sephora', 'academia',
      'smartfit', 'smart fit', 'bluefit', 'bodytech', 'gympass', 'wellhub', 'totalpass',
      'crossfit', 'pilates', 'yoga', 'haircut', 'barber', 'salon', 'gym', 'peluqueria',
      'gimnasio',
    ],
  ],
  [
    'cat-tech',
    [
      'celular', 'iphone', 'samsung', 'xiaomi', 'motorola', 'notebook', 'macbook',
      'computador', 'teclado', 'mouse', 'monitor', 'headset', 'fone', 'airpods',
      'carregador', 'cabo usb', 'hd externo', 'ssd', 'placa de video', 'kabum',
      'pichau', 'terabyte', 'kalunga', 'apple store', 'aws', 'vercel', 'digitalocean',
      'github', 'dominio', 'hospedagem web', 'laptop', 'hardware', 'gadget',
    ],
  ],
  [
    'cat-gifts',
    [
      'presente', 'aniversario', 'lembrancinha', 'floricultura', 'flores', 'buque',
      'cesta de cafe', 'cacau show', 'kopenhagen', 'lindt', 'gift', 'birthday',
      'regalo', 'cumpleanos',
    ],
  ],
];

const INCOME_KEYWORDS: ReadonlyArray< readonly [string, readonly string[]] > = [
  [
    'cat-salary',
    [
      'salario', 'pagamento', 'holerite', 'contra cheque', 'contracheque', 'adiantamento',
      'vale refeicao', 'vale alimentacao', '13o', 'decimo terceiro', 'ferias', 'plr',
      'participacao nos lucros', 'bonus', 'comissao', 'pro labore', 'pro-labore',
      'salary', 'paycheck', 'wage', 'sueldo', 'nomina',
    ],
  ],
  [
    'cat-freelance',
    [
      'freelance', 'freela', 'projeto', 'consultoria', 'servico prestado', 'nota fiscal',
      'honorarios', 'cliente', 'aula particular', 'bico', 'workana', '99freelas',
      'upwork', 'fiverr', 'consulting', 'client', 'proyecto',
    ],
  ],
  [
    'cat-investments',
    [
      'dividendo', 'dividendos', 'jcp', 'rendimento', 'juros', 'fii', 'fundo imobiliario',
      'acoes', 'tesouro direto', 'tesouro selic', 'cdb', 'lci', 'lca', 'debenture',
      'resgate', 'lucro', 'cripto', 'bitcoin', 'aluguel recebido', 'dividend', 'yield',
      'interest', 'investment', 'inversion',
    ],
  ],
  [
    'cat-gift-received',
    [
      'presente', 'mimo', 'mesada', 'doacao', 'sorteio', 'premio', 'cashback', 'reembolso',
      'gift', 'refund', 'regalo', 'reembolso',
    ],
  ],
];

/** Cria a chave normalizada usada no dicionário de regras aprendidas do usuário. */
export function ruleKey(type: TransactionType, description: string): string | null {
  const norm = normalizeText(description);
  if (norm.length < MIN_DESCRIPTION_LENGTH) return null;
  return `${type}:${norm}`;
}

/**
 * Registra (ou atualiza) a preferência do usuário para uma descrição específica (US-016.3).
 * Retorna um novo mapa imutável.
 */
export function learnCategoryRule(
  rules: LearnedCategoryRules,
  description: string,
  type: TransactionType,
  categoryId: string,
): LearnedCategoryRules {
  const key = ruleKey(type, description);
  if (!key || !categoryId) return rules;
  if (rules[key] === categoryId) return rules;
  return { ...rules, [key]: categoryId };
}

/** Faz o parse seguro do JSON salvo em `settings`. */
export function parseLearnedRules(raw: string | null | undefined): LearnedCategoryRules {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: LearnedCategoryRules = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && k.length > 0 && v.length > 0) {
        clean[k] = v;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

/**
 * Verifica se `keyword` (já normalizada) aparece em `text` (já normalizado).
 * Palavras curtas (<= 3 letras, ex.: "99", "bk", "luz", "bar") exigem fronteira de palavra
 * para evitar falsos positivos (ex.: "bar" dentro de "barato").
 */
function matchesKeyword(text: string, keyword: string): boolean {
  const kw = keyword.trim();
  if (!kw) return false;
  if (kw.length <= 3) {
    const words = text.split(/[^a-z0-9]+/);
    return words.includes(kw);
  }
  return text.includes(kw);
}

/**
 * Sugere automaticamente uma categoria ativa do tipo informado para a descrição digitada.
 */
export function suggestCategory(params: {
  description: string;
  type: TransactionType;
  categories: Category[];
  learnedRules?: LearnedCategoryRules;
  history?: ReadonlyArray<Pick<Transaction, 'description' | 'categoryId' | 'type'>>;
}): CategorySuggestion | null {
  const { description, type, categories, learnedRules = {}, history = [] } = params;
  const norm = normalizeText(description);
  if (norm.length < MIN_DESCRIPTION_LENGTH) return null;

  const activeCategories = categories.filter((c) => c.type === type && c.archivedAt === null);
  const activeIds = new Set(activeCategories.map((c) => c.id));
  if (activeIds.size === 0) return null;

  // 1. Regras aprendidas do usuário (US-016.3) — match exato primeiro
  const exactKey = `${type}:${norm}`;
  const exactLearned = learnedRules[exactKey];
  if (exactLearned && activeIds.has(exactLearned)) {
    return { categoryId: exactLearned, source: 'learned' };
  }

  // Match parcial nas regras aprendidas (prefere a descrição aprendida mais específica/longa)
  const prefix = `${type}:`;
  let bestLearned: { categoryId: string; len: number } | null = null;
  for (const [key, catId] of Object.entries(learnedRules)) {
    if (!key.startsWith(prefix) || !activeIds.has(catId)) continue;
    const learnedNorm = key.slice(prefix.length);
    if (learnedNorm.length < 3) continue;
    if (matchesKeyword(norm, learnedNorm) || matchesKeyword(learnedNorm, norm)) {
      if (!bestLearned || learnedNorm.length > bestLearned.len) {
        bestLearned = { categoryId: catId, len: learnedNorm.length };
      }
    }
  }
  if (bestLearned) {
    return { categoryId: bestLearned.categoryId, source: 'learned' };
  }

  // 2. Histórico de transações recentes do próprio usuário
  for (const tx of history) {
    if (tx.type !== type || !tx.description || !activeIds.has(tx.categoryId)) continue;
    const txNorm = normalizeText(tx.description);
    if (txNorm.length < 3) continue;
    if (txNorm === norm || matchesKeyword(norm, txNorm) || matchesKeyword(txNorm, norm)) {
      return { categoryId: tx.categoryId, source: 'history' };
    }
  }

  // 3. Nome de categoria ativa (ex.: categoria personalizada "Pet" ao digitar "Ração Pet")
  for (const cat of activeCategories) {
    const catNorm = normalizeText(cat.name);
    if (catNorm.length >= 3 && matchesKeyword(norm, catNorm)) {
      return { categoryId: cat.id, source: 'keyword' };
    }
  }

  // 4. Dicionário de palavras-chave multilíngue (PT / EN / ES)
  const dictionary = type === 'expense' ? EXPENSE_KEYWORDS : INCOME_KEYWORDS;
  for (const [catId, keywords] of dictionary) {
    if (!activeIds.has(catId)) continue;
    for (const kw of keywords) {
      if (matchesKeyword(norm, kw)) {
        return { categoryId: catId, source: 'keyword' };
      }
    }
  }

  return null;
}
