import fs from 'node:fs';
import path from 'node:path';
import { formatTitle, truncateTitle } from './formatTitle.js';
import { createExclusionContext, isExcluded, type ExclusionContext } from './exclusions.js';
import {
  explicitTitleFor,
  getIndexFilename,
  getMarkdownTitle,
  getSectionTitleFrontmatter,
  isIndexFilename,
  readDirectoryConfig,
  readNavJsonOverride,
  sortItemsByOrder,
  type DirectoryConfig,
} from './navConfig.js';
import { getErrorMessage } from './util.js';
import type { GenerateNavOptions, NavItem, ResolvedNavOptions } from './types.js';

/** The default theme can't render deeper than top-level → dropdown → section → link. */
const MAX_SUPPORTED_DEPTH = 3;

/**
 * Internal build shape. Which nesting levels are legal is enforced by `depth`
 * (see {@link buildDirectoryItem}), not by the type, then narrowed to the
 * public {@link NavItem} at the {@link generateNav} boundary.
 */
interface BuiltItem {
  text: string;
  link?: string;
  items?: BuiltItem[];
  activeMatch?: string;
}

interface GenerateContext {
  rootPath: string;
  options: ResolvedNavOptions;
  exclusions: ExclusionContext;
  /** `ROOT=` links found in nested `.nav` files, waiting to be placed in the top-level navbar. */
  hoisted: BuiltItem[];
}

/**
 * Scans `rootPath` and builds a VitePress `themeConfig.nav` array: each
 * top-level markdown file becomes a link, and each top-level directory becomes
 * a link or a dropdown of its landing page, files and subdirectories.
 *
 * See the README for the `.nav` / `.exclude` config file syntax.
 */
export function generateNav(rootPath: string, options: GenerateNavOptions = {}): NavItem[] {
  const requestedDepth = Math.trunc(options.maxDepth ?? 2);
  if (requestedDepth > MAX_SUPPORTED_DEPTH) {
    console.warn(
      `[vitepress-auto-navbar] maxDepth ${requestedDepth} exceeds what the default theme can render; using ${MAX_SUPPORTED_DEPTH}`,
    );
  }

  const resolved: ResolvedNavOptions = {
    maxDepth: Math.min(MAX_SUPPORTED_DEPTH, Math.max(1, requestedDepth)),
    maxTitleLength: options.maxTitleLength ?? 50,
    configFilenames: options.configFilenames ?? ['.nav'],
    excludeFilenames: options.excludeFilenames ?? ['.exclude'],
    indexTitle: options.indexTitle ?? 'Overview',
    flattenSinglePage: options.flattenSinglePage ?? true,
    activeMatch: options.activeMatch ?? true,
    verbose: options.verbose ?? false,
  };

  const ctx: GenerateContext = {
    rootPath,
    options: resolved,
    exclusions: createExclusionContext(rootPath, resolved.excludeFilenames),
    hoisted: [],
  };

  if (resolved.verbose) {
    console.log(`[vitepress-auto-navbar] scanning ${rootPath} (maxDepth=${resolved.maxDepth})`);
  }

  const override = readNavJsonOverride(rootPath);
  if (override) return override;

  const config = readDirectoryConfig(rootPath, resolved.configFilenames, resolved.verbose);
  const nav: BuiltItem[] = buildChildren(ctx, '', 0, config, true);

  if (resolved.verbose) {
    console.log(`[vitepress-auto-navbar] generated ${nav.length} top-level item(s)`);
  }

  return nav as NavItem[];
}

/**
 * Builds the nav item(s) for one directory at `depth` (1 = top level). Usually
 * one item, but a `nav.json` override may supply several, or none.
 *
 * - At `maxDepth`, or with a `.link` flag, the directory is a plain link to its
 *   landing page (skipped if it has none and can't expand instead).
 * - Otherwise it's a dropdown/section: its landing page (labelled by
 *   `indexTitle`) first, then its files and subdirectories. With
 *   `flattenSinglePage`, one visible entry collapses it into a plain link.
 */
