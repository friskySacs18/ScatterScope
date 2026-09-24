CREATE TABLE `callout_ingest_state` (
	`source` text PRIMARY KEY NOT NULL,
	`last_seen_at` integer NOT NULL,
	`last_callout_at` integer
);
