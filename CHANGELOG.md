# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.2] - 2026-10-22

### Fixed

- A `.sidebar` file read with `configFilenames` can carry Auto Sidebar's new `.group` setting without a warning

## [0.8.1] - 2026-10-22

### Changed

- README: replace the plugin list with a generated More from BinaryNoir section, and use a BinaryNoir logo that shows on light and dark backgrounds

## [0.8.0] - 2026-10-20

### Added

- `excludeFrontmatter` option: frontmatter keys that hide a page from the navbar when they are `true`, such as `['draft']`, with dotted keys for nested values (`blog.draft`). The same option in `@binarynoir/vitepress-exclude` keeps those pages out of the build

## [0.7.1] - 2026-10-20

### Fixed

- Sorting by a date with a time (`.sort: date desc`) no longer depends on the build machine's time zone. `2026-10-20 14:30` and `2026-10-20T14:30` are read as UTC, offsets (`-04:00`, `Z`) as written, and impossible dates (`2026-02-30`) are no longer treated as dates. Pages from the same day sort by their times

## [0.7.0] - 2026-10-20

### Added

- `.sort: key [asc|desc], …` setting: order the entries a directory's config doesn't list by name, title, date or any frontmatter field (dotted for nested fields), with pages that have no value last. Several comma-separated keys break ties in turn, so `.sort: blog.sticky desc, date desc` keeps sticky posts on top. It works in `.nav` files and in `.sidebar` files shared with Auto Sidebar
- `sort` option: the same order for every directory, which a directory's `.sort` overrides
- `.limit: n` and `.more: Text` settings, and `limit` and `more` options: show at most `n` of the entries a directory's config doesn't list, after sorting, and optionally end with a link to its landing page when some were left out

### Changed

- Settings follow one rule, as in Auto Sidebar: a line starting with a dot is a setting, `.name` or `.name: value`. Unknown settings and bad values now log a warning naming the file and line, instead of being read as an entry

## [0.6.1] - 2026-10-16

### Changed

- Update dev dependencies: tsup 9, ESLint, typescript-eslint, Prettier, Vite, Vitest and `@types/node`. No change to the published package

## [0.6.0] - 2026-10-16

### Changed

- Frontmatter is now read with the maintained [`yaml`](https://github.com/eemeli/yaml) package instead of `gray-matter`, which has had no release since 2023 and pulled in `js-yaml` 3 and a `sprintf-js` advisory. Frontmatter is parsed as YAML 1.2, so an unquoted `yes` or `no` in a title is kept as text

## [0.5.2] - 2026-10-15

### Changed

- README: add Sidebar Accordion to the list of BinaryNoir plugins

## [0.5.1] - 2026-10-15

### Added

- `titleReplacements` keys can be phrases: `{ 'vs code': 'VS Code' }` turns `vs-code-setup` into "VS Code Setup". The longest matching phrase wins
- Titles made from file and folder names drop matching surrounding quotes (`"draft-notes"` → "Draft Notes")
- README documents the exported title helpers (`formatTitle`, `truncateTitle`, `stripTagSyntax`) and where they can run

### Changed

- Title case also keeps `from`, `into`, `near`, `onto` and `with` lowercase mid-title

## [0.5.0] - 2026-10-14

### Added

- `titleCase` option (default `true`): titles made from file and folder names are title-cased, so articles, short conjunctions and prepositions stay lowercase unless they are the first or last word (`guide-to-the-cli` → "Guide to the Cli"). Set it to `false` to capitalise every word, as before
- `formatTitle` takes an optional fourth argument, `titleCase`

### Changed

- Titles made from file and folder names keep minor words such as "a", "and", "of", "the" and "to" lowercase mid-title; titles an author wrote are unchanged

## [0.4.1] - 2026-10-14

Replaces 0.4.0, which was withdrawn from npm. The changes are the same; only example names in the documentation differ.

### Added

- `titleReplacements` option: words to replace in titles made from file and folder names, e.g. `{ github: "GitHub" }` turns `github-actions` into "GitHub Actions"
- `stripTags` option (default `true`): remove markdown-tags syntax (`((tag|draft))`) from titles
- `transformTitle` option: a hook that gets every title, and where it came from, before truncation
- `formatTitle` takes an optional third argument, the word replacements; `stripTagSyntax` is exported

### Fixed

- `.nav` link lines with whitespace after the colon and a quoted title (`https://example.com: "Title"`, `"https://example.com": 'Title'`) were silently dropped; they are now parsed, as are URLs with a port (`https://host:8080/path:Title`)
- `name.md: "Title"` keeps no stray quotes in its title
- A `.nav` line that can't be parsed (a link with no title, or a title with unmatched quotes) logs a warning naming the file and line, instead of being dropped silently
- README: `README.md` landing pages need README Index to be served at the directory URL; VitePress serves them at `README.html` on its own

## [0.3.0] - 2026-10-14

### Added

- `[Group Title]` lines in `.nav` files, and in `.sidebar` files read through `configFilenames`: labelled sections inside a dropdown, so a long menu can be grouped by topic without moving pages into subfolders

### Changed

- README: list the Exclude, README Index and Broken Links plugins, and point documentation links to binarynoir.tech

## [0.2.5] - 2026-10-13

### Changed

- README: remove the binarynoir.github.io badge; the binarynoir.tech website badge remains

## [0.2.4] - 2026-10-13

### Changed

- README: add a Feedback and support section with links to report a bug, request a feature, or browse open issues
- README: add a More from BinaryNoir section with the BinaryNoir logo and links to the other plugins and command-line tools on [binarynoir.github.io](https://binarynoir.github.io)
- README: add a binarynoir.github.io badge

## [0.2.3] - 2026-10-08

### Changed

- Add a link to the documentation site in README

## [0.2.2] - 2026-10-06

### Changed

- Add support, author, and acknowledgments sections to README

## [0.2.1] - 2026-10-06

### Changed

- Add support and website badges to README

## [0.2.0]

### Changed

- Updated dev dependencies

## [0.1.0]

### Added

- initial release