function buildDirectoryItem(
  ctx: GenerateContext,
  dirPath: string,
  depth: number,
  parent: DirectoryConfig,
): BuiltItem[] {
  if (isExcluded(dirPath, ctx.exclusions)) return [];

  const fullDir = path.posix.join(ctx.rootPath, dirPath);
  const override = readNavJsonOverride(fullDir);
  if (override) return override as BuiltItem[];

  const config = readDirectoryConfig(fullDir, ctx.options.configFilenames, ctx.options.verbose);
  if (config.flags.skip) return [];

  const urlDir = toUrlDir(dirPath);
  const title = resolveDirectoryTitle(ctx, dirPath, fullDir, parent);
  const index = resolveIndex(ctx, dirPath, fullDir, config);
  const landing = index && !index.hidden && !config.flags.hide ? urlDir : undefined;
  const activeMatch = ctx.options.activeMatch ? { activeMatch: toActiveMatch(urlDir) } : {};

  const atMaxDepth = depth >= ctx.options.maxDepth;
  if ((atMaxDepth || config.flags.link) && landing) {
    return [{ text: title, link: landing, ...activeMatch }];
  }
  if (atMaxDepth) return [];

  const items: BuiltItem[] = [];
  if (landing && index) {
    items.push({ text: resolveIndexLabel(ctx, fullDir, index, title), link: landing });
  }
  items.push(...buildChildren(ctx, dirPath, depth, config, false));
  if (!items.length) return [];

  const [only] = items;
  if (ctx.options.flattenSinglePage && items.length === 1 && !only.items) {
    return [{ text: title, link: only.link, ...activeMatch }];
  }

  // Only a top-level dropdown needs to stay highlighted across its subtree; a
  // section inside one has no link of its own to highlight.
  return [{ text: title, items, ...(depth === 1 ? activeMatch : {}) }];
}

/**
 * Gathers a directory's markdown files, subdirectories and inline web links,
 * sorted per its `.nav` directives. `depth` is the depth of `dirPath` itself
 * (0 for the docs root), so its children sit at `depth + 1`.
 *
 * At the docs root, a landing page (`index.md`) is omitted unless a `.nav`
 * line names it, since the site logo already links home.
 */
function buildChildren(
  ctx: GenerateContext,
  dirPath: string,
  depth: number,
  config: DirectoryConfig,
  isRoot: boolean,
): BuiltItem[] {
  const { maxTitleLength } = ctx.options;
  const fullDir = path.posix.join(ctx.rootPath, dirPath);
  const { directives } = config;

  const hiddenNames = new Set(
    directives.filter((i) => i.hidden && !i.isWebLink && i.name !== '...').map((i) => i.name.toLowerCase()),
  );
  const explicitNames = new Set(
    directives.filter((i) => !i.hidden && !i.isWebLink && i.name !== '...').map((i) => i.name.toLowerCase()),
  );
  const titleOverrides = new Map<string, string>();
  for (const item of directives) {
    if (!item.hidden && item.title) {
      titleOverrides.set(item.isWebLink && item.url ? item.url : item.name, item.title);
    }
  }

  let dirEntries: string[];
  try {
    dirEntries = fs.readdirSync(fullDir);
  } catch (error) {
    console.error(`[vitepress-auto-navbar] failed to read ${fullDir}: ${getErrorMessage(error)}`);
    return [];
  }

  for (const [name, title] of config.inheritedTitles) {
    const onDisk = dirEntries.find((entry) => entry.toLowerCase() === name);
    if (onDisk && !titleOverrides.has(onDisk)) titleOverrides.set(onDisk, title);
  }

  const itemTypes = new Map<string, 'file' | 'directory' | 'weblink'>();
  const allNames: string[] = [];

  for (const entry of dirEntries) {
    if (isSkippedEntryName(entry) || hiddenNames.has(entry.toLowerCase())) continue;
    if (isIndexFilename(entry) && !(isRoot && explicitNames.has(entry.toLowerCase()))) continue;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(path.posix.join(fullDir, entry));
    } catch {
      continue;
    }

    const relPath = path.posix.join(dirPath, entry);
    if (stat.isDirectory()) {
      if (isExcluded(relPath, ctx.exclusions)) continue;
      allNames.push(entry);
      itemTypes.set(entry, 'directory');
    } else if (stat.isFile() && path.extname(entry) === '.md') {
      if (isExcluded(relPath, ctx.exclusions)) continue;
      allNames.push(entry);
      itemTypes.set(entry, 'file');
    }
  }

  // `ROOT=` means "the top-level navbar", so inside a nested dropdown it's
  // hoisted out to sit next to that dropdown's top-level ancestor instead of
  // being rendered in place.
  for (const item of directives) {
    if (item.hidden || !item.isWebLink || !item.url) continue;
    if (item.isRootLevel && !isRoot) {
      if (item.title) ctx.hoisted.push({ text: truncateTitle(item.title, maxTitleLength), link: item.url });
      continue;
    }
    if (!allNames.includes(item.url)) {
      itemTypes.set(item.url, 'weblink');
      allNames.push(item.url);
    }
  }

  const results: BuiltItem[] = [];
  for (const name of sortItemsByOrder(allNames, directives)) {
    const type = itemTypes.get(name);

    if (type === 'file') {
      const explicitTitle = titleOverrides.get(name) ?? getMarkdownTitle(path.posix.join(fullDir, name));
      results.push({
        text: explicitTitle ? truncateTitle(explicitTitle, maxTitleLength) : formatTitle(name, maxTitleLength),
        link: toFileUrl(dirPath, name),
      });
    } else if (type === 'weblink') {
      results.push({ text: truncateTitle(titleOverrides.get(name) ?? name, maxTitleLength), link: name });
    } else if (type === 'directory') {
      if (ctx.options.verbose) console.log(`processing: ${path.posix.join(dirPath, name)}`);
      results.push(...buildDirectoryItem(ctx, path.posix.join(dirPath, name), depth + 1, config));
      if (isRoot) results.push(...ctx.hoisted.splice(0));
    }
  }

  return results;
}

