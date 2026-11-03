# NeeLine

A horizontal number line for history, from deep antiquity (BCE) to today.

Developed in Collaboration with Academia | Devnetra Consultancy

## Features

- Single dates and periods (drawn as brackets) on one number line, with a fixed 0 point between 1 BCE and 1 CE.
- Even spacing for readability, or proportional spacing with zoom down to individual days. Month and day position an event within its year.
- Gap badges between neighbouring events. Year counts skip the missing year 0, so 10 BCE to 10 CE is 19 years.
- Layers with their own colours; show, hide or isolate them. Order, colour and visibility are saved with the timeline.
- Undo and redo (50 steps) for adding, editing, deleting, importing and renaming.
- Import JSON (with per-row error reporting and duplicate skipping); export JSON per layer, a 2x PNG of the visible layers, or TXT.
- Google sign-in, or a guest workspace that is deleted after 30 days without use.
- Dark and light themes, keyboard access to the canvas, WCAG 2.2 AA checked with axe.

## Stack

Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Prisma 7 with PostgreSQL, Auth.js v5 (beta), zod, Lucide icons, Inter.

## Getting started

```bash
npm install
cp .env.example .env        # fill in the values
```

No Postgres installed? Run an in-process one (PGlite) in a second terminal and use the URL from `.env.example`:

```bash
npm run db:local
```

Then:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (node:test) |
| `npm run test:e2e` | Build, then Playwright tests against an in-memory database |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:backfill -- --dry-run` | Report what the metadata backfill would change |
| `npm run db:backfill` | Move legacy layer/period metadata into columns (safe to rerun) |

## Upgrading a database from the previous release

The previous release stored layers, period end dates and the timeline description inside `Event.description`. This release uses real columns.

1. Back up the database.
2. If the database was created with `prisma db push` (no `_prisma_migrations` table), mark the baseline as applied: `npx prisma migrate resolve --applied 0_init`.
3. `npm run db:migrate` (adds columns and tables only; nothing is dropped).
4. `npm run db:backfill -- --dry-run`, check the report, then `npm run db:backfill`.
5. Deploy, then run the backfill once more to catch anything written by the old version in between.

The original description of every converted event is kept in `Event.legacyDescription`.

## Project layout

```text
prisma/            schema, migrations, backfill script
src/app/           pages and API routes
src/components/    ui/ (design system), layout/, studio/, dashboard/, landing/
src/lib/domain/    pure rules: dates, layout, layers, import, export, undo history
src/lib/server/    API helpers: errors, sessions, rate limits, data access
src/lib/validation shared zod schemas (client and server)
tests/unit         unit tests
tests/e2e          Playwright tests (flows, API, accessibility)
```

## Contact

devnetraconsultancy@gmail.com
