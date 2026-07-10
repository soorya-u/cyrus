import { z } from "zod";
import { ToolCallStatusSchema, ToolKindSchema } from "../enums/tools";

export const MessageViewSchema = z.object({
	id: z.string(),
	role: z.enum(["user", "assistant"]),
	content: z.string(),
	createdAt: z.string(),
	turnId: z.string(),
	streaming: z.boolean().optional(),
});

export const ThoughtViewSchema = z.object({
	id: z.string(),
	content: z.string(),
	createdAt: z.string(),
	turnId: z.string(),
	streaming: z.boolean().optional(),
});

export const ToolCallViewSchema = z.object({
	toolCallId: z.string(),
	title: z.string(),
	kind: ToolKindSchema.optional(),
	status: ToolCallStatusSchema,
	rawInput: z.unknown().optional(),
	rawOutput: z.unknown().optional(),
	createdAt: z.string(),
	turnId: z.string(),
});

export const DiffViewSchema = z.object({
	id: z.string(),
	path: z.string(),
	patch: z.string(),
	additions: z.number(),
	deletions: z.number(),
	turnId: z.string(),
});

export const TurnViewSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	index: z.number(),
	state: z.enum(["running", "complete", "interrupted"]),
	completedAt: z.string().nullable(),
});

export const ThreadConversationSchema = z.object({
	messages: z.array(MessageViewSchema),
	thoughts: z.array(ThoughtViewSchema),
	toolCalls: z.array(ToolCallViewSchema),
	diffs: z.array(DiffViewSchema),
	turns: z.array(TurnViewSchema),
});

export type MessageView = z.infer<typeof MessageViewSchema>;
export type ThoughtView = z.infer<typeof ThoughtViewSchema>;
export type ToolCallView = z.infer<typeof ToolCallViewSchema>;
export type DiffView = z.infer<typeof DiffViewSchema>;
export type TurnView = z.infer<typeof TurnViewSchema>;
export type ThreadConversation = z.infer<typeof ThreadConversationSchema>;
