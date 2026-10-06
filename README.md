# vitepress-auto-navbar

[![npm version](https://img.shields.io/npm/v/@binarynoir/vitepress-auto-navbar.svg)](https://www.npmjs.com/package/@binarynoir/vitepress-auto-navbar)
[![CI](https://github.com/binarynoir/vitepress-auto-navbar/actions/workflows/ci.yml/badge.svg)](https://github.com/binarynoir/vitepress-auto-navbar/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@binarynoir/vitepress-auto-navbar.svg)](LICENSE)

A [VitePress 2](https://vitepress.dev) plugin that builds your top navigation
bar for you by scanning your docs folder, so you stop hand-maintaining
`themeConfig.nav`. It is the companion to
[`vitepress-auto-sidebar`](https://github.com/binarynoir/vitepress-auto-sidebar)
and uses the same config-file syntax.

[![Support me on Buy Me a Coffee](https://img.shields.io/badge/Support%20me-Buy%20Me%20a%20Coffee-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/binarynoir)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me-Ko--fi-blue?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/binarynoir)
[![Visit my website](https://img.shields.io/badge/Website-binarynoir.tech-8c8c8c?style=for-the-badge)](https://binarynoir.tech)

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
  only a landing page it is a plain link.
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

| Option              | Default        | Description                                                                                                                                                                                                         |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxDepth`          | `2`            | Navbar levels, 1-3 (the default theme can't render more). `1` = top-level links only; `2` = dropdowns of links; `3` = dropdowns that also contain labelled sections. A directory at the last level is a plain link. |
| `maxTitleLength`    | `50`           | Truncate generated titles beyond this length.                                                                                                                                                                       |
| `configFilenames`   | `['.nav']`     | Filenames checked for per-directory config. Use `['.nav', '.sidebar']` to fall back to existing `.sidebar` files.                                                                                                   |
| `excludeFilenames`  | `['.exclude']` | Filenames checked for per-directory exclusion rules.                                                                                                                                                                |
| `indexTitle`        | `'Overview'`   | Label for the dropdown entry that links to the directory's own landing page. `false` uses the landing page's own title.                                                                                             |
| `flattenSinglePage` | `true`         | Collapse a directory with exactly one visible entry into a plain link, instead of a dropdown whose only item repeats its label.                                                                                     |
| `activeMatch`       | `true`         | Add `activeMatch: '^/<dir>(?:/\|$)'` to generated items so they stay highlighted on every page beneath them.                                                                                                        |
| `verbose`           | `false`        | Log each directory as it's processed.                                                                                                                                                                               |

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
| `...`                       | Everything not listed explicitly goes here, alphabetically.                                                                            |
| `-name`                     | Hide this entry entirely.                                                                                                              |
| `.hide`                     | Hide _this_ directory's own landing link, but keep showing its children.                                                               |
| `.hideall` (or `.hide-all`) | Skip this directory and everything under it.                                                                                           |
| `.link`                     | **Navbar only.** Render this directory as one plain link to its landing page instead of a dropdown. Ignored if it has no landing page. |
| `.inherit`                  | On its own line: borrow `name:Title` overrides from the other `configFilenames` files (e.g. `.sidebar`) for every entry. See below.    |
| `name:.inherit`             | Same, for that one entry only.                                                                                                         |

`name` is matched against the exact on-disk entry: a **file** needs its `.md`
extension (`glossary.md`, not `glossary`). To retitle a dropdown's landing
entry, use `index.md:Title`.

Ordering: items listed before `...` come first, in the order listed; items
listed after `...` come last; everything else is inserted alphabetically at the
`...` marker (or appended alphabetically, if there's no `...`).

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

## Support

If you encounter any issues or have questions, please open an issue on [GitHub](https://github.com/binarynoir/vitepress-auto-navbar/issues).

## Author

John Smith III

## Acknowledgments

Thanks to all contributors and users for their support and feedback.
