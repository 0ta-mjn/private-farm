CREATE TABLE `devices_info` (
	`deveui` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`application_id` text,
	`application_name` text
);
--> statement-breakpoint
CREATE INDEX `idx_deveui` ON `devices_info` (`deveui`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deduplication_id` text NOT NULL,
	`property_type` text NOT NULL,
	`deveui` text NOT NULL,
	`timestamp` integer NOT NULL,
	`value` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sensor_id_timestamp` ON `observations` (`deveui`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_property_type` ON `observations` (`property_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `observations_deduplication_id_property_type_unique` ON `observations` (`deduplication_id`,`property_type`);