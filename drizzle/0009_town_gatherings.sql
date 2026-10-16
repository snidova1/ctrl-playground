CREATE TABLE town_gatherings (
 id TEXT PRIMARY KEY,
 host_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 world_id TEXT NOT NULL REFERENCES habitat_worlds(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('picnic','dance','workshop')),
 x REAL NOT NULL,
 z REAL NOT NULL,
 created_at INTEGER NOT NULL,
 ends_at INTEGER NOT NULL,
 ended_at INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0,
 started_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX town_gatherings_world ON town_gatherings(world_id,ends_at);
CREATE TABLE town_gathering_guests (
 gathering_id TEXT NOT NULL REFERENCES town_gatherings(id) ON DELETE CASCADE,
 profile_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 joined_at INTEGER NOT NULL,
 arrived_at INTEGER NOT NULL DEFAULT 0,
 departed_at INTEGER NOT NULL DEFAULT 0,
 blocked INTEGER NOT NULL DEFAULT 0 CHECK(blocked IN (0,1)),
 PRIMARY KEY(gathering_id,profile_id)
);
