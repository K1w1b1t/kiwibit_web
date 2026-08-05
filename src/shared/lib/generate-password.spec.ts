import { generatePassword, GENERATED_PASSWORD_LENGTH } from '@/shared/lib/generate-password';
import { checkPassword, PASSWORD_MIN_LENGTH } from '@/shared/lib/password';

describe('generatePassword', () => {
  it('usa o tamanho padrão', () => {
    expect(generatePassword()).toHaveLength(GENERATED_PASSWORD_LENGTH);
  });

  it('respeita um tamanho explícito', () => {
    expect(generatePassword(24)).toHaveLength(24);
  });

  it('nunca gera abaixo do mínimo aceito pela API', () => {
    expect(generatePassword(3).length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
  });

  it('gera senha que passa na validação da API', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(checkPassword(generatePassword()).valid).toBe(true);
    }
  });

  it('não repete o mesmo valor', () => {
    const values = new Set(Array.from({ length: 50 }, () => generatePassword()));
    expect(values.size).toBe(50);
  });

  it('evita caracteres ambíguos', () => {
    const generated = Array.from({ length: 50 }, () => generatePassword()).join('');
    expect(generated).not.toMatch(/[0O1lI]/);
  });
});