/** Finds a directory's landing page and what its own `.nav` file says about it. */
function resolveIndex(
  ctx: GenerateContext,
  dirPath: string,
  fullDir: string,
  config: DirectoryConfig,
): { filename: string; hidden: boolean; title?: string } | null {
  const filename = getIndexFilename(fullDir);
  if (!filename || isExcluded(path.posix.join(dirPath, filename), ctx.exclusions)) return null;

  const directive = config.directives.find((d) => !d.isWebLink && d.name.toLowerCase() === filename.toLowerCase());
  return { filename, hidden: !!directive?.hidden, title: explicitTitleFor(config, filename) };
}

/** The label for the entry linking to a dropdown's own landing page. */
function resolveIndexLabel(
  ctx: GenerateContext,
  fullDir: string,
  index: { filename: string; title?: string },
  directoryTitle: string,
): string {
  const { indexTitle, maxTitleLength } = ctx.options;
  if (index.title) return truncateTitle(index.title, maxTitleLength);
  if (indexTitle !== false) return truncateTitle(indexTitle, maxTitleLength);

  const pageTitle = getMarkdownTitle(path.posix.join(fullDir, index.filename));
  return pageTitle ? truncateTitle(pageTitle, maxTitleLength) : directoryTitle;
}

/**
 * Resolves a directory's title: an explicit title on its entry in the
 * *parent's* `.nav` file wins, then its landing page's `section-title`
 * frontmatter, then its formatted directory name.
 */
function resolveDirectoryTitle(
  ctx: GenerateContext,
  dirPath: string,
  fullDir: string,
  parent: DirectoryConfig,
): string {
  const { maxTitleLength } = ctx.options;
  const baseName = path.posix.basename(dirPath);

  const explicitTitle = explicitTitleFor(parent, baseName);
  if (explicitTitle) return truncateTitle(explicitTitle, maxTitleLength);

  const indexFile = getIndexFilename(fullDir);
  if (indexFile) {
    const sectionTitle = getSectionTitleFrontmatter(path.posix.join(fullDir, indexFile));
    if (sectionTitle) return truncateTitle(sectionTitle, maxTitleLength);
  }

  return formatTitle(baseName, maxTitleLength);
}

/**
 * Files/directories VitePress itself never routes to a page: dotfiles,
 * anything prefixed with `_` (partials/snippets meant to be transcluded), and
 * `public` (the static-assets root). `-`-prefixed and `assets`-prefixed
 * entries are this generator's own additional conventions for non-page
 * content, same as `vitepress-auto-sidebar`.
 */
function isSkippedEntryName(name: string): boolean {
  return (
    name.startsWith('.') ||
    name.startsWith('_') ||
    name.startsWith('-') ||
    name.startsWith('assets') ||
    name === 'public'
  );
}

function toUrlDir(dirPath: string): string {
  return `/${dirPath}/`.replace(/\/+/g, '/');
}

/** A page's clean URL: `.md` is dropped, matching a hand-written `link: '/glossary'`. */
function toFileUrl(dirPath: string, filename: string): string {
  if (isIndexFilename(filename)) return toUrlDir(dirPath);
  return `/${path.posix.join(dirPath, filename.replace(/\.md$/i, ''))}`.replace(/\/+/g, '/');
}

/** Matches the directory's own URL and anything beneath it. */
function toActiveMatch(urlDir: string): string {
  const escaped = urlDir.replace(/\/$/, '').replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  return `^${escaped}(?:/|$)`;
}
