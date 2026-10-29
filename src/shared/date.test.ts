import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  formatDateBR,
  formatRelativeDate,
  formatYearMonth,
  isValidISODate,
  monthRange,
  parseDateBR,
} from './date';

describe('date', () => {
  it('valida datas reais', () => {
    expect(isValidISODate('2026-10-15')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('15/10/2026')).toBe(false);
  });

  it('lê data digitada em formato brasileiro', () => {
    expect(parseDateBR('15/10/2026')).toBe('2026-10-15');
    expect(parseDateBR('5/1/2026')).toBe('2026-01-05');
    expect(parseDateBR('31/02/2026')).toBeNull();
    expect(parseDateBR('2026-10-15')).toBeNull();
  });

  it('soma dias atravessando meses e anos', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('navega entre meses', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('gera intervalo semiaberto do mês', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
  });

  it('formata para exibição', () => {
    expect(formatDateBR('2026-10-05')).toBe('05/10/2026');
    expect(formatYearMonth('2026-10')).toBe('Outubro 2026');
    expect(formatRelativeDate('2026-10-15', '2026-10-15')).toBe('Hoje');
    expect(formatRelativeDate('2026-10-14', '2026-10-15')).toBe('Ontem');
    expect(formatRelativeDate('2026-10-01', '2026-10-15')).toBe('01/10/2026');
  });
});
