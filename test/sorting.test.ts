import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateNav } from '../src/generateNav.js';
import { directiveProblem, extractFlags } from '../src/navConfig.js';
import { parseSort, toTimestamp } from '../src/sorting.js';
import type { NavItem } from '../src/types.js';
import { createFixture, removeFixture, type Tree } from './testUtils.js';

let root: string;

function build(tree: Tree, options?: Parameters<typeof generateNav>[1]) {
  root = createFixture(tree);
  return generateNav(root, options);
}

afterEach(() => {
  if (root) removeFixture(root);
  vi.restoreAllMocks();
});

/** The texts inside the first dropdown, after its Overview link. */
function dropdownTexts(nav: NavItem[]): string[] {
  const items = (nav[0] as { items: { text: string }[] }).items;
  return items.slice(1).map((item) => item.text);
}

function post(title: string, date?: string, extra = ''): string {
  return `---\ntitle: ${title}\n${date ? `date: ${date}\n` : ''}${extra}---\n`;
}

// Alphabetical by file name: a-old, b-new, c-mid, d-undated.
const posts: Tree = {
  'index.md': '# Blog',
  'a-old.md': post('Old', '2024-01-01'),
  'b-new.md': post('New', '2026-03-01'),
  'c-mid.md': post('Mid', '2025-06-15'),
  'd-undated.md': post('Undated'),
};

describe('parseSort', () => {
  it('reads a key and an optional direction', () => {
    expect(parseSort('date desc')).toEqual([{ key: 'date', direction: 'desc' }]);
    expect(parseSort('title')).toEqual([{ key: 'title', direction: 'asc' }]);
  });

  it('reads several keys, separated by commas', () => {
    expect(parseSort('blog.sticky desc, date desc')).toEqual([
      { key: 'blog.sticky', direction: 'desc' },
      { key: 'date', direction: 'desc' },
    ]);
    expect(parseSort('date desc,')).toMatch(/needs a key/);
  });

  it('explains what is wrong with a bad value', () => {
    expect(parseSort('')).toMatch(/needs a key/);
    expect(parseSort('date newest')).toMatch(/not a direction/);
  });
});

describe('settings', () => {
  it('reads every setting, and keeps them out of the entries', () => {
    const { lines, flags } = extractFlags(['index.md', '.sort: date desc', '.link', '.inherit', '.hide', '...']);
    expect(flags).toEqual({
      hide: true,
      skip: false,
      link: true,
      inherit: true,
      sort: [{ key: 'date', direction: 'desc' }],
    });
    expect(lines).toEqual(['index.md', '...']);
  });

  it.each([
    ['.sort: date desc', null],
    ['.link', null],
    ['.hide-all', null],
    ['.sort', 'needs a key'],
    ['.link: yes', 'takes no value'],
    ['.colapsed', 'not a setting'],
  ])('checks %s', (line, problem) => {
    const result = directiveProblem(line);
    if (problem === null) expect(result).toBeNull();
    else expect(result).toContain(problem);
  });

  it('warns about a bad setting, naming the file and line', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    build({ blog: { ...posts, '.nav': 'index.md\n.sort: date newest\n' } });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"\.sort: date newest" at .*\.nav:2: .*not a direction/));
  });
});

