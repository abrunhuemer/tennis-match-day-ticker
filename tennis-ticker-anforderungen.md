# Tennis-Ticker – Anforderungsdokument

> Dieses Dokument beschreibt die vollständigen Anforderungen der Tennis-Ticker Applikation.
> Es dient als Referenz für die Entwicklung mit Claude als Coding-Assistent.

---

## Projektübersicht

**Ziel:** Web-Applikation zum Live-Tickern und Teilen von Tennis-Matchständen unter Freunden.
**Nutzer:** Kleiner, invite-only Freundeskreis (<20 Personen).
**Plattform:** Mobile-first PWA, bedienbar im Browser ohne App-Installation.

---

## Tech-Stack

| Schicht | Technologie | Hosting |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS | Vercel (free tier) |
| Backend / API | Next.js API Routes + Supabase Edge Functions | Vercel / Supabase |
| Datenbank | Supabase (PostgreSQL) | Supabase (free tier) |
| Auth | Supabase Auth (Google OAuth, Apple OAuth) | Supabase |
| Realtime | Supabase Realtime Channels | Supabase |
| Notifications | Web Push API + Supabase Edge Functions | Supabase |
| Deployment | GitHub → Vercel CI/CD | Vercel |

---

## Datenbankschema

### Tabelle: `profiles`
Wird automatisch bei Registrierung aus `auth.users` befüllt.

```sql
id          uuid PRIMARY KEY REFERENCES auth.users
display_name text NOT NULL
email        text NOT NULL
avatar_url   text
invited_by   uuid REFERENCES profiles(id)
created_at   timestamptz DEFAULT now()
```

### Tabelle: `invitations`
Kontrolliert den Invite-Only-Zugang.

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
email        text NOT NULL UNIQUE
invited_by   uuid REFERENCES profiles(id)
accepted_at  timestamptz
created_at   timestamptz DEFAULT now()
```

### Tabelle: `encounters`
Eine Begegnung (z.B. Vereinsvergleich) mit mehreren Einzel- und Doppelspielen.

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
name         text NOT NULL          -- z.B. "TC Rot-Weiß vs. TC Blau"
title        text                   -- optionaler Freitext-Titel, z.B. "Relegation 2025"
date         date NOT NULL          -- Datum der Begegnung, Pflichtfeld
location     text
created_by   uuid REFERENCES profiles(id)
share_token  text UNIQUE DEFAULT gen_random_uuid()::text  -- für öffentliche Links
created_at   timestamptz DEFAULT now()
```

**Anzeige:** In der Übersicht und im Share-Link wird das Datum prominent angezeigt.
Format: "Sa, 3. Mai 2025" (lokalisiert). Titel (falls vorhanden) erscheint als Untertitel unter dem Namen.

### Tabelle: `matches`
Ein einzelnes Einzel- oder Doppelspiel innerhalb einer Begegnung.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
encounter_id    uuid REFERENCES encounters(id) ON DELETE CASCADE
type            text CHECK (type IN ('singles', 'doubles'))
order_index     int NOT NULL       -- Reihenfolge in der Begegnung

-- Spieler (bei singles: player2/4 null)
player1_name    text NOT NULL
player2_name    text               -- Doppelpartner Team A
player3_name    text NOT NULL      -- Gegner / Team B Spieler 1
player4_name    text               -- Doppelpartner Team B

-- Match-Konfiguration
num_sets        int DEFAULT 3      -- 1, 3 oder 5
games_per_set   int DEFAULT 6      -- meist 6
tiebreak_sets   boolean DEFAULT true   -- Tiebreak bei Satzgleichstand
match_tiebreak  boolean DEFAULT true   -- Match-Tiebreak statt 3. Satz
no_ad           boolean DEFAULT false  -- No-Ad Scoring

-- Status & Editierrechte
status          text DEFAULT 'pending' CHECK (status IN ('pending','running','finished','cancelled'))
edit_holder_id  uuid REFERENCES profiles(id)  -- wer darf gerade tickern (null = frei)
edit_status     text DEFAULT 'free' CHECK (edit_status IN ('free','locked'))
                -- 'free'   → kein Holder oder Holder hat aufgegeben → jeder kann übernehmen
                -- 'locked' → Holder hat aktiv gesperrt → nur Transfer oder Request möglich
edit_token      text UNIQUE DEFAULT gen_random_uuid()::text

