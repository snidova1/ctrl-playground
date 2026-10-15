-- Presence is ephemeral and deleted on pagehide. Keep destination separately;
-- restoration must still recheck current world permissions before joining.
CREATE TABLE habitat_last_location (
 profile_id TEXT PRIMARY KEY REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 world_id TEXT NOT NULL REFERENCES habitat_worlds(id) ON DELETE CASCADE,
 updated_at INTEGER NOT NULL
);
INSERT INTO habitat_last_location(profile_id,world_id,updated_at)
 SELECT profile_id,world_id,seen_at FROM habitat_presence;
