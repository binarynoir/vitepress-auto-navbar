import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { getErrorMessage } from './util.js';
import type { NavFrontmatter, NavItem } from './types.js';

/**
 * One parsed line from a `.nav` config file.
 *
 * Syntax supported (one directive per line, `#` starts a comment). It is the
 * same syntax `vitepress-auto-sidebar` uses for `.sidebar` files:
 *   itemName                       order a file or subdirectory
 *   itemName:Custom Title          order + override its display title
 *   itemName:.inherit              order + take its title from the other config files
 *   "https://example.com":Title    insert an external link in this dropdown
 *   ROOT="https://x.com":Title     insert an external link in the top-level navbar
 *   -itemName                      hide this item
 *   ...                            everything not explicitly listed goes here,
 *                                  sorted alphabetically
 * plus these flag lines (see {@link extractFlags}):
 *   .hide / .hideall / .link / .inherit
 */
export interface NavDirective {
  name: string;
  title?: string;
  url?: string;
  isWebLink?: boolean;
  isRootLevel?: boolean;
  hidden?: boolean;
  /** `name:.inherit`: take this entry's title from the other config files (see {@link DirectoryFlags.inherit}). */
  inherit?: boolean;
}

/** Whole-line flags that change how a directory as a whole is rendered. */
export interface DirectoryFlags {
  /** `.hide`: omit this directory's own link, but keep showing its children. */
  hide: boolean;
  /** `.hideall` / `.hide-all`: skip this directory and everything under it. */
  skip: boolean;
  /** `.link`: render this directory as one plain link to its landing page, never a dropdown. */
  link: boolean;
  /**
   * `.inherit` on its own line: also read the other files in `configFilenames`
   * (e.g. `.sidebar`) and borrow their `name:Title` overrides for every entry
   * this file doesn't title. Use `name:.inherit` to do it for one entry only.
   * Order, hiding and flags are never inherited.
   */
  inherit: boolean;
}

/** A directory's parsed `.nav` file: ordering directives plus its whole-directory flags. */
export interface DirectoryConfig {
  lines: string[];
  directives: NavDirective[];
  flags: DirectoryFlags;
  /** Titles borrowed via `.inherit` / `name:.inherit`, keyed by lowercased entry name. */
  inheritedTitles: Map<string, string>;
}

/** `name:.inherit` is a directive, not a literal title (quote it to get the literal text). */
const INHERIT_TITLE = '.inherit';

const WEB_LINK_RE = /^["']?(https?:\/\/[^"':]+)["']?:(?:"([^"]+)"|'([^']+)'|([^"':]+))$/i;
const QUOTED_TITLE_RE = /^([^:]+):(?:"([^"]+)"|'([^']+)')$/;

export function parseNavDirectives(rawLines: string[]): NavDirective[] {
  return rawLines.map((rawLine) => {
    let item = rawLine.trim();
    let hidden = false;

    if (item.startsWith('-')) {
      hidden = true;
      item = item.substring(1).trim();
    }

    const isRootLevel = item.startsWith('ROOT=');
    if (isRootLevel) item = item.substring('ROOT='.length);

    const webLinkMatch = item.match(WEB_LINK_RE);
    if (webLinkMatch) {
      const url = webLinkMatch[1];
      const title = (webLinkMatch[2] || webLinkMatch[3] || webLinkMatch[4]).trim();
      return { name: url, title, url, isWebLink: true, isRootLevel, hidden };
    }

    const quotedMatch = item.match(QUOTED_TITLE_RE);
    if (quotedMatch) {
      return {
        name: quotedMatch[1].trim(),
        title: (quotedMatch[2] || quotedMatch[3]).trim(),
        isRootLevel,
        hidden,
      };
    }

    const parts = item.split(':');
    if (parts.length > 1) {
      const title = parts.slice(1).join(':').trim();
      if (title === INHERIT_TITLE) return { name: parts[0].trim(), inherit: true, isRootLevel, hidden };
      return { name: parts[0].trim(), title, isRootLevel, hidden };
    }

    return { name: item, isRootLevel, hidden };
  });
}

