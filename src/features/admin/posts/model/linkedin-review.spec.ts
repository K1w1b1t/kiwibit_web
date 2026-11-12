import { composeLinkedInReview } from './linkedin-review';

describe('composeLinkedInReview', () => {
  it('normalizes and deduplicates hashtags and preserves the reviewed text', () => {
    expect(composeLinkedInReview(' Texto ', 'Kiwibit #CyberSecurity #kiwibit')).toEqual({
      valid: true,
      text: 'Texto\n\n#Kiwibit #CyberSecurity',
      hashtags: '#Kiwibit #CyberSecurity',
      companyLength: 30,
    });
  });

  it('allows an empty list of hashtags', () => {
    expect(composeLinkedInReview('Texto', '')).toEqual({
      valid: true,
      text: 'Texto',
      hashtags: '',
      companyLength: 5,
    });
  });

  it('rejects empty text and invalid hashtags', () => {
    expect(composeLinkedInReview(' ', '')).toEqual({
      valid: false,
      error: 'Informe o texto da publicação.',
    });
    expect(composeLinkedInReview('Texto', '#inválida!')).toEqual({
      valid: false,
      error: 'Use apenas letras, números e sublinhado nas hashtags.',
    });
  });

  it('checks the company budget after escaping special characters', () => {
    expect(composeLinkedInReview('#'.repeat(751), '')).toEqual({
      valid: false,
      error: 'O texto final excede o limite da página da empresa (1.500 caracteres).',
    });
    expect(composeLinkedInReview('a'.repeat(3001), '')).toEqual({
      valid: false,
      error: 'O texto final excede o limite do perfil pessoal (3.000 caracteres).',
    });
  });
});
