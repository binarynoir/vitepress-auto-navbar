import { afterEach, describe, expect, it } from 'vitest';
import { generateNav } from '../src/generateNav.js';
import { formatTitle } from '../src/formatTitle.js';
import { stripTagSyntax } from '../src/titles.js';
import { createFixture, removeFixture, type Tree } from './testUtils.js';

let root: string | undefined;

function build(tree: Tree, options?: Parameters<typeof generateNav>[1]) {
  root = createFixture(tree);
  return generateNav(root, options);
}

afterEach(() => {
  if (root) removeFixture(root);
  root = undefined;
});

describe('formatTitle replacements', () => {
  it('replaces whole words, case-insensitively, with the value as written', () => {
    expect(formatTitle('github-actions', 50, { GITHUB: 'GitHub' })).toBe('GitHub Actions');
    expect(formatTitle('cicd.md', 50, { cicd: 'CI/CD' })).toBe('CI/CD');
    expect(formatTitle('githubs', 50, { github: 'GitHub' })).toBe('Githubs');
  });
});

describe('stripTagSyntax', () => {
  it.each([
    ['Design ((tag|draft))', 'Design'],
    ['A ((tag/beta/#fff/#000)) B', 'A B'],
    ['Back ((<tag|old))', 'Back'],
    ['Plain (parenthesised) title', 'Plain (parenthesised) title'],
  ])('%s → %s', (input, expected) => {
    expect(stripTagSyntax(input)).toBe(expected);
  });
});

describe('titleReplacements', () => {
  it('applies to folder- and file-derived titles only', () => {
    const nav = build(
      {
        'github-actions': { 'index.md': 'no heading', 'api-setup.md': 'no heading', 'notes.md': '# github notes' },
      },
      { titleReplacements: { github: 'GitHub', api: 'API' } },
    );
    expect(nav[0].text).toBe('GitHub Actions');
    expect((nav[0] as { items: { text: string }[] }).items.map((i) => i.text)).toEqual([
      'Overview',
      'API Setup',
      'github notes',
    ]);
  });
});

describe('stripTags', () => {
  const tree: Tree = {
    guide: {
      'index.md': '# Guide',
      'design.md': '# Design ((tag|draft))',
      'plan.md': '---\ntitle: Plan ((tag|wip))\n---\n',
    },
  };

  it('removes markdown-tags syntax from titles by default', () => {
    const nav = build(tree, { indexTitle: false });
    expect(JSON.stringify(nav)).not.toContain('((');
    expect((nav[0] as { items: { text: string }[] }).items.map((i) => i.text)).toEqual(['Guide', 'Design', 'Plan']);
  });

  it('keeps it with stripTags: false', () => {
    expect(JSON.stringify(build(tree, { stripTags: false }))).toContain('Design ((tag|draft))');
  });
});

describe('transformTitle', () => {
  it('is called with every title and its source, before truncation', () => {
    const seen: string[] = [];
    const nav = build(
      { 'a-page.md': 'no heading', 'b.md': '# Bee' },
      {
        maxTitleLength: 8,
        transformTitle: (title, { source }) => {
          seen.push(`${source}:${title}`);
          return source === 'name' ? `${title}!!!!!!` : undefined;
        },
      },
    );
    expect(seen).toEqual(['name:A Page', 'page:Bee']);
    expect(nav.map((i) => i.text)).toEqual(['A Page!…', 'Bee']);
  });
});
