import { describe, expect, it } from 'vitest';

import {
  learnCategoryRule,
  parseLearnedRules,
  suggestCategory,
  type LearnedCategoryRules,
} from './auto-classify';
import { DEFAULT_CATEGORIES, type Category } from './category';

describe('US-016 — Classificação automática de categorias (auto-classify)', () => {
  it('US-016.1: sugere "Alimentação" ao digitar "iFood" (ignorando maiúsculas e acentos)', () => {
    const suggestion = suggestCategory({
      description: 'Pedido no iFood',
      type: 'expense',
      categories: DEFAULT_CATEGORIES,
    });
    expect(suggestion).toEqual({
      categoryId: 'cat-food',
      source: 'keyword',
    });
  });

  it('sugere categorias corretas para palavras-chave de gasto e de receita (PT/EN/ES)', () => {
    expect(
      suggestCategory({
        description: 'Corrida Uber aeroporto',
        type: 'expense',
        categories: DEFAULT_CATEGORIES,
      })?.categoryId,
    ).toBe('cat-transport');

    expect(
      suggestCategory({
        description: 'Assinatura Netflix',
        type: 'expense',
        categories: DEFAULT_CATEGORIES,
      })?.categoryId,
    ).toBe('cat-subscriptions');

    expect(
      suggestCategory({
        description: 'Salário mensal',
        type: 'income',
        categories: DEFAULT_CATEGORIES,
      })?.categoryId,
    ).toBe('cat-salary');

    expect(
      suggestCategory({
        description: 'Dividendos FII',
        type: 'income',
        categories: DEFAULT_CATEGORIES,
      })?.categoryId,
    ).toBe('cat-investments');
  });

  it('evita falsos positivos em palavras curtas (ex.: "bar" não ativa em "barato")', () => {
    expect(
      suggestCategory({
        description: 'Produto barato',
        type: 'expense',
        categories: DEFAULT_CATEGORIES,
      }),
    ).toBeNull();

    expect(
      suggestCategory({
        description: 'Noite no bar com amigos',
        type: 'expense',
        categories: DEFAULT_CATEGORIES,
      })?.categoryId,
    ).toBe('cat-leisure');
  });

  it('reconhece categorias personalizadas pelo próprio nome (US-011 + US-016)', () => {
    const customPet: Category = {
      id: 'cat-custom-pet',
      name: 'Pet',
      icon: 'paw',
      color: '#E76F51',
      type: 'expense',
      isDefault: false,
      archivedAt: null,
    };
    const suggestion = suggestCategory({
      description: 'Ração para o Pet',
      type: 'expense',
      categories: [...DEFAULT_CATEGORIES, customPet],
    });
    expect(suggestion).toEqual({
      categoryId: 'cat-custom-pet',
      source: 'keyword',
    });
  });

  it('US-016.3: aprende com a correção do usuário e prioriza a regra aprendida sobre o dicionário', () => {
    let rules: LearnedCategoryRules = {};
    // Usuário classificou "Uber" como "Trabalho/Lazer" (ex.: cat-leisure) em vez de Transporte
    rules = learnCategoryRule(rules, 'Uber', 'expense', 'cat-leisure');

    const suggestion = suggestCategory({
      description: 'Uber centro',
      type: 'expense',
      categories: DEFAULT_CATEGORIES,
      learnedRules: rules,
    });
    expect(suggestion).toEqual({
      categoryId: 'cat-leisure',
      source: 'learned',
    });
  });

  it('usa o histórico de transações anteriores quando não há regra aprendida', () => {
    const suggestion = suggestCategory({
      description: 'Padaria Estrela',
      type: 'expense',
      categories: DEFAULT_CATEGORIES,
      history: [
        {
          description: 'Padaria Estrela',
          categoryId: 'cat-gifts',
          type: 'expense',
        },
      ],
    });
    expect(suggestion).toEqual({
      categoryId: 'cat-gifts',
      source: 'history',
    });
  });

  it('ignora categorias arquivadas ou de outro tipo', () => {
    const archivedFood = DEFAULT_CATEGORIES.map((c) =>
      c.id === 'cat-food' ? { ...c, archivedAt: '2026-09-01T00:00:00.000Z' } : c,
    );
    expect(
      suggestCategory({
        description: 'iFood',
        type: 'expense',
        categories: archivedFood,
      }),
    ).toBeNull();
  });

  it('parseLearnedRules lida com JSON inválido ou vazio sem lançar erro', () => {
    expect(parseLearnedRules(null)).toEqual({});
    expect(parseLearnedRules('invalido')).toEqual({});
    expect(parseLearnedRules(JSON.stringify({ 'expense:ifood': 'cat-food' }))).toEqual({
      'expense:ifood': 'cat-food',
    });
  });
});
