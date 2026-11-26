import { composeLinkedInReview } from './linkedin-review';

describe('composeLinkedInReview', () => {
  it('normalizes and deduplicates hashtags and preserves the reviewed text', () => {
    expect(composeLinkedInReview(' Texto ', 'Kiwibit #CyberSecurity #kiwibit')).toEqual({
      valid: true,
      text: 'Texto\n\n#Kiwibit #CyberSecurity',
      hashtags: '#Kiwibit #CyberSecurity',
      length: 30,
    });
  });

  it('allows an empty list of hashtags', () => {
    expect(composeLinkedInReview('Texto', '')).toEqual({
      valid: true,
      text: 'Texto',
      hashtags: '',
      length: 5,
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

  it('counts the personal payload exactly, including emoji, newlines and hashtags', () => {
    const body = `${'*'.repeat(2992)}😀`;
    expect(composeLinkedInReview(body, '#tag')).toMatchObject({ valid: true, length: 3000 });
    expect(composeLinkedInReview(`${body}a`, '#tag')).toEqual({
      valid: false,
      error: 'Remova 1 caractere para publicar.',
      length: 3001,
    });
  });
});
