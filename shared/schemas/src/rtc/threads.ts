import { z } from "zod";
import { ChatChunkSchema } from "./chat";
import { optionalBoolean, optionalString } from "./common";

export const ThreadSchema = z.object({
	id: z.string(),
	projectId: z.string(),
	name: z.string(),
	agentName: optionalString,
	sessionId: optionalString,
	agentLocked: optionalBoolean,
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

export const CreateThreadInputSchema = z.object({
	projectId: z.string(),
});

export const CreateThreadOutputSchema = z.object({
	thread: ThreadSchema,
});

export const ListThreadsOutputSchema = z.object({
	threads: z.array(ThreadSchema),
});

export const GetConversationsOutputSchema = z.object({
	conversations: z.array(ConversationEntrySchema),
});

export type Thread = z.infer<typeof ThreadSchema>;
export type ConversationEntry = z.infer<typeof ConversationEntrySchema>;
export type ProjectQueryInput = z.infer<typeof ProjectQueryInputSchema>;
export type ThreadQueryInput = z.infer<typeof ThreadQueryInputSchema>;
export type WatchThreadInput = z.infer<typeof WatchThreadInputSchema>;
export type WatchThreadOutput = z.infer<typeof WatchThreadOutputSchema>;
export type UnwatchThreadInput = z.infer<typeof UnwatchThreadInputSchema>;
export type CreateThreadInput = z.infer<typeof CreateThreadInputSchema>;
export type CreateThreadOutput = z.infer<typeof CreateThreadOutputSchema>;
export type ListThreadsOutput = z.infer<typeof ListThreadsOutputSchema>;
export type GetConversationsOutput = z.infer<
	typeof GetConversationsOutputSchema
>;