-- Ergebnis
winner_team     int CHECK (winner_team IN (1, 2))
created_by      uuid REFERENCES profiles(id)
created_at      timestamptz DEFAULT now()
```

### Tabelle: `sets`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
match_id    uuid REFERENCES matches(id) ON DELETE CASCADE
set_number  int NOT NULL
games_team1 int DEFAULT 0
games_team2 int DEFAULT 0
is_tiebreak boolean DEFAULT false
winner_team int CHECK (winner_team IN (1, 2))
started_at  timestamptz
finished_at timestamptz
```

### Tabelle: `score_events`
Append-only Event-Log – Grundlage für Undo und Korrektur.

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
match_id     uuid REFERENCES matches(id) ON DELETE CASCADE
set_id       uuid REFERENCES sets(id)
event_type   text CHECK (event_type IN ('point','undo','correction','serve_change'))
scoring_team int CHECK (scoring_team IN (1, 2))
point_before jsonb   -- Snapshot des Stands VOR diesem Event
point_after  jsonb   -- Snapshot des Stands NACH diesem Event
server_team  int     -- wer hat aufgeschlagen (1 oder 2)
created_by   uuid REFERENCES profiles(id)
created_at   timestamptz DEFAULT now()
is_undone    boolean DEFAULT false
```

### Tabelle: `edit_requests`
Für die Übergabe von Editierrechten.

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
match_id     uuid REFERENCES matches(id) ON DELETE CASCADE
requester_id uuid REFERENCES profiles(id)
status       text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected'))
created_at   timestamptz DEFAULT now()
```

### Tabelle: `subscriptions`
Wer will welche Push-Benachrichtigungen.

```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id           uuid REFERENCES profiles(id)  -- null = anonymer Web-Push
push_endpoint     text NOT NULL
push_keys         jsonb NOT NULL              -- {p256dh, auth}
encounter_id      uuid REFERENCES encounters(id)   -- null = nur einzelnes Match
match_id          uuid REFERENCES matches(id)       -- null = ganze Begegnung
notify_on_game    boolean DEFAULT false
notify_on_set     boolean DEFAULT true
notify_on_match   boolean DEFAULT true
created_at        timestamptz DEFAULT now()
```

---

## Funktionale Anforderungen

### F1 – Authentifizierung & Invite-Only

- Login ausschließlich via Google OAuth oder Apple OAuth (Supabase Auth)
- Registrierung nur möglich wenn die E-Mail-Adresse in `invitations` eingetragen ist
- Unauthentifizierte Nutzer können Begegnungen und Matches über Share-Links **lesen** (kein Login nötig)
- Invite-Verwaltung erfolgt durch bestehende User (kein Admin-Panel nötig in V1)

**Umsetzung:** Supabase Auth Hook `on_auth_user_created` prüft ob E-Mail in `invitations` existiert. Falls nicht → User wird sofort gelöscht und erhält Fehlermeldung.

### F2 – Begegnungen (Encounters)

- Erstellen einer Begegnung mit:
  - Name (Pflicht, z.B. "TC Rot-Weiß vs. TC Blau")
  - Titel (optional, z.B. "Relegation 2025" – erscheint als Untertitel)
  - Datum (Pflicht – wird prominent auf der Übersichtsseite und im Share-Link angezeigt)
  - Ort (optional)
- Eine Begegnung enthält beliebig viele Einzel- und Doppelspiele (typisch: 5+5)
- Übersichtsseite zeigt alle Spiele mit aktuellem Stand auf einen Blick
- Begegnung ist über einen Share-Link (`/e/[share_token]`) öffentlich lesbar
- Begegnungsstand (Anzahl gewonnener Matches pro Team) wird aggregiert angezeigt

### F3 – Match-Verwaltung

- Match anlegen mit:
  - Spielertyp (Einzel / Doppel)
  - Spielernamen (2 oder 4)
  - Konfiguration: Anzahl Sätze, Games pro Satz, Tiebreak ja/nein, Match-Tiebreak ja/nein, No-Ad ja/nein
- Reihenfolge der Matches in der Begegnung ist sortierbar
- Match-Status: ausstehend / laufend / beendet / abgebrochen

### F4 – Ticker-Interface

