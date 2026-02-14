CREATE TABLE `passagesProgresses` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`cambridgeVersion` text NOT NULL,
	`passageName` text NOT NULL,
	`testName` text NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`needReview` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer,
	`cookies` text NOT NULL,
	`sessionData` text NOT NULL,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);