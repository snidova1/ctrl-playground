CREATE TABLE town_projects (
 id TEXT PRIMARY KEY, stage INTEGER NOT NULL DEFAULT 0 CHECK(stage>=0),
 revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, completed_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE town_project_work (
 project_id TEXT NOT NULL REFERENCES town_projects(id) ON DELETE CASCADE,
 stage INTEGER NOT NULL CHECK(stage>=0), receipt TEXT NOT NULL REFERENCES town_contributions(id),
 profile_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL, PRIMARY KEY(project_id,receipt)
);
CREATE INDEX town_project_stage ON town_project_work(project_id,stage);
CREATE TABLE town_activity_events (
 id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 kind TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX town_activity_history ON town_activity_events(profile_id,created_at);
-- Keep earlier completed work visible when an existing town upgrades.
INSERT INTO town_activity_events(id,profile_id,kind,target,created_at)
 SELECT id,profile_id,'completed',activity_id,created_at FROM town_contributions;
INSERT INTO town_activity_events(id,profile_id,kind,target,created_at)
 SELECT id||':recipient',recipient,kind,initiator,accepted_at FROM town_social_actions WHERE accepted_at>0;
INSERT INTO town_activity_events(id,profile_id,kind,target,created_at)
 SELECT id||':initiator',initiator,kind,recipient,accepted_at FROM town_social_actions WHERE accepted_at>0;
