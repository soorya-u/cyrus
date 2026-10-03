CREATE TABLE `conversations` (
	`seq` integer PRIMARY KEY AUTOINCREMENT,
	`id` text NOT NULL,
	`thread_id` text NOT NULL,
	`chunk` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_conversations_thread_id_threads_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY,
	`cwd` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`title_source` text,
	`agent_name` text,
	`session_id` text,
	`agent_locked` integer DEFAULT 0 NOT NULL,
	`branch` text,
	`worktree_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_threads_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_conversations_thread_seq` ON `conversations` (`thread_id`,`seq`);