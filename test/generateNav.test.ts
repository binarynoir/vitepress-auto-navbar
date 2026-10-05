import { afterEach, describe, expect, it } from 'vitest';
import { generateNav } from '../src/generateNav.js';
import { createFixture, removeFixture, type Tree } from './testUtils.js';

let root: string;

function build(tree: Tree, options?: Parameters<typeof generateNav>[1]) {
  root = createFixture(tree);
  return generateNav(root, options);
}

afterEach(() => {
  if (root) removeFixture(root);
});

describe('top-level entries', () => {
  it('turns a directory with only a landing page into a plain link', () => {
    const nav = build({ tools: { 'index.md': '# Tools' } });
    expect(nav).toEqual([{ text: 'Tools', link: '/tools/', activeMatch: '^/tools(?:/|$)' }]);
  });

  it('turns a directory with several pages into a dropdown led by an Overview link', () => {
    const nav = build({
      products: { 'index.md': '# Products', 'widgets.md': '# Widgets', 'gadgets.md': '# Gadgets' },
    });
    expect(nav).toEqual([
      {
        text: 'Products',
        activeMatch: '^/products(?:/|$)',
        items: [
          { text: 'Overview', link: '/products/' },
          { text: 'Gadgets', link: '/products/gadgets' },
          { text: 'Widgets', link: '/products/widgets' },
        ],
      },
    ]);
  });

  it('turns top-level markdown files into links, and leaves out the root index', () => {
    const nav = build({ 'index.md': '# Home', 'glossary.md': '# Glossary' });
    expect(nav).toEqual([{ text: 'Glossary', link: '/glossary' }]);
  });

  it('includes the root landing page only when a .nav line names it', () => {
    const nav = build({ 'index.md': '# Home', '.nav': 'index.md:Home', guides: { 'index.md': '# Guides' } });
    expect(nav[0]).toEqual({ text: 'Home', link: '/' });
  });

  it('skips dotfiles, underscore-, dash-prefixed, assets and public entries', () => {
    const nav = build({
      '.vitepress': { 'config.ts': '' },
      _partials: { 'index.md': '# Partials' },
      '-drafts': { 'index.md': '# Drafts' },
      assets: { 'logo.png': '' },
      public: { 'favicon.ico': '' },
      guides: { 'index.md': '# Guides' },
    });
    expect(nav.map((i) => i.text)).toEqual(['Guides']);
  });

  it('falls back to README.md as the landing page', () => {
    const nav = build({ guides: { 'README.md': '# Guides', 'setup.md': '# Setup' } });
    expect(nav[0]).toMatchObject({ items: [{ text: 'Overview', link: '/guides/' }, { text: 'Setup' }] });
  });

  it('omits the Overview entry when there is no landing page', () => {
    const nav = build({ guides: { 'a.md': '# A', 'b.md': '# B' } });
    expect(nav[0]).toMatchObject({ items: [{ text: 'A' }, { text: 'B' }] });
  });

  it('flattens a directory whose only entry is a single page, with no landing page', () => {
    const nav = build({ guides: { 'setup.md': '# Setup' } });
    expect(nav[0]).toMatchObject({ text: 'Guides', link: '/guides/setup' });
  });

  it('skips a directory with no pages at all', () => {
    expect(build({ empty: null })).toEqual([]);
  });
});

