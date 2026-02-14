ALTER TABLE `passagesProgresses` RENAME TO `camProgresses`;--> statement-breakpoint
ALTER TABLE `camProgresses` RENAME COLUMN "passageName" TO "partName";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_camProgresses` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`cambridgeVersion` text NOT NULL,
	`partName` text NOT NULL,
	`testName` text NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`needReview` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_camProgresses`("id", "userId", "cambridgeVersion", "partName", "testName", "result", "needReview") SELECT "id", "userId", "cambridgeVersion", "partName", "testName", "result", "needReview" FROM `camProgresses`;--> statement-breakpoint
DROP TABLE `camProgresses`;--> statement-breakpoint
ALTER TABLE `__new_camProgresses` RENAME TO `camProgresses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;