import type {
	ToolCallStatus,
	ToolKind,
} from "@cyrus/connections/schemas/rtc/chat";

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

// re-exported so components don't need to reach into @cyrus/connections directly
export type ToolStatus = ToolCallStatus;

export type ToolCall = {
	args: Record<string, unknown>;
	createdAt: string;
	id: string;
	kind?: ToolKind;
	name: string;
	result?: string;
	status: ToolStatus;
	turnId: string;
};

export type GitDiff = {
	additions: number;
	deletions: number;
	id: string;
	patch: string;
	path: string;
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

export type Project = {
	id: string;
	name: string;
	path: string;
};

export type Thread = {
	branch: string | null;
	createdAt: string;
	diffs: GitDiff[];
	id: string;
	latestUserMessageAt: string | null;
	messages: Message[];
	model: string;
	projectId: string;
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
