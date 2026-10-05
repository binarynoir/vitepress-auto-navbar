import { describe, expect, it } from 'vitest';
import { formatTitle, truncateTitle } from '../src/formatTitle.js';

describe('formatTitle', () => {
  it('strips extension and ordering prefix, and title-cases words', () => {
    expect(formatTitle('01-getting-started.md')).toBe('Getting Started');
  });

  it('preserves acronyms', () => {
    expect(formatTitle('CI-API-guide')).toBe('CI API Guide');
  });
});

describe('truncateTitle', () => {
  it('leaves short titles alone and truncates long ones with an ellipsis', () => {
    expect(truncateTitle('Short', 10)).toBe('Short');
    expect(truncateTitle('A very long title', 8)).toBe('A very…');
  });
});
