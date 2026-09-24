CREATE TABLE `monitored_callouts` (
	`id` text PRIMARY KEY NOT NULL,
	`caller_wallet` text NOT NULL,
	`mint` text NOT NULL,
	`published_at` integer NOT NULL,
	`observed_at` integer NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_monitored_callouts_observed_at` ON `monitored_callouts` (`observed_at`);