/** The name/url a `NavDirective` is matched against when sorting. */
function directiveKey(item: NavDirective): string {
  return item.isWebLink && item.url ? item.url : item.name;
}

/**
 * Sorts `items` (file/dir names, or weblink URLs) according to already-parsed
 * `.nav` entries. Items named explicitly before `...` come first (in listed
 * order), items named after `...` come last, and everything else is inserted
 * alphabetically at the `...` marker (or appended alphabetically if there's no
 * marker).
 */
export function sortItemsByOrder(items: string[], directives: NavDirective[]): string[] {
  const parsed = directives.filter((i) => !i.hidden);
  if (!parsed.length) return items;

  const remaining = new Set(items);
  const ellipsisIndex = parsed.findIndex((i) => i.name === '...');

  if (ellipsisIndex === -1) {
    const result: string[] = [];
    for (const directive of parsed) {
      const key = directiveKey(directive);
      if (remaining.has(key)) {
        result.push(key);
        remaining.delete(key);
      }
    }
    return [...result, ...[...remaining].sort()];
  }

  const before = parsed.slice(0, ellipsisIndex);
  const after = parsed.slice(ellipsisIndex + 1);
  const namedBefore = new Set(before.map(directiveKey));
  const namedAfter = new Set(after.map(directiveKey));

  const result: string[] = [];
  for (const directive of before) {
    const key = directiveKey(directive);
    if (remaining.has(key)) {
      result.push(key);
      remaining.delete(key);
    }
  }

  const middle = items.filter((item) => !namedBefore.has(item) && !namedAfter.has(item) && remaining.has(item));
  middle.sort();
  for (const item of middle) remaining.delete(item);
  result.push(...middle);

  for (const directive of after) {
    const key = directiveKey(directive);
    if (remaining.has(key)) {
      result.push(key);
      remaining.delete(key);
    }
  }

  result.push(...[...remaining].sort());
  return result;
}

/** Reads one config file's non-blank, non-comment lines, or null if it doesn't exist. */
function readConfigFile(directoryPath: string, filename: string, verbose: boolean): string[] | null {
  const configFilePath = path.posix.join(directoryPath, filename);
  try {
    if (!fs.existsSync(configFilePath)) return null;

    const lines = fs
      .readFileSync(configFilePath, 'utf-8')
      .split('\n')
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter((line) => line && !line.startsWith('#'));

    if (verbose) {
      console.log(`   config: ${filename} (${lines.length} lines) in ${directoryPath}`);
    }
    return lines;
  } catch (error) {
    console.error(`[vitepress-auto-navbar] failed to read ${configFilePath}: ${getErrorMessage(error)}`);
    return null;
  }
}

const FLAG_LINES = new Set(['.hide', '.hideall', '.hide-all', '.link', '.inherit']);

/** Splits whole-directory flag lines (`.hide`, `.hideall`, `.link`, `.inherit`) out from ordering directives. */
export function extractFlags(lines: string[]): { lines: string[]; flags: DirectoryFlags } {
  const flags: DirectoryFlags = {
    hide: lines.includes('.hide'),
    skip: lines.includes('.hideall') || lines.includes('.hide-all'),
    link: lines.includes('.link'),
    inherit: lines.includes('.inherit'),
  };
  return { lines: lines.filter((line) => !FLAG_LINES.has(line)), flags };
}

/**
 * Reads and parses a directory's config. The first file in `configFilenames`
 * that exists wins. Missing file → empty config. With the `.inherit` flag, the
 * remaining files are also read for their title overrides.
 */
