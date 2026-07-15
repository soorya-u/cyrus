import { z } from "zod";
import { ToolCallStatusSchema, ToolKindSchema } from "../enums/tools";
import { PromptInputBlockSchema } from "../rtc/chat";

export const MessageViewSchema = z.object({
	id: z.string(),
	role: z.enum(["user", "assistant"]),
	content: z.string(),
	blocks: z.array(PromptInputBlockSchema).optional(),
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
	toolCallId: z.string().optional(),
});

export const TurnViewSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	index: z.number(),
	state: z.enum(["running", "complete", "interrupted"]),
	completedAt: z.string().nullable(),
});

export const ErrorViewSchema = z.object({
	id: z.string(),
	message: z.string(),
	code: z.string().optional(),
	createdAt: z.string(),
	turnId: z.string(),
});

export const ApprovalOptionViewSchema = z.object({
	optionId: z.string(),
	name: z.string(),
	kind: z.string(),
});

export const ApprovalViewSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	sessionId: z.string(),
	toolCallId: z.string(),
	title: z.string().optional(),
	options: z.array(ApprovalOptionViewSchema),
	createdAt: z.string(),
	turnId: z.string(),
	resolved: z.boolean().optional(),
});

export const ElicitationViewSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	sessionId: z.string(),
	elicitationId: z.string(),
	mode: z.enum(["form", "url"]),
	message: z.string().optional(),
	url: z.string().optional(),
	requestedSchema: z.record(z.string(), z.unknown()).optional(),
	createdAt: z.string(),
	turnId: z.string(),
	resolved: z.boolean().optional(),
});

export const ThreadConversationSchema = z.object({
	messages: z.array(MessageViewSchema),
	thoughts: z.array(ThoughtViewSchema),
	toolCalls: z.array(ToolCallViewSchema),
	diffs: z.array(DiffViewSchema),
	errors: z.array(ErrorViewSchema),
	approvals: z.array(ApprovalViewSchema),
	elicitations: z.array(ElicitationViewSchema),
	turns: z.array(TurnViewSchema),
});

export type MessageView = z.infer<typeof MessageViewSchema>;
export type ThoughtView = z.infer<typeof ThoughtViewSchema>;
export type ToolCallView = z.infer<typeof ToolCallViewSchema>;
export type DiffView = z.infer<typeof DiffViewSchema>;
export type TurnView = z.infer<typeof TurnViewSchema>;
export type ErrorView = z.infer<typeof ErrorViewSchema>;
export type ApprovalView = z.infer<typeof ApprovalViewSchema>;
export type ElicitationView = z.infer<typeof ElicitationViewSchema>;
export type ThreadConversation = z.infer<typeof ThreadConversationSchema>;
