import { DomainError } from './errors';

/**
 * Money — Value Object que representa uma quantia em Reais.
 *
 * - Guardado em CENTAVOS INTEIROS (RN-02): evita 0.1 + 0.2 = 0.30000000000000004.
 * - Imutável: toda operação devolve um novo Money.
 * - Igualdade por valor: Money(100) equals Money(100).
 * - Pode ser negativo (um saldo pode ficar negativo). A regra "valor > 0"
 *   é da Transação (RN-01), não do Money.
 */
export class Money {
  /** Construtor privado: a única forma de criar é pelos métodos estáticos, que validam. */
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new DomainError('RN-02', `Centavos devem ser inteiros (recebido: ${cents})`);
    }
    if (!Number.isSafeInteger(cents)) {
      throw new DomainError('RN-02', 'Valor fora do limite suportado');
    }
    // `cents + 0` normaliza -0 para 0
    return new Money(cents + 0);
  }

  static zero(): Money {
    return new Money(0);
  }

  /**
   * Converte texto em formato brasileiro: "15,90", "1.000,50", "R$ 15", "-3,5".
   * Não usa multiplicação de float: separa parte inteira e decimal como texto.
   */
  static fromString(input: string): Money {
    let text = input.replace(/R\$/g, '').replace(/\s/g, '');
    if (text.includes(',')) {
      text = text.replace(/\./g, '').replace(',', '.');
    }
    const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
    if (!match) {
      throw new DomainError('RN-02', `Valor inválido: "${input}"`);
    }
    const [, sign, intPart, decPart = ''] = match;
    const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, '0'));
    return Money.fromCents(sign ? -cents : cents);
  }

  /**
   * Para campos de valor estilo "app de banco": o usuário digita só números
   * e eles entram pela direita. "1590" → R$ 15,90. Ignora qualquer não-dígito.
   */
  static fromDigitInput(text: string, maxDigits = 11): Money {
    const digits = text.replace(/\D/g, '').slice(0, maxDigits);
    return Money.fromCents(digits ? Number(digits) : 0);
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return Money.fromCents(this.cents - other.cents);
  }

  negate(): Money {
    return Money.fromCents(-this.cents);
  }

  abs(): Money {
    return Money.fromCents(Math.abs(this.cents));
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /** "R$ 1.234,56" / "-R$ 10,00". Formatação manual = mesmo resultado em iOS, Android e web. */
  format(): string {
    const sign = this.cents < 0 ? '-' : '';
    return `${sign}R$ ${this.toInputString()}`;
  }

  /** Só o número, sem "R$" e sem sinal: "1.234,56". */
  toInputString(): string {
    const abs = Math.abs(this.cents);
    const intPart = Math.floor(abs / 100)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decPart = (abs % 100).toString().padStart(2, '0');
    return `${intPart},${decPart}`;
  }

  /** Soma uma lista de valores. */
  static sum(values: Money[]): Money {
    return values.reduce((acc, v) => acc.add(v), Money.zero());
  }
}
