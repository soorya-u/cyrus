export type Role = "user" | "assistant";

export type MessageStatus = "streaming" | "complete" | "interrupted";

export type Message = {
	content: string;
	createdAt: string;
	id: string;
	role: Role;
	streaming?: boolean;
	turnId: string;
};

export type ToolStatus = "running" | "complete" | "error";

export type ToolCall = {
	args: Record<string, unknown>;
	createdAt: string;
	id: string;
	name: string;
	result?: string;
	status: ToolStatus;
	turnId: string;
};

export type GitDiff = {
	additions: number;
	deletions: number;
	file: string;
	id: string;
	patch: string;
	turnId: string;
};

export type Turn = {
	completedAt: string | null;
	id: string;
	index: number;
	state: "running" | "complete" | "interrupted";
	threadId: string;
};

export type ThreadStatus = "running" | "ready" | "starting" | "error" | "idle";

export type Thread = {
	branch: string | null;
	createdAt: string;
	diffs: GitDiff[];
	id: string;
	latestUserMessageAt: string | null;
	messages: Message[];
	model: string;
	status: ThreadStatus;
	title: string;
	toolCalls: ToolCall[];
	turns: Turn[];
	updatedAt: string;
};

export type FeedEntry = {
	activities?: ToolCall[];
	diffs?: GitDiff[];
	expanded?: boolean;
	id: string;
	label?: string;
	message?: Message;
	turnId?: string;
	type: "message" | "work" | "turn-fold";
};
