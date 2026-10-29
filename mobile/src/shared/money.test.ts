import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import { Money } from './money';

describe('Money', () => {
  it('cria a partir de centavos', () => {
    expect(Money.fromCents(1590).cents).toBe(1590);
  });

  it('rejeita centavos não inteiros (RN-02)', () => {
    expect(() => Money.fromCents(15.9)).toThrow(DomainError);
  });

  it('cria a partir de texto em formato brasileiro', () => {
    expect(Money.fromString('15,90').cents).toBe(1590);
    expect(Money.fromString('1.000,50').cents).toBe(100050);
    expect(Money.fromString('R$ 15').cents).toBe(1500);
    expect(Money.fromString('3,5').cents).toBe(350);
    expect(Money.fromString('-10,00').cents).toBe(-1000);
  });

  it('rejeita texto inválido', () => {
    expect(() => Money.fromString('abc')).toThrow(DomainError);
    expect(() => Money.fromString('1,234')).toThrow(DomainError);
  });

  it('lê digitação estilo app de banco', () => {
    expect(Money.fromDigitInput('1590').cents).toBe(1590);
    expect(Money.fromDigitInput('15,90').cents).toBe(1590);
    expect(Money.fromDigitInput('').cents).toBe(0);
    expect(Money.fromDigitInput('999999999999999').cents).toBe(99999999999);
  });

  it('soma sem erro de ponto flutuante', () => {
    const total = Money.fromString('0,10').add(Money.fromString('0,20'));
    expect(total.cents).toBe(30);
  });

  it('é imutável: add devolve um novo objeto', () => {
    const a = Money.fromCents(100);
    a.add(Money.fromCents(50));
    expect(a.cents).toBe(100);
  });

  it('subtrai e permite resultado negativo', () => {
    expect(Money.fromCents(100).subtract(Money.fromCents(250)).cents).toBe(-150);
  });

  it('formata como moeda brasileira', () => {
    expect(Money.fromCents(1590).format()).toBe('R$ 15,90');
    expect(Money.fromCents(123456789).format()).toBe('R$ 1.234.567,89');
    expect(Money.fromCents(-500).format()).toBe('-R$ 5,00');
    expect(Money.zero().format()).toBe('R$ 0,00');
  });

  it('compara por valor, não por referência', () => {
    expect(Money.fromCents(500).equals(Money.fromCents(500))).toBe(true);
    expect(Money.fromCents(500).equals(Money.fromCents(501))).toBe(false);
  });

  it('soma uma lista', () => {
    expect(Money.sum([Money.fromCents(1), Money.fromCents(2)]).cents).toBe(3);
    expect(Money.sum([]).cents).toBe(0);
  });
});
