CREATE TABLE `account_mint_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`mint` text NOT NULL,
	`signal_id` text NOT NULL,
	`state` text DEFAULT 'reserved' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `trading_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_account_mint_locks` ON `account_mint_locks` (`account_id`,`mint`);--> statement-breakpoint
CREATE TABLE `caller_mint_history` (
	`id` text PRIMARY KEY NOT NULL,
	`caller_wallet` text NOT NULL,
	`mint` text NOT NULL,
	`first_callout_id` text NOT NULL,
	`first_published_at` integer NOT NULL,
	`history_complete` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_caller_mint_history` ON `caller_mint_history` (`caller_wallet`,`mint`);