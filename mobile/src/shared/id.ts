/**
 * Gera um ID único para entidades.
 *
 * Por que não usar o autoincrement do SQLite? Porque assim a entidade já
 * nasce com identidade ANTES de ir para o banco (útil para testes e para
 * uma futura sincronização na nuvem, onde IDs sequenciais colidiriam).
 *
 * Formato: timestamp em base36 + parte aleatória. Suficiente para um app
 * local de um único usuário. Para sync multi-dispositivo, trocar por UUID v4/v7.
 */
export function generateId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${time}-${random}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
