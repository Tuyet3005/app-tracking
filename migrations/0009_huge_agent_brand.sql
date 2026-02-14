CREATE TABLE `todoItems` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
