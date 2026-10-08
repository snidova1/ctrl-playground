CREATE TABLE `plaza_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`object_id` text NOT NULL,
	`kind` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `plaza_visitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `plaza_action_visitor_idx` ON `plaza_actions` (`visitor_id`,`at`);--> statement-breakpoint
CREATE TABLE `plaza_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`blueprint` text NOT NULL,
	`x` real NOT NULL,
	`z` real NOT NULL,
	`rotation` real NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`used_at` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `plaza_visitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `plaza_owner_idx` ON `plaza_objects` (`owner_id`);--> statement-breakpoint
CREATE TABLE `plaza_players` (
	`id` text PRIMARY KEY NOT NULL,
	`x` real NOT NULL,
	`z` real NOT NULL,
	`angle` real NOT NULL,
	`moving` integer DEFAULT 0 NOT NULL,
	`seen_at` integer NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `plaza_visitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `plaza_seen_idx` ON `plaza_players` (`seen_at`);--> statement-breakpoint
CREATE TABLE `plaza_visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`plot` integer NOT NULL,
	`drinks` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plaza_token_idx` ON `plaza_visitors` (`token_hash`);