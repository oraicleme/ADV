CREATE TABLE `suggestionAnalytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agent` varchar(64) NOT NULL,
	`totalSuggestions` int NOT NULL DEFAULT 0,
	`appliedSuggestions` int NOT NULL DEFAULT 0,
	`avgPerformanceImpact` decimal(5,2),
	`applyRate` decimal(5,4),
	`avgConfidence` decimal(3,2),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suggestionAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suggestionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agent` varchar(64) NOT NULL,
	`userRequest` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`impact` varchar(20) NOT NULL,
	`reasoning` text,
	`confidence` decimal(3,2) NOT NULL,
	`applied` boolean NOT NULL DEFAULT false,
	`performanceImpact` int,
	`embedding` text,
	`canvasStateSnapshot` text,
	`productContext` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suggestionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `suggestionAnalytics` ADD CONSTRAINT `suggestionAnalytics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suggestionHistory` ADD CONSTRAINT `suggestionHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `userAgentIdx` ON `suggestionAnalytics` (`userId`,`agent`);--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `suggestionHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `agentIdx` ON `suggestionHistory` (`agent`);--> statement-breakpoint
CREATE INDEX `appliedIdx` ON `suggestionHistory` (`applied`);