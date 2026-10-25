-- Heartopia-style town life. Additive only: legacy tables stay untouched so the
-- previous staging Worker keeps running while this migration is applied.
CREATE TABLE town_life (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  state TEXT NOT NULL CHECK (json_valid(state)),
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE town_presence (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES habitat_profiles(id),
  x REAL NOT NULL DEFAULT 0,
  z REAL NOT NULL DEFAULT 12,
  angle REAL NOT NULL DEFAULT 3.14,
  anim TEXT NOT NULL DEFAULT 'idle',
  emote TEXT NOT NULL DEFAULT '',
  emote_at INTEGER NOT NULL DEFAULT 0,
  seen_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX town_presence_seen ON town_presence(seen_at);
--> statement-breakpoint
CREATE TABLE friendships (
  requester TEXT NOT NULL REFERENCES habitat_profiles(id),
  addressee TEXT NOT NULL REFERENCES habitat_profiles(id),
  status TEXT NOT NULL CHECK (status IN ('pending','accepted')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (requester, addressee),
  CHECK (requester <> addressee)
);
--> statement-breakpoint
CREATE INDEX friendships_addressee ON friendships(addressee, status);
--> statement-breakpoint
CREATE TABLE town_mail (
  id TEXT PRIMARY KEY NOT NULL,
  sender TEXT NOT NULL REFERENCES habitat_profiles(id),
  recipient TEXT NOT NULL REFERENCES habitat_profiles(id),
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  claimed_at INTEGER
);
--> statement-breakpoint
CREATE INDEX town_mail_recipient ON town_mail(recipient, claimed_at);
