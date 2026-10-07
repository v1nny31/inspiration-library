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

| Folder | What |
| --- | --- |
| `backend/` | Laravel 13 JSON API, SQLite database, screenshots stored in `backend/storage/app/public/inspirations` |
| `frontend/` | Vite + React + Tailwind CSS 4 |

## Setup (in WSL)

```bash
# Backend, once
cd backend
composer setup                 # installs deps, creates .env + SQLite db, migrates, links /storage

# Backend, every time: pick one
./vendor/bin/sail up -d        # Docker (Sail), http://localhost:8000 — stop with ./vendor/bin/sail down
composer dev                   # or local PHP, http://localhost:8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

- **Sail** needs Docker Desktop with WSL integration enabled for this distro. The app container publishes on `APP_PORT=8000` (set in `backend/.env`) and runs on PHP 8.5 with a 100 MB upload limit. With Sail running, prefix backend commands with `./vendor/bin/sail`, e.g. `./vendor/bin/sail artisan migrate` or `./vendor/bin/sail pest`.
- **Local PHP**: use `composer dev`, not plain `php artisan serve`. It loads `backend/php.d/uploads.ini`, which raises PHP's 2 MB upload limit to 20 MB so full-page screenshots can be saved.
- Both use the same SQLite file and the same `storage/` folder, so you can switch between them.

If the API runs somewhere other than `http://localhost:8000`, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.

## Using the library from agents

Everything is available as JSON while the backend runs:

| Request | Returns |
| --- | --- |
| `GET /api/categories` | categories with screenshot counts (`?section=hero` or `?section=components` for one tab) |
| `GET /api/inspirations` | every entry, newest first (`?section=` and/or `?category={id}` to filter): section, name, category, tags, `image_url`, `website_url` (or null), `brief_prompt`, `hero_prompt` |
| `GET /api/inspirations/{id}` | one entry |
| `GET /api/links` | inspiration website links, newest first (`?section=` to filter): section, `url`, `host` |

The image files themselves are in `backend/storage/app/public/inspirations/` if an agent has file access.

## Tests

```bash
cd backend && ./vendor/bin/pest      # API
cd frontend && npm test              # components and API client
```

## Not included (yet)

- Authentication. This is meant to run locally; add auth before putting it on a network.
- Replacing the image of an existing entry, and search.
