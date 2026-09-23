CREATE TABLE `account_deposits` (
	`signature` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`lamports` text NOT NULL,
	`slot` integer NOT NULL,
	`state` text NOT NULL,
	`observed_at` integer NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `trading_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_account_deposits_account` ON `account_deposits` (`account_id`);--> statement-breakpoint
CREATE TABLE `account_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`signal_id` text NOT NULL,
	`mint` text NOT NULL,
	`side` text NOT NULL,
	`max_lamports` text NOT NULL,
	`state` text DEFAULT 'queued' NOT NULL,
	`signature` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `trading_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_account_orders_signal` ON `account_orders` (`account_id`,`signal_id`,`side`);--> statement-breakpoint
CREATE TABLE `account_withdrawals` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`destination` text NOT NULL,
	`lamports` text NOT NULL,
	`state` text DEFAULT 'requested' NOT NULL,
	`user_approval_id` text,
	`signature` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `trading_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_account_withdrawals_idempotency` ON `account_withdrawals` (`account_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_account_withdrawals_signature` ON `account_withdrawals` (`signature`);--> statement-breakpoint
CREATE TABLE `trading_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider_wallet_id` text NOT NULL,
	`deposit_address` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `trading_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_trading_accounts_user` ON `trading_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_trading_accounts_wallet` ON `trading_accounts` (`provider_wallet_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_trading_accounts_address` ON `trading_accounts` (`deposit_address`);--> statement-breakpoint
CREATE TABLE `trading_users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_subject` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_trading_users_auth_subject` ON `trading_users` (`auth_subject`);