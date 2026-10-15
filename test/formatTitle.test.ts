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

  it('strips matching surrounding quotes', () => {
    expect(formatTitle('"quoted-name"')).toBe('Quoted Name');
    expect(formatTitle("'single'")).toBe('Single');
    expect(formatTitle('"unbalanced')).toBe('"unbalanced');
  });

  it('keeps from, into, near, onto and with lowercase mid-title', () => {
    expect(formatTitle('working-with-data-from-apis-into-sql')).toBe('Working with Data from Apis into Sql');
    expect(formatTitle('near-the-edge-onto-it')).toBe('Near the Edge onto It');
  });

  it('applies word and multi-word replacements as written', () => {
    const replacements = {
      github: 'GitHub',
      'vs code': 'VS Code',
      'visual-studio-code': 'Visual Studio Code',
      ios: 'iOS',
    };
    expect(formatTitle('github-actions', 50, replacements)).toBe('GitHub Actions');
    expect(formatTitle('setup-vs-code-and-github', 50, replacements)).toBe('Setup VS Code and GitHub');
    expect(formatTitle('Visual_Studio_Code-tips', 50, replacements)).toBe('Visual Studio Code Tips');
    expect(formatTitle('ios-apps', 50, replacements)).toBe('iOS Apps');
    expect(formatTitle('vs-other', 50, replacements)).toBe('Vs Other');
  });
});

describe('truncateTitle', () => {
  it('leaves short titles alone and truncates long ones with an ellipsis', () => {
    expect(truncateTitle('Short', 10)).toBe('Short');
    expect(truncateTitle('A very long title', 8)).toBe('A very…');
  });
});
