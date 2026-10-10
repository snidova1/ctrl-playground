CREATE TABLE habitat_members (
 world_id TEXT NOT NULL REFERENCES habitat_worlds(id) ON DELETE CASCADE,
 profile_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('editor','visitor')),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(world_id,profile_id)
);
CREATE INDEX habitat_members_profile ON habitat_members(profile_id,world_id);
ALTER TABLE habitat_presence ADD COLUMN session_id TEXT NOT NULL DEFAULT '';
ALTER TABLE habitat_presence ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;
