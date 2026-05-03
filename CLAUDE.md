# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tennis-Ticker is a mobile-first PWA for live tennis score tracking and sharing among a small invite-only group of friends (<20 users). Users can create match encounters, ticker scores in real time, and share public read-only links with spectators.

**Status:** Greenfield — only the requirements document (`tennis-ticker-anforderungen.md`) exists. No source code yet.

## Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS | Vercel (free tier) |
| Backend | Next.js API Routes + Supabase Edge Functions | Vercel / Supabase |
| Database | Supabase (PostgreSQL) | Supabase (free tier) |
| Auth | Supabase Auth (Google OAuth, Apple OAuth) | Supabase |
| Realtime | Supabase Realtime Channels | Supabase |
| Notifications | Web Push API + Supabase Edge Functions | Supabase |
| Language | TypeScript throughout | — |

## Build & Dev Commands

> These commands apply once the project is scaffolded with `npx create-next-app`.

```bash
npm run dev          # Start local dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run tests (Jest, once configured)
npm test -- --testPathPattern=tennis-scoring  # Run single test file
```

Supabase local development:
```bash
supabase start       # Start local Supabase stack
supabase db push     # Apply migrations
supabase functions serve  # Serve Edge Functions locally
```

## Architecture

### Page Structure (Next.js App Router)

```
app/
  page.tsx                          → Landing / Login
  dashboard/page.tsx                → My encounters (auth required)
  encounters/new/page.tsx           → Create encounter
  encounters/[id]/page.tsx          → Manage encounter (auth)
  e/[share_token]/page.tsx          → Public encounter view (no auth)
  e/[share_token]/[match_id]/page.tsx → Public match view
  matches/[id]/ticker/page.tsx      → Ticker interface (auth + edit rights)
  matches/[id]/page.tsx             → Match detail (public)
  invite/[token]/page.tsx           → Accept invitation
```

### Key Modules

- `lib/tennis-scoring.ts` — Pure TypeScript scoring engine (no side effects, well-tested)
- `lib/supabase.ts` — Supabase client initialization (SSR + client-side)
- Supabase Edge Functions — triggered by DB webhooks on `score_events` to send Web Push notifications

### Scoring Engine (`lib/tennis-scoring.ts`)

The central logic module. Implement as pure functions:

```typescript
type MatchConfig = {
  numSets: number         // 1 | 3 | 5
  gamesPerSet: number     // usually 6
  tiebreakSets: boolean   // tiebreak at e.g. 6:6
  matchTiebreak: boolean  // match tiebreak instead of final set
  noAd: boolean           // no-advantage scoring
}

type MatchState = {
  config: MatchConfig
  sets: SetScore[]
  currentSet: number
  currentGame: GameScore
  servingTeam: 1 | 2
  winner: 1 | 2 | null
  status: 'pending' | 'running' | 'finished'
}

function applyPoint(state: MatchState, scoringTeam: 1 | 2): MatchState
function undoLastPoint(state: MatchState, events: ScoreEvent[]): MatchState
function getDisplayScore(state: MatchState): DisplayScore  // "40:15", "Deuce", "Advantage"
function isMatchFinished(state: MatchState): boolean
```

### Database Schema (Key Design Decisions)

**`score_events`** is append-only — the source of truth for undo and correction. Never mutate or delete rows; set `is_undone = true` to undo. Stores `point_before` and `point_after` as JSONB snapshots.

**`matches.edit_holder_id` + `edit_status`** manage per-match edit rights (not global). Two modes:
- `free` — anyone authenticated can claim edit rights (first-click-wins)
- `locked` — only the holder can ticker; others must send an `edit_request`

Match creator (`created_by`) can always revoke rights regardless of `edit_status`.

**`encounters.share_token`** enables public read-only access without authentication at `/e/[share_token]`.

### Row-Level Security (RLS)

All tables require RLS policies. Key rules:

```
encounters:    SELECT all | INSERT/UPDATE auth.users | DELETE creator only
matches:       SELECT all | INSERT auth.users
               UPDATE: edit_holder_id = auth.uid() OR created_by = auth.uid()
               "Claim" (set edit_holder_id to self): only when edit_status = 'free'
               → Enforce via RLS CHECK or Edge Function
score_events:  SELECT all | INSERT only if match.edit_holder_id = auth.uid()
profiles:      SELECT all auth.users | UPDATE own only
invitations:   SELECT/INSERT for auth.users (any member can invite)
subscriptions: all ops on own rows only
edit_requests: INSERT auth.users | UPDATE (accept/reject) only for match.edit_holder_id
```

### Auth & Invite-Only

- OAuth only (Google, Apple) — no email/password
- Supabase Auth Hook `on_auth_user_created` checks if email exists in `invitations`. If not → delete user immediately and surface error
- Unauthenticated users can read matches via share links, no login required

### Real-time

Use Supabase Realtime Channels on `score_events` and `matches` tables. Frontend uses optimistic updates for the ticker UI to minimize perceived latency.

### Web Push Notifications

Triggered by Supabase Edge Function via DB webhook on `score_events`. Supports per-match or per-encounter subscriptions with granularity: game end, set end, match end. Anonymous (no-login) push subscriptions are supported.

## Implementation Order

Follow this sequence to avoid blocking dependencies:

1. Supabase project setup — schema, RLS policies, OAuth config
2. Next.js scaffold — App Router, Supabase SSR client, auth middleware
3. Invite-only logic — Auth Hook, invitation flow
4. Encounters CRUD — create, list, share link
5. Matches CRUD — with configuration and player names
6. Score engine — `lib/tennis-scoring.ts` with full test coverage
7. Ticker UI — mobile-optimized, 80px+ tap targets, undo, manual correction modal
8. Realtime — Supabase Channels for live updates
9. Edit rights — transfer and request flows
10. Notifications — Web Push setup, Edge Function, subscription UI

## Mobile UX Requirements

- Ticker buttons minimum 80px tall
- Single-hand operation optimized
- PWA manifest for "Add to Home Screen"
- Dates displayed localized: "Sa, 3. Mai 2025"
- Encounter-level team score (number of match wins per team) aggregated and shown prominently
