/**
 * Erro lançado quando uma regra de negócio é violada.
 * O `code` aponta para o ID da regra em fase_02_arquitetura_ddd.md (ex.: 'RN-02').
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
