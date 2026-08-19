# Catalog Key Tracker

Answers three questions about catalog keys and app group keys:

1. **Where has this key appeared?** — every JIRA ticket and every list containing it.
2. **Have I seen these before?** — paste a column of keys and see which already turned up in
   earlier lists, before you save anything.
3. **What keeps coming back?** — catalogs ranked by how often they recur.

Built as a standalone app; it does not touch the PollPulse project in the repository root.

## The key format

```
catalog     144488-USA_FBRB_5340
app group   144488-USA_FBRB_53401230183
            \____/ \_/ \__/ \_________/
             org  ctry seg      tail
```

An **app group key is its catalog key plus extra digits**, so the Catalog → App Group hierarchy is
derived from the string itself — there is no mapping file to maintain. Searching a catalog also
returns tickets that only ever named one of its app groups, and vice versa; inherited matches are
always labelled as such rather than blended into direct hits.

One genuine ambiguity remains: given an app group key alone, you cannot tell where the catalog tail
ends (`5340|1230183` or `53401|230183`). The app guesses from tail length, and **corrects itself
once you register the real catalog** on the Import page — registration retroactively adopts app
groups already imported beneath it.

The format lives in exactly one file: `src/lib/keys/pattern.ts`. Adding a country code or widening
the pattern is a one-line change there.

## Setup

```bash
npm install
cp .env.example .env.local     # add your DATABASE_URL
psql "$DATABASE_URL" -f db/001_init.sql
npm run dev                    # http://localhost:3100
```

### Database

Any Postgres works. The app auto-detects which driver to use:

- **Neon** (`*.neon.tech`) → Neon's HTTP driver, which is what you want on Vercel: no connection
  pool to exhaust across serverless invocations.
- **Anything else** → a pooled `pg` client, so a local Postgres or Docker container works for
  development.

At the target scale (~10k tickets, ~500 lists) the free Neon tier is far more than enough.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXT_PUBLIC_JIRA_BASE_URL` | no | Makes ticket keys link out to JIRA |
| `TRACKER_PASSWORD` | no | Turns on a shared-password gate (see below) |

## Deploying to Vercel

1. Import the repository.
2. **Set Root Directory to `tracker`** — this is the one setting that matters, since the repo root
   holds an unrelated project.
3. Add `DATABASE_URL`.
4. Run `db/001_init.sql` against your database once.

### A note on access

The app has no login by design. On a public Vercel URL that means anyone with the link can read and
edit your data. Two ways to close that without touching code:

- Set `TRACKER_PASSWORD`, then visit `https://your-app.vercel.app/?key=<password>` once. The
  middleware stores a cookie for 90 days. Leave the variable unset and every request passes through.
- Or use Vercel's built-in deployment protection.

## Using it

**Import** — upload a JIRA CSV export. Every column is scanned, including descriptions and custom
fields; the key pattern is specific enough that ticket ids (`AZ-1234`), dates and status words
cannot produce false matches. Parsing happens in your browser and uploads in batches, so large
exports do not hit Vercel's request-size or timeout limits. You always see a preview before
anything is written, and re-uploading the same export **updates** tickets rather than duplicating
them. A key removed from a ticket between two exports also disappears from its matches.

Register your catalog keys on the same page — it is worth doing on day one, since it resolves the
tail ambiguity described above.

**Dashboard** — one key, a pasted column, or a dropped CSV. Results appear immediately; saving a
list is offered afterwards, never required.

**Lists** — create by pasting or uploading. The preview shows, per key, which earlier lists already
contain it and how many tickets mention it, *before* you commit.

**Repeats** — catalogs ranked by recurrence, with app groups rolled up into their parent. That
roll-up is the point: thirty app groups appearing once each is a heavily repeated *catalog*, which a
flat per-key count would miss. Three counts are shown separately because they answer different
questions — 40 tickets in 1 list is a different problem from 1 ticket across 8 lists.

## Development

```bash
npm test          # 98 unit tests, no database needed
npm run typecheck
npm run lint
npm run build
```

Run the integration suite against a real Postgres:

```bash
TEST_DATABASE_URL=postgres://user@host/db npm test   # +15 end-to-end tests
```

It covers import idempotency, catalog adoption, hierarchy traversal in both directions, list
overlap, the repeats roll-up, and stale-occurrence cleanup. Without `TEST_DATABASE_URL` those tests
skip, so `npm test` stays green anywhere.

`src/lib/keys/pattern.test.ts` uses real catalog and app group keys as fixtures — if the key format
ever changes, that file is where it will fail first.