- Zentrales Element: große Tap-Buttons für Punkt für Team 1 / Team 2
- Anzeige des aktuellen Stands:
  - Satzstand (z.B. 6:4, 3:3)
  - Aktueller Game-Stand tennis-üblich: 0, 15, 30, 40, Einstand, Vorteil
  - Aufschläger-Anzeige (Ball-Symbol ●  neben aufschlagendem Spieler / Team)
  - Laufender Satz hervorgehoben
- Undo-Button: macht letzten Punkt rückgängig (setzt `is_undone = true` im letzten Event)
- Manuelle Korrektur: Modal zum direkten Setzen von Satz- und Gamestand
- Serve-Wechsel-Button: manuell Aufschläger wechseln (falls falsch gestartet)

### F5 – Realtime

- Alle verbundenen Clients (Ticker + Zuschauer) sehen Standänderungen sofort
- Umsetzung via Supabase Realtime auf Tabellen `score_events` und `matches`
- Optimistic Updates im Frontend für flüssige Ticker-Erfahrung

### F6 – Editierrechte

Editierrechte gelten **pro Match** – verschiedene Personen können gleichzeitig verschiedene Matches tickern. Jedes Match verwaltet seinen `edit_holder_id` und `edit_status` unabhängig.

**Zwei Modi je Match:**

**Modus "frei" (`edit_status = 'free'`):**
- Kein aktiver Holder, oder Holder hat Rechte aktiv aufgegeben
- Jeder eingeloggte User sieht einen "Übernehmen"-Button und kann sofort Holder werden
- Erster Klick gewinnt (optimistic update + DB-seitiger Check)

**Modus "gesperrt" (`edit_status = 'locked'`):**
- Ein Holder ist aktiv am Tickern und hat nicht aufgegeben
- Andere User können eine Anfrage stellen (`edit_requests`)
- Holder sieht Realtime-Notification und akzeptiert oder lehnt ab

**Aktionen des aktuellen Holders:**
- "Sperren" – setzt `edit_status = 'locked'` (Standard beim ersten Übernehmen)
- "Freigeben" – setzt `edit_status = 'free'`, `edit_holder_id = null` → Match ist sofort schnappbar
- "Übergeben an..." – direkte Übergabe an bestimmte Person (überspringt Request-Flow)

**Override durch Match-Ersteller:**
- Der `created_by`-User kann Rechte jederzeit entziehen, unabhängig von `edit_status`
- Setzt `edit_holder_id = null`, `edit_status = 'free'`

**Sichtbarkeit:**
- Für alle sichtbar: wer aktuell die Editierrechte hat (Name + Avatar), oder "Frei – jetzt übernehmen"
- Ohne Editierrechte: Ticker-Buttons deaktiviert, nur Lesen möglich

**RLS-Implikation:** UPDATE auf `matches` ist erlaubt wenn `edit_holder_id = auth.uid()` ODER `created_by = auth.uid()`. Das "Schnappen" (Setzen von `edit_holder_id` auf sich selbst) ist nur erlaubt wenn `edit_status = 'free'` – serverseitig via RLS-Policy oder Edge Function absichern.

### F7 – Notifications (Web Push)

- Nutzer können Push-Abos abschließen für:
  - Einzelnes Match (Game-Ende, Satz-Ende, Match-Ende)
  - Ganze Begegnung (Satz-Ende, Match-Ende – kein Game-Noise)
- Auch ohne Login möglich (anonymes Web Push)
- Notification-Inhalt:
  - Game-Ende: "Müller/Huber 4:2 (laufender Satz)"
  - Satz-Ende: "Satz 1 an Team A: 6:3"
  - Match-Ende: "Match beendet: Müller gewinnt 6:3, 7:5"
- Umsetzung: Supabase Edge Function triggered by DB webhook auf `score_events`

### F8 – Mobile UX

- Mobile-first Design, primär für Einhand-Bedienung optimiert
- Ticker-Buttons mindestens 80px hoch, gut tippbar
- PWA Manifest für "Add to Home Screen"
- Landscape-Orientierung für Ticker-View optional unterstützt

---

## Nicht-funktionale Anforderungen

- **Skalierung:** Ausgelegt für <20 gleichzeitige Nutzer, kein Enterprise-Scaling nötig
- **Offline:** Kein Offline-Support in V1
- **Kosten:** Free Tier von Supabase + Vercel, Ziel 0 €/Monat
- **Security:** Row-Level Security (RLS) auf allen Tabellen
- **Datenschutz:** Keine sensiblen Daten, DSGVO-Anforderungen minimal

---

