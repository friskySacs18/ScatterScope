CREATE TABLE `campaign_launches` (
	`mint` text PRIMARY KEY NOT NULL,
	`observed_at` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`symbol` text DEFAULT '' NOT NULL,
	`launch_market_cap_sol` real,
	`run_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_campaign_launches_observed_at` ON `campaign_launches` (`observed_at`);--> statement-breakpoint
CREATE TABLE `campaign_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`reason` text NOT NULL,
	`token_count` integer DEFAULT 0 NOT NULL,
	`trade_count` integer DEFAULT 0 NOT NULL,
	`persistence_state` text DEFAULT 'stored' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_campaign_runs_started_at` ON `campaign_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `campaign_trades` (
	`signature` text PRIMARY KEY NOT NULL,
	`mint` text NOT NULL,
	`observed_at` integer NOT NULL,
	`side` text NOT NULL,
	`price_sol` real NOT NULL,
	`sol_amount` real NOT NULL,
	`token_amount` real NOT NULL,
	`market_cap_sol` real,
	`trader` text DEFAULT '' NOT NULL,
	`run_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_campaign_trades_mint_observed_at` ON `campaign_trades` (`mint`,`observed_at`);--> statement-breakpoint
CREATE INDEX `idx_campaign_trades_observed_at` ON `campaign_trades` (`observed_at`);