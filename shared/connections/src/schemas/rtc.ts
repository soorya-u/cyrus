import { z } from "zod";

const DirPathSchema = z
	.string()
	.regex(/^[A-Za-z0-9\s_\-/\\]+$/, "Invalid directory path");

export const HelloInputSchema = z.object({ name: z.string() });

export const HelloOutputSchema = z.object({
	greeting: z.string(),
	peerId: z.string(),
});

export const ChatInputSchema = z.object({
	agentName: z.string(),
	message: z.string(),
	threadId: z.uuidv7().optional(),
	cwd: DirPathSchema,
});

export const ChatChunkSchema = z.object({ chunk: z.string() });

export type ChatChunk = z.infer<typeof ChatChunkSchema>;
