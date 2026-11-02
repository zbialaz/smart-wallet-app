import { fail, ok, type FieldErrors, type Result } from '@/shared/result';

/**
 * User (Usuário) — ENTITY.
 * Representa o dono da carteira autenticado localmente no dispositivo.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface RegisterDraft {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginDraft {
  email: string;
  password: string;
}

export type SocialProvider = 'google' | 'apple';

export interface SocialAuthDraft {
  provider: SocialProvider;
  name: string;
  email: string;
  providerId?: string;
}

export type AuthField = 'name' | 'email' | 'password' | 'confirmPassword';

export const USER_NAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 6;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Hash determinístico local (FNV-1a 64-bit multi-round com salt de e-mail)
 * para não armazenar senhas em texto puro no SQLite offline.
 */
export function hashPassword(password: string, email: string): string {
  const salt = normalizeEmail(email);
  const input = `${salt}::smart-wallet-v1::${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;

  for (let round = 0; round < 1024; round++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i) ^ (round & 0xff);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  }

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `sw1$${part1}${part2}`;
}

/** Valida os dados de criação de conta de usuário. */
export function validateRegister(
  draft: RegisterDraft,
  existingEmails: string[],
): Result<{ name: string; email: string; password: string }, FieldErrors<AuthField>> {
  const errors: FieldErrors<AuthField> = {};
  const name = draft.name.trim();
  const email = normalizeEmail(draft.email);
  const password = draft.password;

  if (!name) {
    errors.name = 'Informe seu nome';
  } else if (name.length < 2) {
    errors.name = 'O nome deve ter pelo menos 2 caracteres';
  } else if (name.length > USER_NAME_MAX_LENGTH) {
    errors.name = `Máximo de ${USER_NAME_MAX_LENGTH} caracteres`;
  }

  if (!email) {
    errors.email = 'Informe seu e-mail';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Informe um e-mail válido';
  } else if (existingEmails.some((e) => normalizeEmail(e) === email)) {
    errors.email = 'Já existe uma conta cadastrada com este e-mail';
  }

  if (!password) {
    errors.password = 'Crie uma senha';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }

  if (draft.confirmPassword !== undefined && draft.confirmPassword !== password) {
    errors.confirmPassword = 'As senhas não coincidem';
  }

  if (Object.keys(errors).length > 0) return fail(errors);
  return ok({ name, email, password });
}

/** Valida os dados de login. */
export function validateLogin(
  draft: LoginDraft,
): Result<{ email: string; password: string }, FieldErrors<AuthField>> {
  const errors: FieldErrors<AuthField> = {};
  const email = normalizeEmail(draft.email);
  const password = draft.password;

  if (!email) {
    errors.email = 'Informe seu e-mail';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'E-mail inválido';
  }

  if (!password) {
    errors.password = 'Informe sua senha';
  }

  if (Object.keys(errors).length > 0) return fail(errors);
  return ok({ email, password });
}

/**
 * Valida os dados recebidos de um provedor OAuth (Google / Apple).
 * Nota: No Sign in with Apple, a Apple só envia o nome no 1º login; nos seguintes
 * pode vir vazio, então usamos um fallback amigável baseado no e-mail.
 */
export function validateSocialAuth(
  draft: SocialAuthDraft,
): Result<{ provider: SocialProvider; name: string; email: string }, FieldErrors<AuthField>> {
  const email = normalizeEmail(draft.email);
  if (!email || !EMAIL_REGEX.test(email)) {
    return fail({ email: 'O provedor não retornou um e-mail válido' });
  }

  const rawName = draft.name.trim();
  const fallbackName = email.split('@')[0] || (draft.provider === 'apple' ? 'Usuário Apple' : 'Usuário Google');
  const name = (rawName.length >= 2 ? rawName : fallbackName).slice(0, USER_NAME_MAX_LENGTH);

  return ok({
    provider: draft.provider,
    name,
    email,
  });
}

