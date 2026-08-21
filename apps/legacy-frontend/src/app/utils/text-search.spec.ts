import { normalizeSearch, matchesAllTokens } from './text-search';

describe('text-search', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalizeSearch('QUÉSO LONCO.200g')).toBe('queso lonco 200g');
  });
  it('matches tokens in any order', () => {
    expect(matchesAllTokens('QUESO LONCO 200g', 'lonco 200g queso')).toBe(true);
  });
  it('requires all tokens', () => {
    expect(matchesAllTokens('QUESO LONCO', 'queso nestle')).toBe(false);
  });
});
