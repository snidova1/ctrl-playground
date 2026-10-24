-- Nonfinancial wallet-bound activity progression. No financial balances or token rewards.
CREATE TABLE cozy_life_states (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  state TEXT NOT NULL CHECK (json_valid(state)),
  updated_at INTEGER NOT NULL,
  CHECK (json_extract(state, '$.revision') = revision)
);
--> statement-breakpoint
CREATE TABLE cozy_life_offers (
  id TEXT PRIMARY KEY NOT NULL,
  maker_id TEXT NOT NULL REFERENCES cozy_life_states(profile_id),
  give_item TEXT NOT NULL,
  give_quantity INTEGER NOT NULL CHECK (give_quantity BETWEEN 1 AND 100),
  want_item TEXT NOT NULL,
  want_quantity INTEGER NOT NULL CHECK (want_quantity BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','canceled')),
  taker_id TEXT REFERENCES cozy_life_states(profile_id),
  created_at INTEGER NOT NULL,
  closed_at INTEGER,
  CHECK (give_item <> want_item),
  CHECK (taker_id IS NULL OR taker_id <> maker_id)
);
--> statement-breakpoint
CREATE INDEX cozy_life_offers_open ON cozy_life_offers(status,created_at DESC);
--> statement-breakpoint
CREATE INDEX cozy_life_offers_maker ON cozy_life_offers(maker_id,status);
--> statement-breakpoint
-- D1 batch rolls back on SQL errors, NOT on a zero-row CAS. Each mandatory write
-- is followed by a changes() assertion into this single-row, non-player table.
-- Named CHECK fails the ENTIRE batch when any CAS or offer claim loses a race.
CREATE TABLE cozy_life_atomic_guard (
  id INTEGER PRIMARY KEY CONSTRAINT cozy_life_cas_success CHECK (id = 1)
);
