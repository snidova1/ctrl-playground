CREATE TABLE habitat_profiles (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, character TEXT NOT NULL, variant TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE habitat_worlds (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE REFERENCES habitat_profiles(id),
 name TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'private', layout TEXT NOT NULL DEFAULT '[]',
 revision INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE habitat_presence (
 profile_id TEXT PRIMARY KEY REFERENCES habitat_profiles(id), world_id TEXT NOT NULL REFERENCES habitat_worlds(id),
 x REAL NOT NULL DEFAULT 0, z REAL NOT NULL DEFAULT 6, angle REAL NOT NULL DEFAULT 3.14,
 motion TEXT NOT NULL DEFAULT '{}', seen_at INTEGER NOT NULL
);
CREATE INDEX habitat_presence_world ON habitat_presence(world_id,seen_at);
CREATE TABLE habitat_object_state (
 world_id TEXT NOT NULL REFERENCES habitat_worlds(id), object_id TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 0, used_at INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(world_id,object_id)
);
