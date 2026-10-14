CREATE TABLE town_routes (
 profile_id TEXT PRIMARY KEY REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 id TEXT NOT NULL UNIQUE,
 route_id TEXT NOT NULL,
 step INTEGER NOT NULL DEFAULT 0 CHECK(step>=0),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 ready_at INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL,
 completed_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE town_route_visits (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 site_id TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX town_route_visits_recent ON town_route_visits(created_at,site_id);
