import { z } from "zod";
import { ChatChunkSchema } from "./chat";
import { optionalString } from "./common";

export const ThreadSchema = z.object({
	id: z.string(),
	projectId: z.string(),
	name: z.string(),
	agentName: optionalString,
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
export type CreateThreadInput = z.infer<typeof CreateThreadInputSchema>;
export type CreateThreadOutput = z.infer<typeof CreateThreadOutputSchema>;
export type ListThreadsOutput = z.infer<typeof ListThreadsOutputSchema>;
export type GetConversationsOutput = z.infer<
	typeof GetConversationsOutputSchema
>;
