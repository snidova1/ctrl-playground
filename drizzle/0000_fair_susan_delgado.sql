CREATE TABLE `control_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mission_id` text NOT NULL,
	`period` text NOT NULL,
	`amount` integer NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `allocations_user_period` ON `control_allocations` (`user_id`,`period`);--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`mission_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`created_at` text NOT NULL,
	`visibility` text NOT NULL,
	`sha256` text NOT NULL,
	`preview` text NOT NULL,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `artifacts_mission` ON `artifacts` (`mission_id`);--> statement-breakpoint
CREATE TABLE `mission_events` (
	`id` text PRIMARY KEY NOT NULL,
	`mission_id` text NOT NULL,
	`type` text NOT NULL,
	`stage` text NOT NULL,
	`tool` text,
	`message` text NOT NULL,
	`at` text NOT NULL,
	`cost` real,
	`provider` text,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_mission_at` ON `mission_events` (`mission_id`,`at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` text PRIMARY KEY NOT NULL,
	`command` text NOT NULL,
	`owner_id` text NOT NULL,
	`creator` text NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`finished_at` text,
	`status` text NOT NULL,
	`kind` text DEFAULT 'research' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`support` integer DEFAULT 0 NOT NULL,
	`control` integer DEFAULT 0 NOT NULL,
	`burn` real DEFAULT 0 NOT NULL,
	`budget` real NOT NULL,
	`consumed` real DEFAULT 0 NOT NULL,
	`feasibility` text DEFAULT 'READY' NOT NULL,
	`result` text,
	`error` text,
	`world_slug` text,
	`demo` integer DEFAULT 1 NOT NULL,
	`input` text,
	`lease_owner` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `missions_visibility_created` ON `missions` (`visibility`,`created_at`);--> statement-breakpoint
CREATE INDEX `missions_status_support` ON `missions` (`status`,`support`);--> statement-breakpoint
CREATE INDEX `missions_owner` ON `missions` (`owner_id`);--> statement-breakpoint
CREATE TABLE `nonces` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mission_receipts` (
	`mission_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `operator_reputation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mission_id` text,
	`signal` text NOT NULL,
	`delta` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reputation_user` ON `operator_reputation` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `holder_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`balance` text NOT NULL,
	`chain_id` integer NOT NULL,
	`block` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `snapshots_user_created` ON `holder_snapshots` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `mission_support` (
	`id` text PRIMARY KEY NOT NULL,
	`mission_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `control_allocations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `support_mission` ON `mission_support` (`mission_id`);--> statement-breakpoint
CREATE TABLE `system_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`mission_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`cost` real,
	`settled` integer DEFAULT 1 NOT NULL,
	`usage_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_mission` ON `provider_usage` (`mission_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet` text,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`reputation` integer DEFAULT 0 NOT NULL,
	`lock_amount` real DEFAULT 0 NOT NULL,
	`lock_days` integer DEFAULT 0 NOT NULL,
	`lock_until` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_wallet` ON `users` (`wallet`);--> statement-breakpoint
CREATE TABLE `worlds` (
	`slug` text PRIMARY KEY NOT NULL,
	`mission_id` text NOT NULL,
	`manifest` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
