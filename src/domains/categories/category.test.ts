import { describe, expect, it } from 'vitest';

import {
  CATEGORY_NAME_MAX_LENGTH,
  DEFAULT_CATEGORIES,
  canModifyCategory,
  validateCategory,
  type Category,
  type CategoryDraft,
} from './category';

const draft = (over: Partial<CategoryDraft> = {}): CategoryDraft => ({
  name: 'Pet',
  icon: 'paw',
  color: '#E76F51',
  type: 'expense',
  ...over,
});

const custom = (over: Partial<Category> & { id: string; name: string }): Category => ({
  icon: 'paw',
  color: '#E76F51',
  type: 'expense',
  isDefault: false,
  archivedAt: null,
  ...over,
});

describe('US-011 — criar categoria personalizada', () => {
  it('US-011.1/2: aceita nome, ícone e cor válidos (e apara espaços)', () => {
    const result = validateCategory(draft({ name: '  Pet  ' }), DEFAULT_CATEGORIES);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Pet');
  });

  it('rejeita nome vazio e nome muito longo', () => {
    const empty = validateCategory(draft({ name: '   ' }), DEFAULT_CATEGORIES);
    expect(!empty.ok && empty.error.name).toBeTruthy();

    const long = validateCategory(
      draft({ name: 'x'.repeat(CATEGORY_NAME_MAX_LENGTH + 1) }),
      DEFAULT_CATEGORIES,
    );
    expect(!long.ok && long.error.name).toContain(String(CATEGORY_NAME_MAX_LENGTH));
  });

  it('US-011.3 / RN-07: rejeita nome duplicado no mesmo tipo (sem diferenciar caixa/acento)', () => {
    const result = validateCategory(draft({ name: 'alimentacao' }), DEFAULT_CATEGORIES);
    expect(!result.ok && result.error.name).toBe('Já existe uma categoria com esse nome');
  });

  it('RN-07: o mesmo nome é permitido em tipos diferentes', () => {
    const existing = [custom({ id: 'c1', name: 'Extra', type: 'expense' })];
    expect(validateCategory(draft({ name: 'Extra', type: 'income' }), existing).ok).toBe(true);
  });

  it('categoria arquivada não bloqueia o nome', () => {
    const existing = [custom({ id: 'c1', name: 'Pet', archivedAt: '2026-01-01' })];
    expect(validateCategory(draft({ name: 'Pet' }), existing).ok).toBe(true);
  });

  it('US-024: ao editar, a própria categoria não conta como duplicada', () => {
    const existing = [custom({ id: 'c1', name: 'Pet' })];
    expect(validateCategory(draft({ name: 'Pet' }), existing, 'c1').ok).toBe(true);
    expect(validateCategory(draft({ name: 'Pet' }), existing).ok).toBe(false);
  });

  it('rejeita cor fora do formato #RRGGBB', () => {
    const result = validateCategory(draft({ color: 'vermelho' }), DEFAULT_CATEGORIES);
    expect(!result.ok && result.error.color).toBeTruthy();
  });
});

describe('RN-09 — categorias padrão são protegidas', () => {
  it('padrão não pode ser modificada; personalizada pode', () => {
    expect(canModifyCategory(DEFAULT_CATEGORIES[0])).toBe(false);
    expect(canModifyCategory(custom({ id: 'c1', name: 'Pet' }))).toBe(true);
  });
});
