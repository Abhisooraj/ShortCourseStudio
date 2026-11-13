CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`college` text NOT NULL,
	`created_at` text NOT NULL,
	`amount` integer NOT NULL,
	`order_id` text,
	`payment_id` text,
	`payment_state` text DEFAULT 'unpaid' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_order_id_unique` ON `applications` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_payment_id_unique` ON `applications` (`payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_course_batch_email` ON `applications` (`slug`,`batch`,`email`);--> statement-breakpoint
CREATE TABLE `course_settings` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text,
	`blurb` text,
	`outcome` text,
	`days` text,
	`schedule` text DEFAULT '' NOT NULL,
	`mode` text DEFAULT '' NOT NULL,
	`batch` text DEFAULT 'batch-1' NOT NULL,
	`status` text DEFAULT 'soon' NOT NULL
);
