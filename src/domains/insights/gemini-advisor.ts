import type { CategorySlice } from '@/domains/dashboard/summary';
import type { ExpenseComparison } from '@/domains/dashboard/trends';
import type { AppLanguage } from '@/shared/i18n';
import type { Money } from '@/shared/money';
import { fail, ok, type Result } from '@/shared/result';

/**
 * Consultor Financeiro com IA Generativa (Google Gemini — `gemini-2.5-flash`).
 *
 * Privacidade por design: envia APENAS dados agregados do mês (totais de receita/gasto,
 * meta mensal e fatias por categoria), nunca e-mail ou credenciais do usuário.
 */
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface FinancialPromptInput {
  userName: string;
  monthLabel: string;
  language: AppLanguage;
  totalIncome: Money;
  totalExpense: Money;
  monthlyBudget: Money | null;
  breakdown: CategorySlice[];
  comparison: ExpenseComparison;
  customQuestion?: string;
}

/** Monta o prompt estruturado no idioma do aplicativo (`pt`, `en` ou `es`). */
export function buildFinancialPrompt(input: FinancialPromptInput): string {
  const {
    userName,
    monthLabel,
    language,
    totalIncome,
    totalExpense,
    monthlyBudget,
    breakdown,
    comparison,
    customQuestion,
  } = input;

  const categoriesLine =
    breakdown.length > 0
      ? breakdown
          .map((s) => `${s.name}: ${s.total.format()} (${Math.round(s.share * 100)}%)`)
          .join(', ')
      : 'nenhum gasto registrado';

  let trendLine = 'sem dados do mês anterior';
  if (comparison.kind === 'up') trendLine = `+${comparison.percent}% vs. mês anterior`;
  else if (comparison.kind === 'down') trendLine = `-${comparison.percent}% vs. mês anterior`;
  else if (comparison.kind === 'same') trendLine = 'estável vs. mês anterior';

  const budgetLine = monthlyBudget ? monthlyBudget.format() : 'não definida';
  const question = customQuestion?.trim();

  if (language === 'en') {
    return [
      `You are a concise, empathetic personal finance advisor inside the Smart Wallet app.`,
      `User first name: ${userName}`,
      `Period: ${monthLabel}`,
      `Total income: ${totalIncome.format()}`,
      `Total expenses: ${totalExpense.format()} (${trendLine})`,
      `Monthly spending goal: ${budgetLine}`,
      `Expenses by category: ${categoriesLine}`,
      question
        ? `User question: "${question}"\nAnswer the question directly in at most 4 short sentences using the numbers above.`
        : `Provide a brief diagnosis and 2 practical, actionable tips in at most 4 short sentences, addressing ${userName} directly.`,
    ].join('\n');
  }

  if (language === 'es') {
    return [
      `Eres un asesor de finanzas personales conciso y empático dentro de la app Smart Wallet.`,
      `Nombre del usuario: ${userName}`,
      `Período: ${monthLabel}`,
      `Ingresos totales: ${totalIncome.format()}`,
      `Gastos totales: ${totalExpense.format()} (${trendLine})`,
      `Meta mensual de gastos: ${budgetLine}`,
      `Gastos por categoría: ${categoriesLine}`,
      question
        ? `Pregunta del usuario: "${question}"\nResponde directamente en máximo 4 frases cortas usando los números anteriores.`
        : `Ofrece un diagnóstico breve y 2 consejos prácticos y accionables en máximo 4 frases cortas, dirigiéndote a ${userName}.`,
    ].join('\n');
  }

  return [
    `Você é um consultor financeiro pessoal direto, acolhedor e prático dentro do app Smart Wallet.`,
    `Nome do usuário: ${userName}`,
    `Mês analisado: ${monthLabel}`,
    `Receitas do mês: ${totalIncome.format()}`,
    `Gastos do mês: ${totalExpense.format()} (${trendLine})`,
    `Meta mensal de gastos: ${budgetLine}`,
    `Gastos por categoria: ${categoriesLine}`,
    question
      ? `Pergunta do usuário: "${question}"\nResponda diretamente em no máximo 4 frases curtas usando os números acima.`
      : `Faça um diagnóstico curto e dê 2 recomendações práticas e acionáveis em no máximo 4 frases curtas, falando diretamente com ${userName}.`,
  ].join('\n');
}

interface GeminiResponsePayload {
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
 * Chama a API REST oficial do Google Gemini (`gemini-2.5-flash`) com a chave informada.
 * Aceita `fetchFn` injetável para testes unitários determinísticos sem rede.
 */
export async function requestGeminiAdvice(params: {
  apiKey: string;
  prompt: string;
  fetchFn?: typeof fetch;
}): Promise<Result<string, string>> {
  const cleanKey = params.apiKey.trim();
  if (!cleanKey) {
    return fail('Configure sua chave da API do Google Gemini nas Configurações');
  }

  const fetchImpl = params.fetchFn ?? fetch;

  try {
    const response = await fetchImpl(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: params.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 320,
        },
      }),
    });

    const data = (await response.json()) as GeminiResponsePayload;

    if (!response.ok) {
      const apiMsg = data?.error?.message || `Erro HTTP ${response.status}`;
      return fail(apiMsg);
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();

    if (!text) {
      return fail('A IA não retornou texto para esta análise');
    }

    return ok(text);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Falha de conexão com a API do Gemini');
  }
}

