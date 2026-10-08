# Inspiration Library

A personal library of website and app UI screenshots, built to feed AI agents better design references.

- Three tabs, each its own URL:
  - **Hero inspiration** (`/hero`): full pages and hero sections.
  - **Components** (`/components`): individual UI pieces, one category per component type (Buttons, Pagination, Cards, Payments…). Components have only the UI brief prompt, no hero image prompt.
  - **Links** (`/links`): links to inspiration websites, filed under Hero inspiration or Components. Click (or Ctrl/⌘+click) a link to open the site in a new tab.
- Every page is grouped into sections with a header each. A sticky side index (and the pills in the header) scrolls to a section and highlights the one in view. On the library tabs the sections are categories: add one with the **+** next to the index title, delete one with its **×**.
- Click a card for a large popup with the full screenshot, its details, and two copy buttons:
  - **UI brief prompt**: hand it to a coding agent to build a whole site or app in that visual language.
  - **Hero image prompt**: hand it to an image generator (Higgsfield, Midjourney…) for a new hero visual in the same style.
- **Add screenshot**: drop, browse or paste (Ctrl/⌘+V) an image, then fill in its name, the website it came from (optional), category, tags and both prompts.
- Categories are created on the fly, from the side index or from the add form.

## Stack

Vite + React 19 + Tailwind CSS 4, in `frontend/`. There is no database and no separate backend: a small Vite plugin (`frontend/server/`) serves a JSON API from the dev server and saves everything as plain files in `library/`, at the repo root (created on the first save).

## Setup (in WSL)

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

The library only works through `npm run dev` (or `npm run build && npm run preview`): those are the servers that read and write `library/`. A static host serving `dist/` alone can show nothing.

## Where your library lives

Everything you add is saved in `library/`, which is meant to be committed:

```text
library/
  links.json                     every link: section, url, created_at
  hero/                          one folder per tab
    categories.json              ["Dashboard", "Landing Page"]
    neon-analytics-3f9a1c/       one folder per screenshot
      info.json                  name, category, website_url, tags, prompts, created_at
      screenshot.png
  components/
    categories.json
    pill-button-8b02de/
      info.json
      screenshot.webp
```

### Syncing between devices

Commit and push `library/` after adding things, and pull on the other device:

```bash
git add library && git commit -m "Add inspiration" && git push
git pull                         # on the other device, then refresh the page
```

- Each screenshot is its own folder with a random suffix, so screenshots added on two devices never clash.
- `categories.json` and `links.json` are shared files. If both devices change one before syncing, git may ask you to resolve a conflict in it. Until you do, the app shows an error naming the broken file.
- A category used by a screenshot is shown even if it's missing from `categories.json`, so a merge never hides a screenshot.
- Screenshots are capped at 20 MB each. GitHub refuses files over 100 MB, but a repo full of large images gets slow to clone. Consider [Git LFS](https://git-lfs.com) for `library/**/*.png` if it grows big.

You can also edit `info.json` files by hand. Changes show up on the next page load.

## Using the library from agents

Agents with file access can read `library/` directly: each `info.json` sits next to its screenshot.

While `npm run dev` runs, everything is also available as JSON:

| Request | Returns |
| --- | --- |
| `GET /api/categories` | categories with screenshot counts (`?section=hero` or `?section=components` for one tab) |
| `GET /api/inspirations` | every entry, newest first (`?section=` and/or `?category={category id}` to filter): section, name, category, tags, `image_url`, `website_url` (or null), `brief_prompt`, `hero_prompt` |
| `GET /api/inspirations/{id}` | one entry (the id is its folder name) |
| `GET /api/links` | inspiration website links, newest first (`?section=` to filter): section, `url`, `host` |

## Tests

```bash
cd frontend
npm test                         # components, API client and the file-based API
npm run lint
```

## Not included (yet)

- Authentication. This is meant to run locally; don't expose the dev server on a network.
- Replacing the image of an existing entry, and search.
