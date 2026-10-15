import { describe, expect, it } from 'vitest';
import { formatTitle, truncateTitle } from '../src/formatTitle.js';

describe('formatTitle', () => {
  it('strips extension and ordering prefix, and title-cases words', () => {
    expect(formatTitle('01-getting-started.md')).toBe('Getting Started');
  });

  it('preserves acronyms', () => {
    expect(formatTitle('CI-API-guide')).toBe('CI API Guide');
  });

  it('keeps minor words lowercase unless first or last', () => {
    expect(formatTitle('guide-to-the-cli')).toBe('Guide to the Cli');
    expect(formatTitle('the-state-of-the-art')).toBe('The State of the Art');
    expect(formatTitle('what-to-log-in')).toBe('What to Log In');
    expect(formatTitle('Tips-And-Tricks')).toBe('Tips and Tricks');
  });

  it('capitalises every word when titleCase is off', () => {
    expect(formatTitle('guide-to-the-cli', 50, {}, false)).toBe('Guide To The Cli');
  });
});

describe('truncateTitle', () => {
  it('leaves short titles alone and truncates long ones with an ellipsis', () => {
    expect(truncateTitle('Short', 10)).toBe('Short');
    expect(truncateTitle('A very long title', 8)).toBe('A very…');
  });
});
