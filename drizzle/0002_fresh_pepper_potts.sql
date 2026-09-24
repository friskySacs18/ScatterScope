CREATE TABLE `callout_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`caller_wallet` text NOT NULL,
	`mint` text NOT NULL,
	`published_at` integer NOT NULL,
	`observed_at` integer NOT NULL,
	`source` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_callout_observations_received_at` ON `callout_observations` (`received_at`);--> statement-breakpoint
CREATE INDEX `idx_callout_observations_caller_published` ON `callout_observations` (`caller_wallet`,`published_at`);