export function readDirectoryConfig(
  directoryPath: string,
  configFilenames: string[],
  verbose: boolean,
): DirectoryConfig {
  const inheritedTitles = new Map<string, string>();
  const primaryIndex = configFilenames.findIndex((filename) => readConfigFile(directoryPath, filename, false) !== null);
  if (primaryIndex === -1) {
    return { lines: [], directives: [], flags: extractFlags([]).flags, inheritedTitles };
  }

  const { lines, flags } = extractFlags(readConfigFile(directoryPath, configFilenames[primaryIndex], verbose) ?? []);

  const directives = parseNavDirectives(lines);
  const selective = new Set(directives.filter((d) => d.inherit && !d.hidden).map((d) => d.name.toLowerCase()));

  if (flags.inherit || selective.size > 0) {
    for (const [index, filename] of configFilenames.entries()) {
      if (index === primaryIndex) continue;
      const otherLines = readConfigFile(directoryPath, filename, verbose);
      if (!otherLines) continue;
      for (const directive of parseNavDirectives(extractFlags(otherLines).lines)) {
        const key = directive.name.toLowerCase();
        if (directive.hidden || directive.isWebLink || !directive.title || inheritedTitles.has(key)) continue;
        if (!flags.inherit && !selective.has(key)) continue;
        inheritedTitles.set(key, directive.title);
      }
    }
  }

  return { lines, directives, flags, inheritedTitles };
}

/** An entry's explicit title: its own `.nav` line first, then any title borrowed via `.inherit`. */
export function explicitTitleFor(config: DirectoryConfig, name: string): string | undefined {
  const own = config.directives.find(
    (d) => !d.isWebLink && !d.hidden && d.title && d.name.toLowerCase() === name.toLowerCase(),
  );
  return own?.title ?? config.inheritedTitles.get(name.toLowerCase());
}

/**
 * Finds a directory's landing page file, preferring `index.md` (the native
 * VitePress convention) and falling back to `README.md` (which VitePress
 * also auto-rewrites to `index.html`). Both are matched case-insensitively;
 * returns the exact on-disk filename.
 */
export function getIndexFilename(directoryPath: string): string | null {
  try {
    const files = fs.readdirSync(directoryPath);
    return (
      files.find((file) => file.toLowerCase() === 'index.md') ??
      files.find((file) => file.toLowerCase() === 'readme.md') ??
      null
    );
  } catch (error) {
    console.error(`[vitepress-auto-navbar] failed to read directory ${directoryPath}: ${getErrorMessage(error)}`);
    return null;
  }
}

/** True for filenames reserved as a directory's landing page (`index.md` / `README.md`). */
export function isIndexFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower === 'index.md' || lower === 'readme.md';
}

/**
 * Reads a markdown file's title, preferring frontmatter `title`, then falling
 * back to its first `# Heading`. Returns null if neither is present/readable.
 */
export function getMarkdownTitle(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const frontmatter = data as NavFrontmatter;
    if (frontmatter.title?.trim()) return frontmatter.title.trim();

    const heading = content.match(/^\s*#\s+(.+)$/m);
    if (heading) return heading[1].trim();
  } catch (error) {
    console.warn(`[vitepress-auto-navbar] failed to read title from ${filePath}: ${getErrorMessage(error)}`);
  }
  return null;
}

/** Reads the `section-title` frontmatter field from a directory's landing page, if any. */
export function getSectionTitleFrontmatter(readmePath: string): string | null {
  try {
    const raw = fs.readFileSync(readmePath, 'utf-8');
    const frontmatter = matter(raw).data as NavFrontmatter;
    return frontmatter['section-title']?.trim() || null;
  } catch (error) {
    console.warn(`[vitepress-auto-navbar] failed to read frontmatter from ${readmePath}: ${getErrorMessage(error)}`);
    return null;
  }
}

/**
 * Reads a directory's `nav.json`, an escape hatch to hand-author part of the
 * navbar: either one nav item (replaces that directory's entry) or an array
 * of them (spliced in its place; at the docs root, the whole navbar).
 */
export function readNavJsonOverride(directoryPath: string): NavItem[] | null {
  const overridePath = path.posix.join(directoryPath, 'nav.json');
  try {
    if (!fs.existsSync(overridePath)) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(overridePath, 'utf-8'));
    if (Array.isArray(parsed)) return parsed as NavItem[];
    if (parsed && typeof parsed === 'object') return [parsed as NavItem];
    console.error(`[vitepress-auto-navbar] ${overridePath} must contain a nav item or an array of them`);
  } catch (error) {
    console.error(`[vitepress-auto-navbar] failed to parse ${overridePath}: ${getErrorMessage(error)}`);
  }
  return null;
}
