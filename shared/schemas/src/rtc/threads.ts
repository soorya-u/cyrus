import { z } from "zod";
import { ChatChunkSchema, ChatMessageSchema } from "./chat";
import { optionalBoolean, optionalString } from "./common";

const nullableString = z
	.string()
	.nullish()
	.transform((value) => value ?? null);

export const TitleSourceSchema = z.enum(["auto", "agent", "user"]);

export const ThreadSchema = z.object({
	id: z.string(),
	projectId: z.string(),
	name: z.string(),
	agentName: optionalString,
	sessionId: optionalString,
	agentLocked: optionalBoolean,
	titleSource: TitleSourceSchema.nullish().transform((value) => value ?? null),
	branch: nullableString.optional(),
	worktreePath: nullableString.optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const ConversationEntrySchema = z.object({
	id: z.string(),
	threadId: z.string(),
	seq: z.number(),
	chunk: ChatChunkSchema,
	createdAt: z.string(),
});

export const ProjectQueryInputSchema = z.object({
	projectId: z.string(),
});

export const ThreadQueryInputSchema = z.object({
	threadId: z.string(),
	afterSeq: z.number().optional(),
});

export const WatchThreadInputSchema = z.object({
	threadId: z.string(),
});

export const WatchThreadOutputSchema = z.object({
	snapshotHighWaterMark: z.number(),
});

export const UnwatchThreadInputSchema = z.object({
	threadId: z.string(),
});

export const RenameThreadInputSchema = z.object({
	threadId: z.string(),
	name: z.string().min(1),
});

export const StartThreadInputSchema = z.object({
	projectId: z.string(),
	agentName: z.string(),
	message: ChatMessageSchema,
	turnId: z.uuid().optional(),
	branch: z.string().min(1).optional(),
	worktree: z.boolean().optional(),
	worktreePath: z.string().min(1).optional(),
	preferences: z
		.object({
			modelId: z.string().optional(),
			modeId: z.string().optional(),
			effortId: z.string().optional(),
			personaId: z.string().optional(),
		})
		.optional(),
});

export const StartThreadOutputSchema = z.object({
	threadId: z.string(),
	turnId: z.string(),
});

export const ListThreadsOutputSchema = z.object({
	threads: z.array(ThreadSchema),
});

export const GetConversationsOutputSchema = z.object({
	conversations: z.array(ConversationEntrySchema),
});

export type TitleSource = z.infer<typeof TitleSourceSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
export type ConversationEntry = z.infer<typeof ConversationEntrySchema>;
export type ProjectQueryInput = z.infer<typeof ProjectQueryInputSchema>;
export type ThreadQueryInput = z.infer<typeof ThreadQueryInputSchema>;
export type WatchThreadInput = z.infer<typeof WatchThreadInputSchema>;
export type WatchThreadOutput = z.infer<typeof WatchThreadOutputSchema>;
export type UnwatchThreadInput = z.infer<typeof UnwatchThreadInputSchema>;
export type StartThreadInput = z.infer<typeof StartThreadInputSchema>;
export type StartThreadOutput = z.infer<typeof StartThreadOutputSchema>;
export type ListThreadsOutput = z.infer<typeof ListThreadsOutputSchema>;
export type GetConversationsOutput = z.infer<
	typeof GetConversationsOutputSchema
>;
