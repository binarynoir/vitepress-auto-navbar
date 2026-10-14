import { afterEach, describe, expect, it, vi } from 'vitest';
import { directiveProblem, parseNavDirectives } from '../src/navConfig.js';
import { generateNav } from '../src/generateNav.js';
import { createFixture, removeFixture } from './testUtils.js';

function parse(line: string) {
  return parseNavDirectives([line])[0];
}

describe('parseNavDirectives: web links', () => {
  it.each([
    ['https://example.com:Title'],
    ['https://example.com: Title'],
    ['https://example.com:"Title"'],
    ['https://example.com: "Title"'],
    ["https://example.com:'Title'"],
    ["https://example.com: 'Title'"],
    ['"https://example.com":"Title"'],
    ['"https://example.com": "Title"'],
    ["'https://example.com': 'Title'"],
  ])('parses %s', (line) => {
    expect(parse(line)).toMatchObject({ url: 'https://example.com', title: 'Title', isWebLink: true });
  });

  it('parses a ROOT link with a quoted title after a space', () => {
    expect(parse(`ROOT='https://example.com/x': "Portal"`)).toMatchObject({
      url: 'https://example.com/x',
      title: 'Portal',
      isWebLink: true,
      isRootLevel: true,
    });
  });

  it('keeps a port, query and fragment in a bare URL', () => {
    expect(parse('https://example.com:8080/a?b=1#c: Docs')).toMatchObject({
      url: 'https://example.com:8080/a?b=1#c',
      title: 'Docs',
    });
  });

  it('keeps a colon inside an unquoted title after a space', () => {
    expect(parse('https://example.com: Status: Live')).toMatchObject({
      url: 'https://example.com',
      title: 'Status: Live',
    });
  });
});

describe('parseNavDirectives: file titles', () => {
  it.each([['name.md:Title'], ['name.md: Title'], ['name.md:"Title"'], ['name.md: "Title"'], ["name.md: 'Title'"]])(
    'parses %s',
    (line) => {
      expect(parse(line)).toMatchObject({ name: 'name.md', title: 'Title' });
    },
  );
});

describe('directiveProblem', () => {
  it.each([['name.md'], ['name.md: "Title"'], ['https://example.com: "Title"'], ['[Group]'], ['...'], ['-old.md']])(
    'accepts %s',
    (line) => {
      expect(directiveProblem(line)).toBeNull();
    },
  );

  it.each([['https://example.com'], ['"https://example.com"'], ['name.md: "Title'], ["https://example.com: 'Title"]])(
    'rejects %s',
    (line) => {
      expect(directiveProblem(line)).not.toBeNull();
    },
  );
});

describe('.nav files', () => {
  let root: string | undefined;
  afterEach(() => {
    if (root) removeFixture(root);
    root = undefined;
    vi.restoreAllMocks();
  });

  it('keeps links whose quoted title follows a space', () => {
    root = createFixture({
      '.nav': 'a.md\nhttps://example.com/one: "One"\n"https://example.com/two": \'Two\'\n',
      'a.md': '# A',
    });
    expect(generateNav(root)).toEqual([
      { text: 'A', link: '/a' },
      { text: 'One', link: 'https://example.com/one' },
      { text: 'Two', link: 'https://example.com/two' },
    ]);
  });

  it('warns about a line it cannot parse, naming the file and line', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    root = createFixture({
      guides: { 'index.md': '# Guides', 'a.md': '# A', '.nav': '# links\na.md\nhttps://example.com/no-title\n' },
    });
    generateNav(root);
    const messages = warn.mock.calls.map((call) => String(call[0]));
    const matching = messages.filter((m) => m.includes('https://example.com/no-title'));
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatch(/guides\/\.nav:3/);
  });
});
