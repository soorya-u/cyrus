import {
	ToolCallStatusSchema,
	ToolKindSchema,
} from "@cyrus/schemas/enums/tools";
import { z } from "zod";

export const PlanEntryPrioritySchema = z.enum(["high", "medium", "low"]);

export const PlanEntryStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
]);

export const PermissionOptionKindSchema = z.enum([
	"allow_once",
	"allow_always",
	"reject_once",
	"reject_always",
]);

export const TextContentBlockSchema = z.object({
	type: z.literal("text"),
	text: z.string(),
});

export const TextResourceContentsSchema = z.object({
	uri: z.string(),
	text: z.string(),
	mimeType: z.string().nullish(),
});

export const BlobResourceContentsSchema = z.object({
	uri: z.string(),
	blob: z.string(),
	mimeType: z.string().nullish(),
});

export const ContentBlockSchema = z.discriminatedUnion("type", [
	TextContentBlockSchema,
	z.object({
		type: z.literal("image"),
		data: z.string(),
		mimeType: z.string(),
		uri: z.string().nullish(),
	}),
	z.object({
		type: z.literal("audio"),
		data: z.string(),
		mimeType: z.string(),
	}),
	z.object({
		type: z.literal("resource_link"),
		uri: z.string(),
		name: z.string(),
		mimeType: z.string().nullish(),
		description: z.string().nullish(),
		size: z.number().nullish(),
		title: z.string().nullish(),
	}),
	z.object({
		type: z.literal("resource"),
		resource: z.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
	}),
]);

export const DiffSchema = z.object({
	path: z.string(),
	oldText: z.string().nullish(),
	newText: z.string(),
	patch: z.string(),
	additions: z.number(),
	deletions: z.number(),
});

export const TerminalSchema = z.object({
	terminalId: z.string(),
});

export const ToolCallContentSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("content"),
		content: ContentBlockSchema,
	}),
	z.object({ type: z.literal("diff"), ...DiffSchema.shape }),
	z.object({ type: z.literal("terminal"), ...TerminalSchema.shape }),
]);

export const ToolCallLocationSchema = z.object({
	path: z.string(),
	line: z.number().nullish(),
});

export const ToolCallFieldsSchema = z.object({
	toolCallId: z.string(),
	title: z.string(),
	kind: ToolKindSchema.optional(),
	status: ToolCallStatusSchema.optional(),
	content: z.array(ToolCallContentSchema).optional(),
	locations: z.array(ToolCallLocationSchema).optional(),
	rawInput: z.unknown().optional(),
	rawOutput: z.unknown().optional(),
});

export const ToolCallUpdateFieldsSchema = z.object({
	toolCallId: z.string(),
	kind: ToolKindSchema.nullish(),
	status: ToolCallStatusSchema.nullish(),
	title: z.string().nullish(),
	content: z.array(ToolCallContentSchema).nullish(),
	locations: z.array(ToolCallLocationSchema).nullish(),
	rawInput: z.unknown().optional(),
	rawOutput: z.unknown().optional(),
});

export const PlanEntrySchema = z.object({
	content: z.string(),
	priority: PlanEntryPrioritySchema,
	status: PlanEntryStatusSchema,
});

export const PlanUpdateContentSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("items"),
		id: z.string(),
		entries: z.array(PlanEntrySchema),
	}),
	z.object({
		type: z.literal("file"),
		id: z.string(),
		uri: z.string(),
	}),
	z.object({
		type: z.literal("markdown"),
		id: z.string(),
		content: z.string(),
	}),
]);

export const PermissionOptionSchema = z.object({
	optionId: z.string(),
	name: z.string(),
	kind: PermissionOptionKindSchema,
});

export const ApprovalRequestSchema = z.object({
	sessionId: z.string(),
	toolCall: ToolCallUpdateFieldsSchema,
	options: z.array(PermissionOptionSchema),
});

export const TokenEventSchema = z.object({
	type: z.literal("token"),
	text: z.string(),
	messageId: z.string().nullish(),
});

export const ThoughtEventSchema = z.object({
	type: z.literal("thought"),
	text: z.string(),
	messageId: z.string().nullish(),
});

export const ToolCallEventSchema = ToolCallFieldsSchema.extend({
	type: z.literal("tool_call"),
});

export const ToolCallUpdateEventSchema = ToolCallUpdateFieldsSchema.extend({
	type: z.literal("tool_call_update"),
});

export const PlanEventSchema = z.object({
	type: z.literal("plan"),
	entries: z.array(PlanEntrySchema),
});

export const PlanUpdateEventSchema = z.object({
	type: z.literal("plan_update"),
	plan: PlanUpdateContentSchema,
});

export const PlanRemovedEventSchema = z.object({
	type: z.literal("plan_removed"),
	id: z.string(),
});

export const ApprovalRequestEventSchema = z.object({
	type: z.literal("approval_request"),
	request: ApprovalRequestSchema,
});

export const SessionUpdateEventSchema = z.object({
	type: z.literal("session_update"),
	sessionUpdate: z.string(),
	raw: z.unknown(),
});

export const MessageCompletedEventSchema = z.object({
	type: z.literal("message_completed"),
	text: z.string(),
	messageId: z.string().nullish(),
});

export const ReasoningCompletedEventSchema = z.object({
	type: z.literal("reasoning_completed"),
	text: z.string(),
	messageId: z.string().nullish(),
});

export const ThreadStartedEventSchema = z.object({
	type: z.literal("thread_started"),
	threadId: z.string(),
});

export const UserMessageEventSchema = z.object({
	type: z.literal("user_message"),
	content: z.string(),
});

export const TurnCompletedEventSchema = z.object({
	type: z.literal("turn_completed"),
});

export const TurnInterruptedEventSchema = z.object({
	type: z.literal("turn_interrupted"),
});

export const AgentEventSchema = z.discriminatedUnion("type", [
	ThreadStartedEventSchema,
	UserMessageEventSchema,
	TurnCompletedEventSchema,
	TurnInterruptedEventSchema,
	TokenEventSchema,
	ThoughtEventSchema,
	MessageCompletedEventSchema,
	ReasoningCompletedEventSchema,
	ToolCallEventSchema,
	ToolCallUpdateEventSchema,
	PlanEventSchema,
	PlanUpdateEventSchema,
	PlanRemovedEventSchema,
	ApprovalRequestEventSchema,
	SessionUpdateEventSchema,
]);

export type ToolCallStatus = z.infer<typeof ToolCallStatusSchema>;
export type ToolKind = z.infer<typeof ToolKindSchema>;
export type PlanEntry = z.infer<typeof PlanEntrySchema>;
export type ToolCallContent = z.infer<typeof ToolCallContentSchema>;
export type ToolCallLocation = z.infer<typeof ToolCallLocationSchema>;
export type ToolCallFields = z.infer<typeof ToolCallFieldsSchema>;
export type ToolCallUpdateFields = z.infer<typeof ToolCallUpdateFieldsSchema>;
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type Diff = z.infer<typeof DiffSchema>;

export const ChatInputSchema = z.object({
	agentName: z.string(),
	message: z.string(),
	threadId: z.uuid().optional(),
	projectId: z.string(),
});

export const ChatChunkSchema = z.object({
	threadId: z.string(),
	turnId: z.string(),
	seq: z.number(),
	event: AgentEventSchema,
});

export type ChatChunk = z.infer<typeof ChatChunkSchema>;

export const CancelInputSchema = z.object({
	agentName: z.string(),
	threadId: z.string(),
});

export type CancelInput = z.infer<typeof CancelInputSchema>;
