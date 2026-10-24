-- Real cooked-meal escrow. Creation debits inventory in the same guarded batch.
CREATE TABLE cozy_life_servings (
  id TEXT PRIMARY KEY NOT NULL,
  maker_id TEXT NOT NULL REFERENCES cozy_life_states(profile_id),
  item_id TEXT NOT NULL CHECK (item_id IN ('garden-soup','grilled-fish')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','eaten')),
  taker_id TEXT REFERENCES cozy_life_states(profile_id),
  created_at INTEGER NOT NULL,
  eaten_at INTEGER,
  CHECK ((status='open' AND taker_id IS NULL AND eaten_at IS NULL) OR (status='eaten' AND taker_id IS NOT NULL AND eaten_at IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX cozy_life_servings_open ON cozy_life_servings(status,created_at DESC);
--> statement-breakpoint
CREATE INDEX cozy_life_servings_maker ON cozy_life_servings(maker_id,status);
