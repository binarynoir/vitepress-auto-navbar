/**
 * A plain navbar link. Mirrors `DefaultTheme.NavItemWithLink` from VitePress,
 * redeclared here so this package has no hard type dependency on the
 * (still-alpha) VitePress 2 type exports.
 */
export interface NavItemWithLink {
  text: string;
  link: string;
  /** Regex source VitePress tests against the current path to highlight this item. */
  activeMatch?: string;
}

/** A labelled group of plain links inside a dropdown (VitePress's `NavItemChildren`). */
export interface NavItemSection {
  text: string;
  items: NavItemWithLink[];
}

/** A top-level dropdown menu. */
export interface NavItemDropdown {
  text: string;
  items: (NavItemWithLink | NavItemSection)[];
  activeMatch?: string;
}

/**
 * One entry in VitePress's `themeConfig.nav`. The default theme renders at
 * most three levels: a top-level link or dropdown, optional sections inside
 * the dropdown, and plain links inside those sections.
 */
export type NavItem = NavItemWithLink | NavItemDropdown;

export interface GenerateNavOptions {
  /**
   * How many levels deep the navbar goes, 1-3 (the default theme can't render
   * more). 1 = top-level links only, 2 = top-level dropdowns of links, 3 =
   * dropdowns that also contain labelled sections. A directory at the last
   * level becomes a plain link to its landing page. Default: 2.
   */
  maxDepth?: number;
  /** Truncate generated titles beyond this length. Default: 50. */
  maxTitleLength?: number;
  /** Filenames checked for per-directory navbar config. Default: ['.nav']. */
  configFilenames?: string[];
  /** Filenames checked for per-directory exclusion rules. Default: ['.exclude']. */
  excludeFilenames?: string[];
  /**
   * Label for the entry that links to a dropdown's own landing page. Default:
   * 'Overview'. Pass `false` to use the landing page's own title instead. An
   * explicit `index.md:Title` line in a `.nav` file always wins.
   */
  indexTitle?: string | false;
  /**
   * Collapse a directory into a single plain link whenever it has exactly one
   * visible entry (typically just its landing page), instead of a dropdown
   * whose only item repeats its own label. Default: true.
   */
  flattenSinglePage?: boolean;
  /**
   * Add an `activeMatch` of `^/<dir>/` to items generated from a directory, so
   * the item stays highlighted on every page beneath it, not just on its
   * landing page. Default: true.
   */
  activeMatch?: boolean;
  /** Log what the generator is doing as it walks the docs tree. Default: false. */
  verbose?: boolean;
}

/** Fully-resolved options, after defaults have been applied. */
export interface ResolvedNavOptions {
  maxDepth: number;
  maxTitleLength: number;
  configFilenames: string[];
  excludeFilenames: string[];
  indexTitle: string | false;
  flattenSinglePage: boolean;
  activeMatch: boolean;
  verbose: boolean;
}

/** Frontmatter fields this generator looks at when resolving titles. */
export interface NavFrontmatter {
  title?: string;
  'section-title'?: string;
}