describe('titles', () => {
  it('resolves file titles: .nav override, frontmatter, heading, filename', () => {
    const nav = build({
      '.nav': 'a.md:From Nav',
      'a.md': '---\ntitle: Frontmatter A\n---\n# Heading A',
      'b.md': '---\ntitle: Frontmatter B\n---\n# Heading B',
      'c.md': '# Heading C',
      'dd-ee.md': 'no heading',
    });
    expect(nav.map((i) => i.text)).toEqual(['From Nav', 'Frontmatter B', 'Heading C', 'Dd Ee']);
  });

  it('resolves directory titles: parent .nav, section-title, formatted name', () => {
    const nav = build({
      '.nav': 'a:From Parent Nav',
      a: { 'index.md': '---\nsection-title: Ignored\n---\n# A' },
      b: { 'index.md': '---\nsection-title: From Frontmatter\n---\n# B' },
      'c-d': { 'index.md': '# C' },
    });
    expect(nav.map((i) => i.text)).toEqual(['From Parent Nav', 'From Frontmatter', 'C D']);
  });

  it('uses indexTitle for the landing entry, or the page title when set to false', () => {
    const tree: Tree = { g: { 'index.md': '# Guides Home', 'x.md': '# X' } };
    expect(build(tree, { indexTitle: 'Start' })[0]).toMatchObject({ items: [{ text: 'Start' }, { text: 'X' }] });
    removeFixture(root);
    expect(build(tree, { indexTitle: false })[0]).toMatchObject({ items: [{ text: 'Guides Home' }, { text: 'X' }] });
  });

  it('lets an index.md line in .nav override indexTitle', () => {
    const nav = build({ g: { '.nav': 'index.md:Intro', 'index.md': '# G', 'x.md': '# X' } });
    expect(nav[0]).toMatchObject({ items: [{ text: 'Intro' }, { text: 'X' }] });
  });

  it('truncates long titles', () => {
    const nav = build({ 'a.md': '# ' + 'x'.repeat(80) }, { maxTitleLength: 10 });
    expect(nav[0].text).toBe('xxxxxxxxx…');
  });
});

describe('.nav ordering and hiding', () => {
  it('orders explicitly listed entries first, then the rest alphabetically', () => {
    const nav = build({
      '.nav': 'zebra\nmango',
      apple: { 'index.md': '# Apple' },
      mango: { 'index.md': '# Mango' },
      zebra: { 'index.md': '# Zebra' },
    });
    expect(nav.map((i) => i.text)).toEqual(['Zebra', 'Mango', 'Apple']);
  });

  it('places unlisted entries at the ... marker', () => {
    const nav = build({
      '.nav': 'first.md\n...\nlast.md',
      'first.md': '# First',
      'last.md': '# Last',
      'm.md': '# M',
      'a.md': '# A',
    });
    expect(nav.map((i) => i.text)).toEqual(['First', 'A', 'M', 'Last']);
  });

  it('hides entries prefixed with -', () => {
    const nav = build({ '.nav': '-contributing.md', 'contributing.md': '# C', 'glossary.md': '# G' });
    expect(nav.map((i) => i.text)).toEqual(['G']);
  });

  it('inserts external links in place, with or without quotes', () => {
    const nav = build({
      '.nav': 'a.md\n"https://status.example.com":Status\n...',
      'a.md': '# A',
      'b.md': '# B',
    });
    expect(nav).toEqual([
      { text: 'A', link: '/a' },
      { text: 'Status', link: 'https://status.example.com' },
      { text: 'B', link: '/b' },
    ]);
  });

  it('puts an external link inside a dropdown when its .nav file lists one', () => {
    const nav = build({
      g: { '.nav': '"https://example.com/faq":FAQ', 'a.md': '# A', 'b.md': '# B' },
    });
    expect(nav[0]).toMatchObject({
      items: [{ text: 'FAQ', link: 'https://example.com/faq' }, { text: 'A' }, { text: 'B' }],
    });
  });

  it('hoists a ROOT= link from a nested .nav next to its top-level ancestor', () => {
    const nav = build({
      '.nav': 'g\nz.md',
      g: { '.nav': 'ROOT="https://status.example.com":Status', 'a.md': '# A', 'b.md': '# B' },
      'z.md': '# Z',
    });
    expect(nav.map((i) => i.text)).toEqual(['G', 'Status', 'Z']);
    expect(nav[1]).toEqual({ text: 'Status', link: 'https://status.example.com' });
    expect((nav[0] as { items: unknown[] }).items).toHaveLength(2);
  });

  it('.hide drops a directory’s own landing link but keeps its children', () => {
    const nav = build({ g: { '.nav': '.hide', 'index.md': '# G', 'a.md': '# A', 'b.md': '# B' } });
    expect(nav[0]).toMatchObject({ items: [{ text: 'A' }, { text: 'B' }] });
    expect((nav[0] as { items: { text: string }[] }).items.map((i) => i.text)).not.toContain('Overview');
  });

  it('.hideall removes a directory and everything under it', () => {
    const nav = build({ g: { '.nav': '.hideall', 'index.md': '# G' }, h: { 'index.md': '# H' } });
    expect(nav.map((i) => i.text)).toEqual(['H']);
  });
});

