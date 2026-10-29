/**
 * Result: representa uma operação que pode dar certo ou errado SEM lançar exceção.
 *
 * Usamos para validações de formulário: o erro é um resultado esperado
 * (o usuário esqueceu um campo), não uma situação excepcional.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Mapa campo → mensagem de erro, usado pelos formulários. */
export type FieldErrors<F extends string> = Partial<Record<F, string>>;
