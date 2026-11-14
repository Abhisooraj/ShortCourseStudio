CREATE TABLE `referrals` (
	`owner` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`friend_application` text,
	`wallet_application` text,
	`confirmed_at` text,
	`spent_at` text,
	FOREIGN KEY (`friend_application`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wallet_application`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referrals_code_unique` ON `referrals` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `referrals_friend_application_unique` ON `referrals` (`friend_application`);--> statement-breakpoint
CREATE UNIQUE INDEX `referrals_wallet_application_unique` ON `referrals` (`wallet_application`);