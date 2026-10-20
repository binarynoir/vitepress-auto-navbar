import { afterEach, describe, expect, it } from 'vitest';
import { generateNav } from '../src/generateNav.js';
import type { NavItem } from '../src/types.js';
import { createFixture, removeFixture, type Tree } from './testUtils.js';

let root: string;

function build(tree: Tree, options?: Parameters<typeof generateNav>[1]) {
  root = createFixture(tree);
  return generateNav(root, options);
}

afterEach(() => {
  if (root) removeFixture(root);
});

/** Every item's text, at any depth. */
function texts(items: NavItem[]): string[] {
  return items.flatMap((item) => [item.text, ...texts(('items' in item && item.items ? item.items : []) as NavItem[])]);
}

const page = (frontmatter: string, title: string) => `---\n${frontmatter}\n---\n\n# ${title}\n`;

const tree: Tree = {
  guide: {
    'index.md': '# Guide',
    'ready.md': page('title: Ready', 'Ready'),
    'draft.md': page('draft: true', 'Draft'),
    'kept.md': page('draft: false', 'Kept'),
    'post.md': page('blog:\n  draft: true', 'Blog draft'),
  },
  upcoming: { 'index.md': page('draft: true', 'Upcoming') },
};

describe('excludeFrontmatter', () => {
  it('shows every page without the option', () => {
    expect(texts(build(tree))).toEqual(expect.arrayContaining(['Draft', 'Blog draft', 'Upcoming']));
  });

  it('hides pages whose frontmatter sets a listed key to true, nested keys included', () => {
    const all = texts(build(tree, { excludeFrontmatter: ['draft', 'blog.draft'] }));
    expect(all).not.toContain('Draft');
    expect(all).not.toContain('Blog draft');
    expect(all).toEqual(expect.arrayContaining(['Ready', 'Kept']));
  });

  it('drops a top-level entry whose only page is hidden', () => {
    expect(texts(build(tree, { excludeFrontmatter: ['draft'] }))).not.toContain('Upcoming');
  });
});
