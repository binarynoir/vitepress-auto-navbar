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
   * Frontmatter keys that hide a page when they are `true`, such as
   * `['draft']`, or `['draft', 'blog.draft']` to include
   * `@binarynoir/vitepress-blog` drafts. Dotted keys read nested values. A
   * folder whose landing page is hidden loses its link. Pass the same list to
   * `@binarynoir/vitepress-exclude` to keep those pages out of the build. Default: `[]`.
   */
  excludeFrontmatter?: string[];
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
  /**
   * Words to replace in titles derived from file and directory names, matched
   * case-insensitively against each word, e.g. `{ github: 'GitHub', cicd: 'CI/CD' }`
   * turns `github-actions` into "GitHub Actions". Titles an author wrote (headings,
   * frontmatter, `.nav` lines) are left alone. Default: `{}`.
   */
  titleReplacements?: Record<string, string>;
  /**
   * Title-case titles derived from file and directory names: minor words
   * (`a`, `the`, `and`, `of`, `to`, …) stay lowercase unless first or last, so
   * `guide-to-the-cli` becomes "Guide to the Cli". Set to `false` to capitalise
   * every word. Titles an author wrote are left alone. Default: true.
   */
  titleCase?: boolean;
  /**
   * Remove markdown-tags syntax (`((tag|draft))`, from
   * `@binarynoir/vitepress-markdown-tags`) from every title. Default: true.
   */
  stripTags?: boolean;
  /**
   * Called with every title before it is truncated, after `titleReplacements`
   * and `stripTags`. Return the title to use, or `undefined` to keep it.
   */
  transformTitle?: TransformTitle;
  /**
   * How every directory orders the entries its config file doesn't list: a
   * key and an optional direction, written like the `.sort` setting, e.g.
   * `'date desc'` or `'title'`. A directory's own `.sort` line wins.
   * Default: `'name'` (alphabetical by file name).
   */
  sort?: string;
  /**
   * Most entries every dropdown shows of those its config doesn't list,
   * after sorting, so a folder of 1,000 posts shows only the newest few. A
   * directory's own `.limit` wins. Default: `0` (no limit).
   */
  limit?: number;
  /**
   * When a limit leaves entries out, end the dropdown with a link to the
   * directory's landing page, titled with this text, e.g. `'Older posts'`. A
   * directory's own `.more` wins. Default: none (no link).
   */
  more?: string;
  /** Log what the generator is doing as it walks the docs tree. Default: false. */
  verbose?: boolean;
}

/**
 * One key of a sort order, from a `.sort: key [asc|desc], …` setting or the `sort` option.
 * `name` is the file or folder name, `title` the title shown in the navbar,
 * `date` the page's `date` (or `blog.date`), and anything else a frontmatter
 * field, with dots for nested fields.
 */
export interface NavSortKey {
  key: string;
  direction: 'asc' | 'desc';
}

/** One or more sort keys, in order: each later key breaks ties in the ones before it. */
export type NavSort = NavSortKey[];

/**
 * Where a title came from: `name` is derived from a file or directory name,
 * `page` from a page's `title`/`section-title` frontmatter or first `# Heading`,
 * and `config` from a `.nav` line or the `indexTitle` option.
 */
export type TitleSource = 'name' | 'page' | 'config';

/** See {@link GenerateNavOptions.transformTitle}. */
export type TransformTitle = (title: string, context: { source: TitleSource }) => string | undefined;

/** Fully-resolved options, after defaults have been applied. */
export interface ResolvedNavOptions {
  maxDepth: number;
  maxTitleLength: number;
  configFilenames: string[];
  excludeFilenames: string[];
  excludeFrontmatter: string[];
  indexTitle: string | false;
  flattenSinglePage: boolean;
  activeMatch: boolean;
  titleReplacements: Record<string, string>;
  titleCase: boolean;
  stripTags: boolean;
  transformTitle?: TransformTitle;
  sort?: NavSort;
  limit: number;
  more?: string;
  verbose: boolean;
}

/** Frontmatter fields this generator looks at when resolving titles. */
export interface NavFrontmatter {
  title?: string;
  'section-title'?: string;
}
