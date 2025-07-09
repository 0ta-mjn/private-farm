CREATE TABLE `diaries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`title` text,
	`content` text DEFAULT '',
	`work_type` text,
	`weather` text,
	`temperature` real,
	`duration` real,
	`user_id` text,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diaries_date_idx` ON `diaries` (`date`);--> statement-breakpoint
CREATE INDEX `diaries_user_date_idx` ON `diaries` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `diaries_org_date_idx` ON `diaries` (`organization_id`,`date`);--> statement-breakpoint
CREATE INDEX `diaries_work_type_idx` ON `diaries` (`work_type`);--> statement-breakpoint
CREATE TABLE `diary_things` (
	`diary_id` text NOT NULL,
	`thing_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`diary_id`, `thing_id`),
	FOREIGN KEY (`diary_id`) REFERENCES `diaries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thing_id`) REFERENCES `things`(`thing_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `discord_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`channel_name` text NOT NULL,
	`guild_id` text NOT NULL,
	`guild_name` text DEFAULT '' NOT NULL,
	`webhook_id` text,
	`webhook_token_enc` text,
	`mention_role_id` text,
	`notification_settings` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `discord_channels_organization_idx` ON `discord_channels` (`organization_id`);--> statement-breakpoint
CREATE INDEX `discord_channels_guild_idx` ON `discord_channels` (`guild_id`);--> statement-breakpoint
CREATE INDEX `discord_channels_channel_idx` ON `discord_channels` (`channel_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_org_channel` ON `discord_channels` (`organization_id`,`channel_id`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`latest_viewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_org` ON `organization_members` (`user_id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `things` (
	`thing_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text DEFAULT '',
	`location` text,
	`area` real,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_external_accounts` (
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`display_name` text,
	PRIMARY KEY(`provider`, `provider_user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_provider_unique` ON `user_external_accounts` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
