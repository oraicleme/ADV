CREATE TABLE `ads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`headline` varchar(200),
	`badge` varchar(100),
	`ctaButtons` text,
	`disclaimer` text,
	`layout` enum('single-hero','grid-2-6','category-groups','sale-discount') DEFAULT 'single-hero',
	`format` enum('viber-ig-story','instagram-post','facebook-ad','custom') DEFAULT 'viber-ig-story',
	`customWidth` int,
	`customHeight` int,
	`backgroundColor` varchar(7) DEFAULT '#f8fafc',
	`accentColor` varchar(7) DEFAULT '#f97316',
	`fontFamily` varchar(50) DEFAULT 'System Sans',
	`logoUrl` text,
	`productIds` text,
	`generatedUrl` text,
	`htmlContent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('logo','product-photo','generated-ad') NOT NULL,
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
	`mimeType` varchar(50),
	`fileName` varchar(255),
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` varchar(50),
	`photoUrl` text,
	`category` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
