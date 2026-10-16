CREATE TABLE town_progress (
 profile_id TEXT PRIMARY KEY REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 completed INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
);
CREATE TABLE town_jobs (
 id TEXT PRIMARY KEY, profile_id TEXT NOT NULL UNIQUE REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 activity_id TEXT NOT NULL, session_id TEXT NOT NULL, started_at INTEGER NOT NULL,
 ready_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, completed_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE town_contributions (
 id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 activity_id TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX town_contributions_activity ON town_contributions(activity_id,created_at);
CREATE TABLE town_garden (
 id TEXT PRIMARY KEY, crop TEXT, planted_at INTEGER NOT NULL DEFAULT 0, watered_at INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE town_friendships (
 requester TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 recipient TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK(status IN ('pending','accepted')), created_at INTEGER NOT NULL,
 PRIMARY KEY(requester,recipient), CHECK(requester<>recipient)
);
CREATE TABLE town_invites (
 id TEXT PRIMARY KEY, sender TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 recipient TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 destination TEXT NOT NULL, expires_at INTEGER NOT NULL, accepted_at INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX town_friend_pair ON town_friendships(MIN(requester,recipient),MAX(requester,recipient));
CREATE INDEX town_invites_recipient ON town_invites(recipient,expires_at);
CREATE TABLE town_social_actions (
 id TEXT PRIMARY KEY, initiator TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 recipient TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('high-five','dance')), world_id TEXT NOT NULL REFERENCES habitat_worlds(id),
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, accepted_at INTEGER NOT NULL DEFAULT 0,
 CHECK(initiator<>recipient)
);
CREATE INDEX town_social_recipient ON town_social_actions(recipient,expires_at);
CREATE TABLE town_chat (
 id TEXT PRIMARY KEY, world_id TEXT NOT NULL REFERENCES habitat_worlds(id) ON DELETE CASCADE,
 profile_id TEXT NOT NULL REFERENCES habitat_profiles(id) ON DELETE CASCADE,
 text TEXT NOT NULL CHECK(length(text)>0 AND length(text)<=120), created_at INTEGER NOT NULL
);
CREATE INDEX town_chat_world ON town_chat(world_id,created_at);
