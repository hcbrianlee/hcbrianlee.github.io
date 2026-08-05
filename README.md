# Green Nudge Chat

A ChatGPT-style chat interface for the **Green Nudging AI** experiment: participants use an
AI assistant to help draft captions for [The New Yorker Cartoon Caption Contest](https://nextml.github.io/caption-contest-data/),
choosing between a "heavy" and a "light" model. The interface nudges toward the lower-energy
model, tracks estimated carbon/water impact of usage, and asks at the end whether participants
want to donate part of their participation reward to a pro-environmental organization.

Condition assignment (model-info framing x pricing framing), token usage, response timing, and
donations are logged server-side to Supabase for analysis.

## Stack

- **Next.js (App Router)**, deployed on Vercel — API routes call the LLM provider server-side so
  API keys never reach the browser.
- **Supabase (Postgres)** — `conditions`, `sessions`, `events` tables (see `sql/`).
- **OpenAI and/or Anthropic** — chat responses stream back to the UI; token usage is read from
  the provider's own response metadata and logged immediately after each response.
- **Deterministic randomization** — a session's condition is `sha256(session_id) mod (number of
  rows in conditions)`, computed server-side. No `Math.random()`, no client-side assignment.

## Project layout

```
sql/schema.sql            conditions / sessions / events tables + session_usage_summary view
sql/seed_conditions.sql   seeds the info x pricing condition matrix
src/lib/                  assignment, condition copy, model config, carbon estimator, provider clients
src/app/api/session       POST: create or resume a session, assigns a condition
src/app/api/chat          POST: streams a chat completion, logs prompt + response events
src/app/api/select-plan   POST: "fixed" pricing only -- pay the flat one-time price for heavy or light
src/app/api/submit-caption  POST: records the participant's final caption for their assigned cartoon
src/app/api/donate        POST: records the end-of-session donation, closes the session
src/lib/cartoons.ts       cartoon filename manifest + deterministic per-session pick + hotlink URL builder
src/app/page.tsx          the chat UI (client component)
src/components/           Sidebar, ModelPicker, MessageList, Composer, DonationModal, FixedPlanPicker, CaptionBox
```

## Setup

1. **Create a Supabase project**, then in the SQL editor run, in order:
   - `sql/schema.sql`
   - `sql/seed_conditions.sql`

   If you already ran `schema.sql` before these features were wired up, also run whichever of
   these you're missing, once each (new projects don't need them, they're already folded into
   `schema.sql`):
   - `sql/migration_add_cost_tracking.sql` — adds the cost column + view for "variable" pricing
   - `sql/migration_add_fixed_plans.sql` — adds the `fixed_plan_selected` event type + view update
     for the "fixed" pricing pre-chat plan picker
   - `sql/migration_add_cartoons_and_captions.sql` — adds `cartoon_filename` / `final_caption` on
     `sessions` and the `caption_submitted` event type

   The seed file ships all 4 info variants (environmental / energy_usage / convenience / none)
   x 3 pricing variants (variable / fixed / free) = 12 conditions. The design doc mentions
   targeting "9 conditions" but was unresolved on whether "convenience" (speed) is a 4th info
   arm — trim the `convenience_*` rows in `sql/seed_conditions.sql` to collapse to 3x3=9 if
   that's the design you land on. Condition count isn't hardcoded anywhere else — the assignment
   hash always mods by however many rows are in `conditions`.

2. **Copy `.env.example` to `.env.local`** and fill in:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API in Supabase)
   - `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`, matching whatever you set for
     `MODEL_HEAVY_PROVIDER` / `MODEL_LIGHT_PROVIDER`

3. **Install and run locally:**
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000.

4. **Deploy to Vercel:** import this repo, set the same environment variables in the Vercel
   project settings, deploy. No further config needed — the API routes run as Vercel functions.

## Participant linking (MTurk / Prolific)

The client reads a participant identifier from the URL (`?pid=...` or `?PROLIFIC_PID=...`) and
stores it on the session row (`sessions.participant_ref`), so a MTurk/Prolific redirect link can
tag each session without any extra setup.

## What's implemented vs. what's still open

Implemented: condition assignment, model-info + pricing nudge copy, cumulative usage/carbon/spend
sidebar, live social-norm stat ("x% of responses used the light model"), end-of-session donation
flow (capped at remaining, post-spend credit), full event log for later analysis.

Pricing conditions actually charge, differently per variant:
- **free**: never charges, regardless of model choice.
- **variable**: every response deducts `(tokens / 1000) * price-per-1k-tokens` from the credit
  (see `src/lib/pricing.ts`, prices in `.env.example`) — the per-token price is shown up front.
- **fixed**: before the first message, a plan-picker screen (`FixedPlanPicker`) asks the
  participant to choose heavy or light for a flat one-time price (`$2.00` / `$1.00` by default),
  charged once. That model is then locked for the rest of the session — the picker in the header
  becomes a plain "Your plan: Heavy" label, and `/api/chat` rejects requests for the other model
  server-side, not just in the UI.

Cartoon display and caption submission: each session gets one cartoon, picked once via the same
deterministic hash-mod-N scheme as condition assignment (`src/lib/cartoons.ts`), and shown for the
whole session. The image is **never downloaded or stored by this app or in this repo** — only its
filename (e.g. `"510.jpg"`) is kept, and the browser is pointed at
`CARTOON_IMAGE_BASE_URL/<filename>` (defaults to a fork of the nextml dataset's gh-pages branch) at
render time, so the actual artwork is always served directly from GitHub, not copied anywhere.
Submitting a caption writes it to `sessions.final_caption` and logs a `caption_submitted` event
alongside which cartoon it was for.

Not implemented (flagged here rather than guessed at, since the design doc leaves them open):
- The carbon/water estimator (`src/lib/carbon.ts`) uses illustrative, adjustable constants — the
  design doc explicitly calls out needing "an appropriate method" for this; treat the current
  numbers as a placeholder for relative comparison, not a validated figure.
- No MTurk/Prolific voting flow (the post-survey step where past captions get voted on) — only
  submission is implemented.
- No admin/export view over `events` — query Supabase directly (or build a view) for analysis in
  the meantime.

## Security

API keys and the Supabase service role key are read from server-side environment variables only
(`src/lib/*`, `src/app/api/*`), never sent to the client. Do not set them as `NEXT_PUBLIC_*`.

License: MIT