describe('.link flag', () => {
  it('renders a multi-page directory as one plain link to its landing page', () => {
    const nav = build({ g: { '.nav': '.link', 'index.md': '# G', 'a.md': '# A', 'b.md': '# B' } });
    expect(nav).toEqual([{ text: 'G', link: '/g/', activeMatch: '^/g(?:/|$)' }]);
  });

  it('is ignored when the directory has no landing page', () => {
    const nav = build({ g: { '.nav': '.link', 'a.md': '# A', 'b.md': '# B' } });
    expect(nav[0]).toMatchObject({ items: [{ text: 'A' }, { text: 'B' }] });
  });
});

describe('.inherit flag', () => {
  const opts = { configFilenames: ['.nav', '.sidebar'] };

  it('borrows a directory title from the sidebar file the .nav file would otherwise shadow', () => {
    const nav = build(
      {
        '.nav': 'tools-resources\n.inherit',
        '.sidebar': 'tools-resources:Tools & Resources',
        'tools-resources': { 'index.md': '# Tools Resources Home' },
      },
      opts,
    );
    expect(nav[0]).toMatchObject({ text: 'Tools & Resources' });
  });

  it('applies to entries .nav does not list, but never to hiding or order', () => {
    const nav = build(
      {
        '.nav': 'b.md\n.inherit',
        '.sidebar': 'a.md:Alpha\n-b.md',
        'a.md': '# A',
        'b.md': '# B',
      },
      opts,
    );
    expect(nav.map((i) => i.text)).toEqual(['B', 'Alpha']);
  });

  it("lets .nav's own title win over an inherited one", () => {
    const nav = build({ '.nav': 'a.md:Mine\n.inherit', '.sidebar': 'a.md:Theirs', 'a.md': '# A' }, opts);
    expect(nav.map((i) => i.text)).toEqual(['Mine']);
  });

  it('name:.inherit borrows the title for that entry only', () => {
    const nav = build(
      { '.nav': 'a.md:.inherit\nb.md', '.sidebar': 'a.md:Alpha\nb.md:Bravo', 'a.md': '# A', 'b.md': '# B' },
      opts,
    );
    expect(nav.map((i) => i.text)).toEqual(['Alpha', 'B']);
  });

  it('name:.inherit falls back to the normal title when the other file has none', () => {
    const nav = build({ '.nav': 'a.md:.inherit', '.sidebar': 'b.md:Bravo', 'a.md': '# A' }, opts);
    expect(nav.map((i) => i.text)).toEqual(['A']);
  });

  it('does nothing without the flag', () => {
    const nav = build({ '.nav': 'a.md', '.sidebar': 'a.md:Theirs', 'a.md': '# A' }, opts);
    expect(nav.map((i) => i.text)).toEqual(['A']);
  });
});

