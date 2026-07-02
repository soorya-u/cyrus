import { z } from "zod";
import { AgentEventSchema } from "./chat";

export const HelloInputSchema = z.object({ name: z.string() });

export const HelloOutputSchema = z.object({
	greeting: z.string(),
	peerId: z.string(),
});

export const ChatInputSchema = z.object({
	agentName: z.string(),
	message: z.string(),
	threadId: z.uuidv7().optional(),
	projectId: z.string(),
});

export const ChatChunkSchema = AgentEventSchema;

export type ChatChunk = z.infer<typeof ChatChunkSchema>;
