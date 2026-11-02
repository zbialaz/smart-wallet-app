/**
 * Utilitários de data.
 *
 * Decisão: datas de transação são strings 'YYYY-MM-DD' (sem hora, sem fuso).
 * - Uma transação acontece "num dia", não "num instante".
 * - Strings nesse formato ordenam corretamente como texto, inclusive no SQLite.
 * - Evitamos o bug clássico de fuso: new Date('2026-10-15') é meia-noite UTC,
 *   que no Brasil (UTC-3) vira dia 14 às 21h.
 *
 * Meses são 'YYYY-MM'.
 */

import type { AppLanguage } from './i18n';

export type ISODate = string; // 'YYYY-MM-DD'
export type YearMonth = string; // 'YYYY-MM'

const MONTH_NAMES_BY_LANG: Record<AppLanguage, string[]> = {
  pt: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  es: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
};

const RELATIVE_LABELS: Record<AppLanguage, { today: string; yesterday: string }> = {
  pt: { today: 'Hoje', yesterday: 'Ontem' },
  en: { today: 'Today', yesterday: 'Yesterday' },
  es: { today: 'Hoy', yesterday: 'Ayer' },
};

const pad = (n: number) => n.toString().padStart(2, '0');

/** Converte um Date para 'YYYY-MM-DD' usando o fuso LOCAL do aparelho. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): ISODate {
  return toISODate(new Date());
}

/** Lê 'YYYY-MM-DD' como data local (meio-dia, para não sofrer com horário de verão). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Valida formato E se a data existe de verdade (rejeita 2026-02-30). */
export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return toISODate(parseISODate(iso)) === iso;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** "15/10/2026" */
export function formatDateBR(iso: ISODate): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** "Hoje" / "Today" / "Hoy", "Ontem" / "Yesterday" / "Ayer" ou "15/10/2026". */
export function formatRelativeDate(
  iso: ISODate,
  reference: ISODate = today(),
  lang: AppLanguage = 'pt',
): string {
  const labels = RELATIVE_LABELS[lang] ?? RELATIVE_LABELS.pt;
  if (iso === reference) return labels.today;
  if (iso === addDays(reference, -1)) return labels.yesterday;
  return formatDateBR(iso);
}

/** Lê "15/10/2026" (digitado pelo usuário) → '2026-10-15'. Devolve null se inválido. */
export function parseDateBR(text: string): ISODate | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const iso = `${match[3]}-${pad(Number(match[2]))}-${pad(Number(match[1]))}`;
  return isValidISODate(iso) ? iso : null;
}

export function toYearMonth(iso: ISODate): YearMonth {
  return iso.slice(0, 7);
}

export function currentYearMonth(): YearMonth {
  return toYearMonth(today());
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Intervalo semiaberto [start, end) — ideal para SQL: date >= start AND date < end. */
export function monthRange(ym: YearMonth): { start: ISODate; end: ISODate } {
  return { start: `${ym}-01`, end: `${addMonths(ym, 1)}-01` };
}

/** "Outubro 2026" / "October 2026" / "Octubre 2026" */
export function formatYearMonth(ym: YearMonth, lang: AppLanguage = 'pt'): string {
  const [y, m] = ym.split('-').map(Number);
  const months = MONTH_NAMES_BY_LANG[lang] ?? MONTH_NAMES_BY_LANG.pt;
  return `${months[m - 1]} ${y}`;
}
