CREATE TABLE `databaseBackups` (
	`id` integer PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`blobKey` text NOT NULL
);
