# zorched.net

The personal site of Geoff Lane, built with [Astro](https://astro.build) and served as
static files from GitHub Pages at <https://www.zorched.net>.

The site is four things: a home page, an about page, an archive index, and 135 archived
posts written between 2005 and 2014. It has no client-side JavaScript.

## Requirements

Node is pinned in `.tool-versions`, which both [mise](https://mise.jdx.dev) and the CI
workflow read. There is no other toolchain — no Ruby, no bundler.

```sh
mise install     # installs the pinned Node
npm ci           # installs dependencies from package-lock.json
```

## Working on it

```sh
npm run dev      # dev server at http://localhost:4321 with live reload
npm run build    # static build into dist/
npm run preview  # serve dist/ locally, to check the real build
npm run check    # type-check .astro and .ts files
```

`npm run build` is what CI runs. If it passes locally it will pass there.

Astro is a local dependency, not a global command, so a bare `astro check` will not
resolve. Use the `npm run` scripts above, or `npx astro <command>` to reach the CLI
directly — `npx astro preview stop`, for example.

## Layout

```
public/                    Copied to the site root verbatim
  CNAME                    The custom domain — do not delete
  favicon.ico robots.txt keybase.txt
src/
  content/writing/         The 135 archived posts, one HTML file each
  content.config.ts        Loads and validates those posts
  layouts/
    BaseLayout.astro       Page shell: <head>, masthead, footer
    PostLayout.astro       Archived-post page
  components/
    Masthead.astro SiteFooter.astro PostNav.astro
  pages/                   One file per route (see below)
  styles/global.css        Design tokens, base elements, archived-post styles
scripts/migrate-posts.mjs  One-shot Jekyll importer, already run — kept for reference
design/                    Design mockups (.dc.html), not part of the build
```

### Routes

| File | URL |
| --- | --- |
| `pages/index.astro` | `/` |
| `pages/about.astro` | `/about/` |
| `pages/writing/index.astro` | `/writing/` |
| `pages/[year]/[month]/[day]/[slug].astro` | `/2014/05/18/some-post/` |
| `pages/feed.xml.js` | `/feed.xml` |
| `pages/404.astro` | `/404.html` |

## Editing content

**The home and about pages are ordinary markup.** Their copy lives directly in
`src/pages/index.astro` and `src/pages/about.astro`. Edit the text between the tags;
the styles are in the `<style>` block at the bottom of each file.

**Site-wide text** — the footer line about the archive, the nav labels — lives in
`src/components/SiteFooter.astro` and `src/components/Masthead.astro`.

**Colours, fonts and spacing** are CSS custom properties at the top of
`src/styles/global.css`. Changing `--accent` there changes every link on the site.

### The archive

Each post is one file in `src/content/writing/`, named after its slug, with JSON-valued
front matter:

```
---
title: "Using A Core.Async Routine As A State Machine"
pubDate: "2014-05-18 09:00:56 -0400"
permalink: "/2014/05/18/using-a-core-async-routine-as-a-state-machine/"
tags: ["code","clojure"]
---
<p>Clojure has a library called Core.Async …</p>
```

`permalink` is the URL the post has had since it was published, and it is what builds the
route. **Changing it breaks an inbound link that may be twenty years old.** Rename the
file freely; leave `permalink` alone.

Post bodies are HTML rather than Markdown on purpose. Several posts contain raw `<pre>`
blocks whose indentation Markdown would mangle, and the point of the archive is that the
posts read as they were written. Code samples were highlighted once at import time with
[Shiki](https://shiki.style) and are stored as styled markup, so they need no build-time
processing and no highlighting library ships to the browser.

To add a post, drop a new file in that directory with the same front matter. It will
appear on `/writing/` and in the feed automatically, sorted by `pubDate`.

## Deploying

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds the site and
publishes `dist/` straight to Pages. There is no `gh-pages` branch and no build output in
git.

**One-time setup, in the repository settings:** under *Settings → Pages → Build and
deployment*, set **Source** to **GitHub Actions**. Until that is changed, Pages is still
trying to build the old Jekyll site from the branch and will keep failing.

## Known gaps in the archive

- **Eight images 404.** Posts from 2006, 2008 and 2014 reference
  `/wp-content/uploads/…`, which died with the WordPress install years before this
  rebuild. They were already broken. If copies turn up, drop them in `public/` at the same
  paths and they will resolve.
- **38 Amazon affiliate images** are also dead links, from a program long since shut down.
- **`/tag/clojure/`, `/tag/code/` and `/tag/java/` now 404.** Jekyll generated those three
  pages; nothing links to them any more. Tags still appear on each post, as plain text.
- **The résumé page is gone.** It listed a 2016 role as current. The original is still in
  git history:
  `git show dd3e3d7:about-geoff-lane/geoff-lanes-resume/index.html`
