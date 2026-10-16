-- Keep each day's completed shared preparation, including after later resets.
CREATE TABLE town_daily_tables (
 day TEXT PRIMARY KEY,
 served_at INTEGER NOT NULL,
 served_by TEXT REFERENCES habitat_profiles(id) ON DELETE SET NULL
);
CREATE INDEX town_contribution_day_activity ON town_contributions(created_at,activity_id);