describe('.sort', () => {
  it('sorts a dropdown by date, newest first, with undated pages last', () => {
    const nav = build({ blog: { ...posts, '.nav': '.sort: date desc\n' } });
    expect(dropdownTexts(nav)).toEqual(['New', 'Mid', 'Old', 'Undated']);
  });

  it('reads the blog plugin date, and a .sidebar file shared with Auto Sidebar', () => {
    const nav = build(
      {
        blog: {
          'index.md': '# Blog',
          'one.md': post('One', undefined, 'blog:\n  date: 2026-01-01\n'),
          'two.md': post('Two', undefined, 'blog:\n  date: 2026-02-01\n'),
          '.sidebar': 'index.md:All posts\n.sort: date desc\n',
        },
      },
      { configFilenames: ['.nav', '.sidebar'] },
    );
    expect(dropdownTexts(nav)).toEqual(['Two', 'One']);
  });

  it('keeps sticky posts on top, then sorts the rest by date, with several keys', () => {
    const nav = build({
      blog: {
        'index.md': '# Blog',
        'a.md': post('Pinned old', undefined, 'blog:\n  date: 2024-01-01\n  sticky: true\n'),
        'b.md': post('Newest', undefined, 'blog:\n  date: 2026-01-01\n'),
        'c.md': post('Unpinned', undefined, 'blog:\n  date: 2025-01-01\n  sticky: false\n'),
        '.nav': '.sort: blog.sticky desc, date desc\n',
      },
    });
    expect(dropdownTexts(nav)).toEqual(['Pinned old', 'Newest', 'Unpinned']);
  });

  it('sorts by title, keeping listed entries in place', () => {
    const nav = build({ docs: { ...posts, '.nav': 'd-undated.md:Aardvark\n...\n.sort: title\n' } });
    expect(dropdownTexts(nav)).toEqual(['Aardvark', 'Mid', 'New', 'Old']);
  });

  it('applies the sort option to every directory, and a directory .sort wins', () => {
    const nav = build({ blog: { ...posts }, notes: { ...posts, '.nav': '.sort: name\n' } }, { sort: 'date desc' });
    const texts = (index: number) => (nav[index] as { items: { text: string }[] }).items.slice(1).map((i) => i.text);
    expect(texts(0)).toEqual(['New', 'Mid', 'Old', 'Undated']);
    expect(texts(1)).toEqual(['Old', 'New', 'Mid', 'Undated']);
  });

  it('sorts top-level sections by their landing pages', () => {
    const nav = build({
      '.nav': '.sort: date desc\n',
      older: { 'index.md': post('Older', '2025-01-01') },
      newer: { 'index.md': post('Newer', '2026-01-01') },
    });
    expect(nav.map((item) => item.text)).toEqual(['Newer', 'Older']);
  });

  it('still honours .link alongside .sort', () => {
    const nav = build({ blog: { ...posts, '.nav': '.link\n.sort: date desc\n' } });
    expect(nav).toEqual([{ text: 'Blog', link: '/blog/', activeMatch: '^/blog(?:/|$)' }]);
  });
});

describe('.limit and .more', () => {
  it('shows only the first entries after sorting', () => {
    const nav = build({ blog: { ...posts, '.nav': '.sort: date desc\n.limit: 2\n' } });
    expect(dropdownTexts(nav)).toEqual(['New', 'Mid']);
  });

  it('ends with a link to the landing page when entries were left out and .more is set', () => {
    const nav = build({ blog: { ...posts, '.nav': '.sort: date desc\n.limit: 2\n.more: Older posts\n' } });
    const items = (nav[0] as { items: { text: string; link?: string }[] }).items;
    expect(items.map((item) => item.text)).toEqual(['Overview', 'New', 'Mid', 'Older posts']);
    expect(items.at(-1)!.link).toBe('/blog/');
  });

  it('takes the limit and link text from the options', () => {
    const nav = build({ blog: { ...posts } }, { sort: 'date desc', limit: 1, more: 'More' });
    expect(dropdownTexts(nav)).toEqual(['New', 'More']);
  });

  it.each([
    ['.limit: 5', null],
    ['.limit: ten', 'whole number'],
    ['.more:', 'link text'],
  ])('checks %s', (line, problem) => {
    const result = directiveProblem(line);
    if (problem === null) expect(result).toBeNull();
    else expect(result).toContain(problem);
  });
});

describe('dates and times', () => {
  it('reads a time without an offset as UTC, and an offset as written', () => {
    expect(toTimestamp('2026-10-20 14:30')).toBe(Date.UTC(2026, 9, 20, 14, 30));
    expect(toTimestamp('2026-10-20T14:30:00-04:00')).toBe(Date.UTC(2026, 9, 20, 18, 30));
  });

  it('sorts a dropdown by date and time, newest first', () => {
    const nav = build({
      meetings: {
        'index.md': '# Meetings',
        'standup.md': post('Standup', '2026-10-20 09:30'),
        'retro.md': post('Retro', '2026-10-20T16:00'),
        'planning.md': post('Planning', '2026-10-20'),
        '.nav': '.sort: date desc\n',
      },
    });
    expect(dropdownTexts(nav)).toEqual(['Retro', 'Standup', 'Planning']);
  });
});
