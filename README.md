# vitepress-auto-navbar

[![npm version](https://img.shields.io/npm/v/@binarynoir/vitepress-auto-navbar.svg)](https://www.npmjs.com/package/@binarynoir/vitepress-auto-navbar)
[![CI](https://github.com/binarynoir/vitepress-auto-navbar/actions/workflows/ci.yml/badge.svg)](https://github.com/binarynoir/vitepress-auto-navbar/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@binarynoir/vitepress-auto-navbar.svg)](LICENSE)

A [VitePress 2](https://vitepress.dev) plugin that builds your top navigation
bar for you by scanning your docs folder, so you stop hand-maintaining
`themeConfig.nav`. It is the companion to
[`vitepress-auto-sidebar`](https://github.com/binarynoir/vitepress-auto-sidebar)
and uses the same config-file syntax.

[Documentation and live demo](https://binarynoir.tech/plugins/auto-navbar)

[![Support me on Buy Me a Coffee](https://img.shields.io/badge/Support%20me-Buy%20Me%20a%20Coffee-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/binarynoir)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me-Ko--fi-blue?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/binarynoir)
[![More tools](https://img.shields.io/badge/Website-binarynoir.tech-8c8c8c?style=for-the-badge)](https://binarynoir.tech)

## What this does

Add a new Markdown file or folder and it shows up in the navbar on its own,
titled from its heading. When you want a specific order, a custom title, or to
hide something, you control that with a small plain-text `.nav` file dropped
into that folder, not a change to your config code.

## Install

```sh
npm install @binarynoir/vitepress-auto-navbar
```

## Usage

```ts
// .vitepress/config.mts
import { defineConfig } from 'vitepress';
import { generateNav } from '@binarynoir/vitepress-auto-navbar';
import path from 'node:path';

export default defineConfig({
  themeConfig: {
    nav: generateNav(path.resolve(import.meta.dirname, '..'), {
      maxDepth: 2,
      verbose: false,
    }),
  },
});
```

> **Note:** Use `import.meta.dirname`, not `__dirname`. VitePress config files
> are ESM, and `__dirname` isn't defined there under VitePress's newer native
> config loader.

`generateNav(rootPath, options?)` walks `rootPath` and returns the array
VitePress expects for `themeConfig.nav`:

- Each top-level **directory** becomes one navbar entry. With several pages it
  is a dropdown whose first item links to the directory's landing page
  (`index.md`, or `README.md` as a fallback, matched case-insensitively). With
  only a landing page it is a plain link. VitePress itself serves a `README.md`
  at `README.html`, not the directory's index, so a `README.md` landing page
  needs [README Index](https://binarynoir.tech/plugins/readme-index/)
  (`readmeRewrites` and `readmeLinks`) to be served at the directory URL.
- Each top-level **`*.md` file** becomes a plain link. The root `index.md` is
  left out, since the site logo already links home, unless a `.nav` line names
  it.
- Subdirectories become links (or, at `maxDepth: 3`, labelled sections) inside
  their parent's dropdown.

A file's title is resolved, in order: an explicit title from a `.nav` line, the
`title` frontmatter field, the file's first `# Heading`, then the formatted
filename (`getting-started.md` → "Getting Started"). A directory's title is an
explicit `name:Title` in its _parent's_ `.nav`, then a `section-title`
frontmatter field on its landing page, then its formatted name.

Links are emitted without the `.md` extension (`/company/teams`), as you would
write them by hand. Dotfiles, `_`-prefixed entries, `public/`, `-`-prefixed
entries and `assets*` are skipped, same as the sidebar plugin.

## Options

| Option               | Default        | Description                                                                                                                                                                                                         |
| -------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxDepth`           | `2`            | Navbar levels, 1-3 (the default theme can't render more). `1` = top-level links only; `2` = dropdowns of links; `3` = dropdowns that also contain labelled sections. A directory at the last level is a plain link. |
| `maxTitleLength`     | `50`           | Truncate generated titles beyond this length.                                                                                                                                                                       |
| `configFilenames`    | `['.nav']`     | Filenames checked for per-directory config. Use `['.nav', '.sidebar']` to fall back to existing `.sidebar` files.                                                                                                   |
| `excludeFilenames`   | `['.exclude']` | Filenames checked for per-directory exclusion rules.                                                                                                                                                                |
| `excludeFrontmatter` | `[]`           | Frontmatter keys that hide a page when `true`, such as `['draft', 'blog.draft']`. See [Drafts in frontmatter](#drafts-in-frontmatter).                                                                              |
| `indexTitle`         | `'Overview'`   | Label for the dropdown entry that links to the directory's own landing page. `false` uses the landing page's own title.                                                                                             |
| `flattenSinglePage`  | `true`         | Collapse a directory with exactly one visible entry into a plain link, instead of a dropdown whose only item repeats its label.                                                                                     |
| `activeMatch`        | `true`         | Add `activeMatch: '^/<dir>(?:/\|$)'` to generated items so they stay highlighted on every page beneath them.                                                                                                        |
| `titleReplacements`  | `{}`           | Words to replace in titles made from file and folder names, e.g. `{ github: "GitHub" }`. See [Titles](#titles).                                                                                                     |
| `titleCase`          | `true`         | Title-case titles made from file and folder names, keeping minor words like "to" and "the" lowercase. See [Titles](#titles).                                                                                        |
| `stripTags`          | `true`         | Remove markdown-tags syntax (`((tag\|draft))`) from titles. See [Titles](#titles).                                                                                                                                  |
| `transformTitle`     | none           | A function that gets every title, and its source, before truncation. See [Titles](#titles).                                                                                                                         |
| `sort`               | `'name'`       | How every directory orders the entries its config doesn't list, e.g. `'date desc'`. A directory's `.sort` setting wins. See [Settings](#settings).                                                                  |
| `limit`              | `0`            | Most entries every dropdown shows of those its config doesn't list, after sorting. `0` for no limit. A directory's `.limit` wins. See [Limiting](#limiting).                                                        |
| `more`               | none           | When a limit leaves entries out, end the dropdown with a link to the directory's landing page, titled with this text.                                                                                               |
| `verbose`            | `false`        | Log each directory as it's processed.                                                                                                                                                                               |

## Titles

A title made from a file or folder name is formatted: `getting-started.md`
becomes "Getting Started". It is title-cased: articles, short conjunctions
and prepositions (`a`, `the`, `and`, `of`, `to`, …) stay lowercase unless they
are the first or last word, so `guide-to-the-cli` becomes "Guide to the Cli".
Set `titleCase: false` to capitalise every word instead. Surrounding quotes
are dropped, so `"draft-notes"` becomes "Draft Notes".

Casing only changes first letters, so use `titleReplacements` for words with
other casing. Keys match whole words or phrases, ignoring case (the longest
phrase wins), and the values are used as written:

```ts
generateNav(docsRoot, {
  titleReplacements: { github: 'GitHub', api: 'API', cicd: 'CI/CD', 'vs code': 'VS Code' },
});
// github-actions/ → "GitHub Actions", cicd-setup.md → "CI/CD Setup",
// vs-code-tips.md → "VS Code Tips"
```

Titles an author wrote (a heading, `title` frontmatter, a `.nav` line) are
never changed by `titleReplacements`.

Every title has [markdown-tags](https://binarynoir.tech/plugins/markdown-tags/)
syntax removed, so `# Design ((tag|draft))` is listed as "Design". Set
`stripTags: false` to keep it.

For anything else, `transformTitle` gets every title before it is truncated,
along with where it came from: `"name"` (a file or folder name), `"page"` (a
page's frontmatter or first heading) or `"config"` (a `.nav` line). Return
the title to use, or `undefined` to keep it:

```ts
generateNav(docsRoot, {
  transformTitle: (title, { source }) => (source === 'page' ? title.replace(/^Guide: /, '') : undefined),
});
```

### Using the title helpers in your own code

The functions that format titles are exported, so your `config.mts`, a build
script or another plugin can make titles that match the navbar:

```ts
import { formatTitle, truncateTitle, stripTagSyntax } from '@binarynoir/vitepress-auto-navbar';

formatTitle('02-setting-up-vs-code.md', 50, { 'vs code': 'VS Code' }); // "Setting up VS Code"
formatTitle('guide-to-the-cli', 50, {}, false); // "Guide To The Cli"
truncateTitle('A fairly long human-written title', 15); // "A fairly long…"
stripTagSyntax('Design ((tag|draft))'); // "Design"
```

| Function                                                   | What it does                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `formatTitle(name, maxLength?, replacements?, titleCase?)` | Turns a file or folder name into a title, following every rule above. `maxLength` defaults to `50` (`0` for no limit), `replacements` to `{}` and `titleCase` to `true`. |
| `truncateTitle(title, maxLength?)`                         | Shortens a title someone wrote to `maxLength` (default `50`), adding `…`, without changing its casing or punctuation.                                                    |
| `stripTagSyntax(title)`                                    | Removes markdown-tags syntax (`((tag\|draft))`) and tidies the spacing.                                                                                                  |

Pass `formatTitle` a single file or folder name, not a path: it doesn't split
on `/`. To match your navbar, pass the same `titleReplacements` and `titleCase`
you gave `generateNav`.

These run in Node: in `.vitepress/config.mts`, build scripts, and Vite or
markdown-it plugins. The package entry also loads the navbar generator, which
uses `fs`, so don't import it into code that runs in the browser (a Vue
component or the theme's `enhanceApp`). Format titles at build time instead,
and pass them to the page through frontmatter, a data loader or `themeConfig`.

## `.nav` files

Drop a `.nav` file into any docs directory, including the docs root, to
control the order and titles of its contents. Lines starting with `#` are
comments. The syntax is the same as `.sidebar` in `vitepress-auto-sidebar`.

```txt
# docs/.nav  (controls the top-level navbar)

onboarding
company:People
products
engineering
tools-resources:Tools & Resources
...
-contributing.md
"https://status.example.com":Status
```

| Syntax                      | Meaning                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                      | Order this file or subdirectory.                                                                                                       |
| `name:Custom Title`         | Order it and override its display title.                                                                                               |
| `"https://…":Title`         | Insert an external link here (in this dropdown, or the navbar if this is the root).                                                    |
| `ROOT="https://…":Title`    | Insert an external link in the top-level navbar, next to this directory's entry.                                                       |
| `...`                       | Everything not listed explicitly goes here, alphabetically or by `.sort`.                                                              |
| `-name`                     | Hide this entry entirely.                                                                                                              |
| `.sort: key [asc\|desc], …` | A setting: how unlisted entries are ordered. See [Settings](#settings).                                                                |
| `.limit: n`                 | A setting: show at most `n` unlisted entries. See [Limiting](#limiting).                                                               |
| `.more: Text`               | A setting: a link to the landing page when entries were left out.                                                                      |
| `.hide`                     | Hide _this_ directory's own landing link, but keep showing its children.                                                               |
| `.hideall` (or `.hide-all`) | Skip this directory and everything under it.                                                                                           |
| `.link`                     | **Navbar only.** Render this directory as one plain link to its landing page instead of a dropdown. Ignored if it has no landing page. |
| `.inherit`                  | On its own line: borrow `name:Title` overrides from the other `configFilenames` files (e.g. `.sidebar`) for every entry. See below.    |
| `name:.inherit`             | Same, for that one entry only.                                                                                                         |
| `[Group Title]`             | Start a labelled section inside a dropdown. See [Section headings](#section-headings).                                                 |

Titles may be bare, `"double-quoted"` or `'single-quoted'`, with optional
whitespace after the colon, so `name.md: "Title"` and
`https://example.com: 'Title'` both work. The quotes around a URL are
optional too. A line that can't be parsed as written, such as a link with no
title or a title with unmatched quotes, logs a warning naming the file and
line.

`name` is matched against the exact on-disk entry: a **file** needs its `.md`
extension (`glossary.md`, not `glossary`). To retitle a dropdown's landing
entry, use `index.md:Title`.

Ordering: items listed before `...` come first, in the order listed; items
listed after `...` come last; everything else is inserted at the `...` marker
(or appended, if there's no `...`), alphabetically unless a
[`.sort` setting](#settings) says otherwise.

### Settings

A line that starts with a dot is a setting for the directory, not an entry.
Every setting is written the same way: `.name` turns it on, and
`.name: value` gives it a value. These are `.sort`, `.limit`, `.more`, `.link`,
`.inherit`, `.hide` and `.hideall` in the table above. An unknown setting, or one with a
value it can't use, logs a warning naming the file and line, and is ignored.

[Auto Sidebar](https://binarynoir.tech/plugins/auto-sidebar/) reads the same
settings the same way, so one `.sidebar` file can serve both plugins: a
`.sort` line there orders the sidebar and the navbar dropdown alike.

#### Sorting

```txt
# docs/blog/.sidebar (read by both plugins)

index.md:All posts
.sort: date desc
```

| Key           | Sorts by                                                                              |
| ------------- | ------------------------------------------------------------------------------------- |
| `name`        | The file or folder name. This is the default.                                         |
| `title`       | The title shown in the navbar, wherever it came from.                                 |
| `date`        | The page's `date` frontmatter, or `blog.date` for `@binarynoir/vitepress-blog` posts. |
| anything else | That frontmatter field. Use dots for nested fields: `.sort: meta.order`.              |

- The direction is `asc` (A to Z, oldest first, smallest first) unless you write `desc`.
- Dates and numbers compare as dates and numbers, so `2` sorts before `10`.
- Dates can carry a time: `2026-10-20`, `2026-10-20 14:30`, `2026-10-20T14:30:00`, or either with an offset (`-04:00`, `Z`). Pages from the same day sort by their times, and a date alone counts as the start of its day. A time without an offset is read as UTC, so the order is the same on every build machine; write offsets if your pages mix time zones.
- Several keys, separated by commas, sort by the first and break ties with the
  next: `.sort: blog.sticky desc, date desc` puts sticky blog posts on top,
  each group newest first.
- Pages without a value go last for that key, in either direction, and are
  ordered by the next key. A `false` value counts as no value, so pages with
  `sticky: false` sort with those that don't say. Final ties go by name.
- A directory sorts by its landing page's frontmatter, including top-level
  entries when the root's config has a `.sort`.
- Only entries the file doesn't list are sorted; listed entries keep their place.
- A setting covers its own directory, not the ones below it. To sort every
  directory the same way, pass the [`sort` option](#options); a directory's own
  `.sort` still wins.

#### Limiting

A folder with hundreds of pages makes a dropdown too long to use, and
VitePress sends the whole dropdown to every page. `.limit` keeps the first
entries after sorting:

```txt
# docs/blog/.sidebar

index.md:All posts
.sort: blog.sticky desc, date desc
.limit: 10
.more: Older posts
```

- Only entries the file doesn't list count toward the limit, and listed
  entries always show. Above, "All posts" plus the 10 first in sort order.
- `.more: Text` ends the list with a link to the directory's landing page, but
  only when entries were left out. Leave it out for no link: the blog above
  already links its landing page as "All posts".
- `.limit: 0` means no limit. The [`limit` and `more` options](#options) set
  both for every directory; a directory's own lines win.

### Reusing `.sidebar` titles with `.inherit`

Only the first file found in a directory is used, so a directory with both a
`.nav` and a `.sidebar` ignores the `.sidebar`. If you've already titled
entries in `.sidebar`, add `.inherit` to the `.nav` file and set
`configFilenames: ['.nav', '.sidebar']`:

```txt
# docs/.nav
onboarding
tools-resources
.inherit

# docs/.sidebar
tools-resources:Tools & Resources
```

`tools-resources` now shows as "Tools & Resources" in the navbar without
repeating the title. A bare `.inherit` line applies to every entry; to borrow
a title for one entry only, write `name:.inherit` instead and leave the flag
off:

````txt
tools-resources:.inherit
glossary.md
``` Only `name:Title` overrides are borrowed: order, `-name`
hiding and flags always come from the `.nav` file, and a title written in
`.nav` beats an inherited one.

### Section headings

A line in square brackets starts a labelled section inside a dropdown. Every
entry listed after it, up to the next heading, is shown under that label, so a
long dropdown can be grouped by topic without moving pages into subfolders:

```txt
# docs/plugins/.nav

index.md:Overview
[Navigation]
auto-sidebar.md:Auto Sidebar
auto-navbar.md:Auto Navbar
[Content]
downloads.md:Downloads
...
```

- Entries before the first heading stay as plain links at the top of the dropdown.
- A section holds plain links only, so a subdirectory under a heading is one link to its landing page.
- `...` places unlisted entries under the heading above it. A heading with nothing under it is left out.
- The top-level navbar can't show sections, so headings in the docs root's `.nav` are ignored.

[`vitepress-auto-sidebar`](https://github.com/binarynoir/vitepress-auto-sidebar)
reads the same lines and shows them as sidebar groups, so a shared `.sidebar`
file groups both menus the same way.

## `.exclude` files

Drop a `.exclude` file into a directory to remove files or subdirectories from
the generated navbar without deleting them. A trailing `/` marks a directory
pattern, `*` and `?` are glob wildcards, and a lone `.` excludes the directory
the file lives in.

```txt
# docs/products/.exclude

draft/
internal-*.md
````

### Drafts in frontmatter

A page can hide itself, too. List frontmatter keys with `excludeFrontmatter`,
and any page that sets one of them to `true` is left out of the navbar:

```ts
generateNav(docsRoot, { excludeFrontmatter: ['draft', 'blog.draft'] });
```

Only `true` counts, dotted keys read nested values (`blog.draft` for
[`@binarynoir/vitepress-blog`](https://binarynoir.tech/plugins/blog/) posts),
and a folder whose landing page is hidden loses its link. Pass the same list to
[`@binarynoir/vitepress-exclude`](https://binarynoir.tech/plugins/exclude/) to
keep those pages out of the build, so the navbar never links to a page that
isn't there. Turn it on for builds only to keep previewing drafts in
`vitepress dev`:

```ts
const excludeFrontmatter = process.env.NODE_ENV === 'production' ? ['draft'] : [];
```

## `nav.json` escape hatch

For a directory you'd rather hand-author, drop a `nav.json` into it containing
either one nav item (it replaces that directory's entry) or an array of them
(spliced in its place). Generation for that directory stops there. A `nav.json`
in the docs root replaces the whole navbar.

```json
{
  "text": "Custom",
  "items": [{ "text": "Anywhere", "link": "/anywhere" }]
}
```

## Migrating a hand-written navbar

Given a `nav.ts` with `Onboarding` (link), `Company`/`Products`/`Engineering`
(dropdowns), `Tools & Resources` and `Glossary`, a root `.nav` that fixes the
order and a one-line `onboarding/.nav` reproduces it:

```txt
# docs/.nav
onboarding
company
products
engineering
tools-resources:Tools & Resources
glossary.md
-contributing.md

# docs/onboarding/.nav
.link
```

## Companion plugin: `vitepress-auto-sidebar`

[`vitepress-auto-sidebar`](https://github.com/binarynoir/vitepress-auto-sidebar)
does for `themeConfig.sidebar` what this plugin does for `themeConfig.nav`:
same folder scan, same ordering and exclusion syntax, just a different menu.
Use both and one folder structure drives the whole site. Their config files
are deliberately compatible: set `configFilenames: ['.nav', '.sidebar']` to
reuse existing `.sidebar` files, and add `.inherit` (or `name:.inherit`) to a
`.nav` file to borrow titles from them instead of writing each twice.

## Releasing

Releases are tag-triggered. From a clean `main` that's in sync with
`origin/main`:

```sh
npm run release:patch   # or release:minor / release:major
```

This runs typecheck/lint/test/build locally, then `npm version <bump>` and
`git push --follow-tags`. Pushing the tag triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which re-runs
the checks, publishes to npm, and creates a GitHub release.

## License

MIT

---

## Feedback and support

Bug reports, feature requests and questions are all welcome. Please open them on this project's [GitHub issue tracker](https://github.com/binarynoir/vitepress-auto-navbar/issues):

- **Found a bug?** [Report it](https://github.com/binarynoir/vitepress-auto-navbar/issues/new?labels=bug&title=Bug%3A%20). Include your version and the steps to reproduce it.
- **Have an idea?** [Request a feature](https://github.com/binarynoir/vitepress-auto-navbar/issues/new?labels=enhancement&title=Feature%20request%3A%20). Tell us what you are trying to do.
- **Something else?** [Browse open issues](https://github.com/binarynoir/vitepress-auto-navbar/issues) to see if it has already been raised.

Pull requests are welcome too.

## More from BinaryNoir

<p align="center">
  <a href="https://binarynoir.tech">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://binarynoir.tech/logo-wide-dark.svg">
      <img alt="BinaryNoir" src="https://binarynoir.tech/logo-wide-light.svg" width="320">
    </picture>
  </a>
</p>

Auto Navbar is one of a family of open-source VitePress plugins, editor extensions and command-line tools from BinaryNoir. Browse them all, with documentation and live demos, at **[binarynoir.tech](https://binarynoir.tech)**.

**VitePress plugins**

- [Auto Sidebar](https://binarynoir.tech/plugins/auto-sidebar): sidebar built from your folders
- [Sidebar Accordion](https://binarynoir.tech/plugins/sidebar-accordion): one open sidebar group at a time
- [Markdown Tags](https://binarynoir.tech/plugins/markdown-tags/): inline status badges
- [Reading Time Tag](https://binarynoir.tech/plugins/reading-time-tag): reading-time estimates
- [Glossary Tooltips](https://binarynoir.tech/plugins/glossary/): hover definitions from one glossary file
- [Downloads](https://binarynoir.tech/plugins/downloads): downloadable files next to your pages
- [Exclude](https://binarynoir.tech/plugins/exclude/): keep pages out of the build with a `.exclude` file
- [README Index](https://binarynoir.tech/plugins/readme-index/): `README.md` index pages for VuePress migrations
- [HTML Escape](https://binarynoir.tech/plugins/html-escape/): stray tags and braces shown as text, not build errors
- [Broken Links](https://binarynoir.tech/plugins/broken-links): dead links shown as text, not build errors

**Vite plugins**

- [Optimize Images](https://binarynoir.tech/plugins/optimize-images): smaller images in the build output
- [Image Fallback](https://binarynoir.tech/plugins/image-fallback): a placeholder instead of a failed build

**Editor extensions**

- [Tags for Markdown for VS Code](https://binarynoir.tech/plugins/markdown-tags/vscode): status badges in the VS Code Markdown preview
- [Tags for Markdown for Obsidian](https://binarynoir.tech/plugins/markdown-tags/obsidian): status badges in Obsidian

**Command-line tools**

- [NoirWatch](https://binarynoir.tech/apps/noirwatch): get notified when a web page changes
- [NoirCon](https://binarynoir.tech/apps/noircon): get notified when a site, server or port goes down
- [callrx](https://binarynoir.tech/apps/callrx): amateur radio callsign lookup

Website, docs and demos: **[binarynoir.tech](https://binarynoir.tech)**

## Author

John Smith III, [BinaryNoir](https://binarynoir.tech). Thanks to all contributors and users for their support and feedback.
