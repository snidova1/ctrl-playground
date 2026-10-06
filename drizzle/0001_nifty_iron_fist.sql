CREATE TABLE `compute_reservations` (
	`mission_id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`budget` real NOT NULL,
	`cost` real,
	`state` text NOT NULL,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `compute_reservations_period` ON `compute_reservations` (`period`);