CREATE TABLE `userActiveLog` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniqueUserDate` ON `userActiveLog` (`userId`,`date`);