describe('depth', () => {
  const tree: Tree = {
    eng: {
      'index.md': '# Eng',
      arch: { 'index.md': '# Arch', 'client.md': '# Client', 'server.md': '# Server' },
      infra: { 'index.md': '# Infra' },
    },
  };

  it('links subdirectories to their landing page at the default maxDepth of 2', () => {
    const nav = build(tree);
    expect(nav[0]).toMatchObject({
      items: [
        { text: 'Overview', link: '/eng/' },
        { text: 'Arch', link: '/eng/arch/', activeMatch: '^/eng/arch(?:/|$)' },
        { text: 'Infra', link: '/eng/infra/' },
      ],
    });
  });

  it('expands multi-page subdirectories into labelled sections at maxDepth 3', () => {
    const nav = build(tree, { maxDepth: 3 });
    expect(nav[0]).toMatchObject({
      items: [
        { text: 'Overview', link: '/eng/' },
        {
          text: 'Arch',
          items: [
            { text: 'Overview', link: '/eng/arch/' },
            { text: 'Client', link: '/eng/arch/client' },
            { text: 'Server', link: '/eng/arch/server' },
          ],
        },
        { text: 'Infra', link: '/eng/infra/' },
      ],
    });
  });

  it('makes top-level directories plain links at maxDepth 1', () => {
    const nav = build(tree, { maxDepth: 1 });
    expect(nav).toEqual([{ text: 'Eng', link: '/eng/', activeMatch: '^/eng(?:/|$)' }]);
  });

  it('clamps maxDepth to what the default theme can render', () => {
    const deep = build(
      { a: { 'index.md': '# A', b: { 'index.md': '# B', c: { 'index.md': '# C', 'x.md': '# X' } } } },
      {
        maxDepth: 9,
      },
    );
    const json = JSON.stringify(deep);
    expect(json).toContain('/a/b/c/');
    expect(json).not.toContain('/a/b/c/x');
  });
});

describe('options', () => {
  it('keeps a one-entry dropdown when flattenSinglePage is false', () => {
    const nav = build({ g: { 'index.md': '# G' } }, { flattenSinglePage: false });
    expect(nav[0]).toMatchObject({ text: 'G', items: [{ text: 'Overview', link: '/g/' }] });
  });

  it('omits activeMatch when activeMatch is false', () => {
    const nav = build({ g: { 'index.md': '# G', 'a.md': '# A' } }, { activeMatch: false });
    expect(nav[0]).not.toHaveProperty('activeMatch');
  });

  it('reads alternate config filenames', () => {
    const nav = build({ '.menu': 'b.md\na.md', 'a.md': '# A', 'b.md': '# B' }, { configFilenames: ['.menu'] });
    expect(nav.map((i) => i.text)).toEqual(['B', 'A']);
  });

  it('escapes regex characters in activeMatch', () => {
    const nav = build({ 'v1.2': { 'index.md': '# V' } });
    expect(nav[0]).toMatchObject({ activeMatch: '^/v1\\.2(?:/|$)' });
    expect(new RegExp((nav[0] as { activeMatch: string }).activeMatch).test('/v1.2/page')).toBe(true);
    expect(new RegExp((nav[0] as { activeMatch: string }).activeMatch).test('/v1x2/page')).toBe(false);
  });
});

describe('.exclude and nav.json', () => {
  it('honours .exclude globs', () => {
    const nav = build({
      '.exclude': 'drafts/\ninternal-*.md',
      drafts: { 'index.md': '# Drafts' },
      'internal-notes.md': '# Notes',
      'public-notes.md': '# Public',
    });
    expect(nav.map((i) => i.text)).toEqual(['Public']);
  });

  it('uses a directory’s nav.json verbatim in place of its generated entry', () => {
    const nav = build({
      g: { 'nav.json': JSON.stringify({ text: 'Custom', link: '/custom' }), 'index.md': '# G' },
      h: { 'index.md': '# H' },
    });
    expect(nav).toEqual([
      { text: 'Custom', link: '/custom' },
      { text: 'H', link: '/h/', activeMatch: '^/h(?:/|$)' },
    ]);
  });

  it('splices in an array from a directory’s nav.json', () => {
    const nav = build({
      g: {
        'nav.json': JSON.stringify([
          { text: 'One', link: '/1' },
          { text: 'Two', link: '/2' },
        ]),
      },
    });
    expect(nav.map((i) => i.text)).toEqual(['One', 'Two']);
  });

  it('uses a root nav.json as the whole navbar', () => {
    const nav = build({ 'nav.json': JSON.stringify([{ text: 'Only', link: '/only' }]), g: { 'index.md': '# G' } });
    expect(nav).toEqual([{ text: 'Only', link: '/only' }]);
  });
});
