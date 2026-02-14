CREATE TABLE `feelingItems` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	`timestamp` text NOT NULL,
	`feeling` text NOT NULL,
	`isLoved` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
