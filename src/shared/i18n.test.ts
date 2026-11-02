import { describe, expect, it } from 'vitest';

import { formatRelativeDate, formatYearMonth } from './date';
import { DICTIONARIES, translateCategory, useI18nStore } from './i18n';

describe('i18n (Português, Inglês e Espanhol)', () => {
  it('possui dicionários completos para pt, en e es', () => {
    expect(DICTIONARIES.pt.tabs.home).toBe('Início');
    expect(DICTIONARIES.en.tabs.home).toBe('Home');
    expect(DICTIONARIES.es.tabs.home).toBe('Inicio');

    expect(DICTIONARIES.pt.settings.languageTitle).toBe('Idioma do Aplicativo');
    expect(DICTIONARIES.en.settings.languageTitle).toBe('App Language');
    expect(DICTIONARIES.es.settings.languageTitle).toBe('Idioma de la Aplicación');
  });

  it('traduz categorias padrão por ID ou nome em pt, en e es', () => {
    expect(translateCategory('cat-food', 'Alimentação', 'pt')).toBe('Alimentação');
    expect(translateCategory('cat-food', 'Alimentação', 'en')).toBe('Food & Dining');
    expect(translateCategory('cat-food', 'Alimentação', 'es')).toBe('Alimentación');

    expect(translateCategory('cat-salary', 'Salário', 'en')).toBe('Salary');
    expect(translateCategory('cat-salary', 'Salário', 'es')).toBe('Salario');

    // Categoria personalizada mantém o próprio nome
    expect(translateCategory('custom-123', 'Pet Shop', 'en')).toBe('Pet Shop');
  });

  it('formata meses e datas relativas em pt, en e es', () => {
    expect(formatYearMonth('2026-10', 'pt')).toBe('Outubro 2026');
    expect(formatYearMonth('2026-10', 'en')).toBe('October 2026');
    expect(formatYearMonth('2026-10', 'es')).toBe('Octubre 2026');

    expect(formatRelativeDate('2026-10-15', '2026-10-15', 'pt')).toBe('Hoje');
    expect(formatRelativeDate('2026-10-15', '2026-10-15', 'en')).toBe('Today');
    expect(formatRelativeDate('2026-10-15', '2026-10-15', 'es')).toBe('Hoy');

    expect(formatRelativeDate('2026-10-14', '2026-10-15', 'en')).toBe('Yesterday');
    expect(formatRelativeDate('2026-10-14', '2026-10-15', 'es')).toBe('Ayer');
  });

  it('atualiza o idioma ativo na store reativa useI18nStore', () => {
    useI18nStore.getState().setLanguage('en');
    expect(useI18nStore.getState().language).toBe('en');

    useI18nStore.getState().setLanguage('es');
    expect(useI18nStore.getState().language).toBe('es');

    useI18nStore.getState().setLanguage('pt');
    expect(useI18nStore.getState().language).toBe('pt');
  });
});
