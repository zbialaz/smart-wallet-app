import { describe, expect, it } from 'vitest';

import { hashPassword, validateLogin, validateRegister, validateSocialAuth } from './user';

describe('User auth domain', () => {
  it('valida cadastro com dados corretos', () => {
    const res = validateRegister(
      {
        name: '  Eduardo Bialas ',
        email: 'Eduardo@Example.com ',
        password: 'secret123',
        confirmPassword: 'secret123',
      },
      [],
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.name).toBe('Eduardo Bialas');
      expect(res.value.email).toBe('eduardo@example.com');
    }
  });

  it('rejeita e-mail duplicado ignorando maiúsculas/minúsculas', () => {
    const res = validateRegister(
      {
        name: 'Eduardo',
        email: 'EDUARDO@example.com',
        password: 'secret123',
      },
      ['eduardo@example.com'],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.email).toContain('Já existe');
    }
  });

  it('rejeita senha curta e confirmação divergente', () => {
    const res = validateRegister(
      {
        name: 'Eduardo',
        email: 'eduardo@example.com',
        password: '123',
        confirmPassword: '456',
      },
      [],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.password).toBeDefined();
      expect(res.error.confirmPassword).toBe('As senhas não coincidem');
    }
  });

  it('valida login exigindo e-mail válido e senha', () => {
    const invalid = validateLogin({ email: 'invalido', password: '' });
    expect(invalid.ok).toBe(false);

    const valid = validateLogin({ email: 'User@Test.com', password: '123456' });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.email).toBe('user@test.com');
    }
  });

  it('gera hash determinístico de senha com salt por e-mail', () => {
    const h1 = hashPassword('minhasenha', 'a@test.com');
    const h2 = hashPassword('minhasenha', 'A@test.com ');
    const hDifferentEmail = hashPassword('minhasenha', 'b@test.com');
    const hDifferentPass = hashPassword('outrasenha', 'a@test.com');

    expect(h1).toBe(h2);
    expect(h1).not.toBe(hDifferentEmail);
    expect(h1).not.toBe(hDifferentPass);
    expect(h1.startsWith('sw1$')).toBe(true);
  });

  it('valida autenticação social (Google/Apple) com fallback de nome', () => {
    const google = validateSocialAuth({
      provider: 'google',
      name: 'Eduardo Bialas',
      email: 'Eduardo.Google@gmail.com',
    });
    expect(google.ok).toBe(true);
    if (google.ok) {
      expect(google.value.email).toBe('eduardo.google@gmail.com');
      expect(google.value.name).toBe('Eduardo Bialas');
    }

    // Apple muitas vezes omite o nome a partir do 2º login
    const apple = validateSocialAuth({
      provider: 'apple',
      name: '',
      email: 'eduardo.apple@privaterelay.appleid.com',
    });
    expect(apple.ok).toBe(true);
    if (apple.ok) {
      expect(apple.value.name).toBe('eduardo.apple');
    }
  });
});

