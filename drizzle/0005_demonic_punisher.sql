CREATE TABLE `automation_drafts` (
	`auth_subject` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`callers_json` text NOT NULL,
	`rules_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