## Row-Level Security (RLS) – Übersicht

```
encounters:    SELECT für alle | INSERT/UPDATE für auth.users | DELETE für created_by
matches:       SELECT für alle | INSERT für auth.users
               UPDATE für edit_holder_id = auth.uid() ODER created_by = auth.uid()
               "Schnappen" (edit_holder_id auf sich setzen) nur wenn edit_status = 'free'
               → via RLS CHECK oder Edge Function absichern
score_events:  SELECT für alle | INSERT nur wenn match.edit_holder_id = auth.uid()
profiles:      SELECT für alle auth.users | UPDATE nur eigenes Profil
invitations:   SELECT/INSERT für auth.users (jeder eingeladene kann einladen)
subscriptions: alle Operationen nur auf eigene Zeilen
edit_requests: INSERT für auth.users | UPDATE (accept/reject) nur für match.edit_holder_id = auth.uid()
```

---

## Seitenstruktur (Next.js App Router)

```
/                          → Landing / Login
/dashboard                 → Meine Begegnungen (auth required)
/encounters/new            → Begegnung erstellen
/encounters/[id]           → Begegnung verwalten (auth)
/e/[share_token]           → Begegnung öffentlich ansehen (kein auth)
/e/[share_token]/[match_id] → Einzelnes Match ansehen
/matches/[id]/ticker       → Ticker-Interface (auth + edit rights)
/matches/[id]              → Match-Detailansicht (public)
/invite/[token]            → Einladung annehmen
```

---

## Implementierungs-Reihenfolge (empfohlen)

1. **Supabase Setup** – Projekt anlegen, Schema ausführen, RLS aktivieren, OAuth konfigurieren
2. **Next.js Grundgerüst** – App Router, Supabase Client (SSR), Auth-Middleware
3. **Invite-Only-Logik** – Auth Hook, Invitation-Flow
4. **Encounters CRUD** – Erstellen, Auflisten, Share-Link
5. **Matches CRUD** – Anlegen mit Konfiguration, Spielernamen
6. **Score-Engine** – Tennis-Scoring-Logik als separates TypeScript-Modul (pure functions, gut testbar)
7. **Ticker-UI** – Mobile-optimierte Buttons, Stand-Anzeige, Undo
8. **Realtime** – Supabase Channels für Live-Updates
9. **Editierrechte** – Transfer-Flow, Request-Flow
10. **Notifications** – Web Push Setup, Edge Function, Subscription-UI

---

## Tennis-Scoring-Logik (Modul-Spec)

Das Scoring wird als pure TypeScript-Modul implementiert (`/lib/tennis-scoring.ts`).

```typescript
type MatchConfig = {
  numSets: number         // 1 | 3 | 5
  gamesPerSet: number     // meist 6
  tiebreakSets: boolean   // Tiebreak bei z.B. 6:6
  matchTiebreak: boolean  // Match-Tiebreak statt letztem Satz
  noAd: boolean           // No-Ad scoring
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

// Kernfunktionen:
function applyPoint(state: MatchState, scoringTeam: 1 | 2): MatchState
function undoLastPoint(state: MatchState, events: ScoreEvent[]): MatchState
function getDisplayScore(state: MatchState): DisplayScore  // "40:15", "Einstand", etc.
function isMatchFinished(state: MatchState): boolean
```

---

## Prompting-Hinweise für Claude

Wenn du mit Claude an diesem Projekt arbeitest, füge am Anfang jedes Chats hinzu:

```
Wir bauen den Tennis-Ticker. Stack: Next.js App Router, Supabase (PostgreSQL + Auth + Realtime), 
Tailwind CSS, TypeScript, deployed auf Vercel. 
Anforderungsdokument: [dieses Dokument einfügen oder referenzieren]
Aktuelle Aufgabe: [z.B. "Implementiere die Score-Engine in /lib/tennis-scoring.ts"]
```

Nützliche Prompts:
- "Erstelle die Supabase-Migration für das vollständige Schema aus dem Anforderungsdokument"
- "Implementiere die Tennis-Scoring-Engine als pure TypeScript-Modul mit Tests"
- "Baue die Ticker-UI-Komponente für /matches/[id]/ticker, mobile-first"
- "Implementiere den Realtime-Hook für Live-Standaktualisierungen mit Supabase Channels"
- "Erstelle die RLS-Policies für alle Tabellen gemäß Anforderungsdokument"
