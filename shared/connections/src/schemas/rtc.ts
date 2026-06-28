import { z } from "zod";

export const HelloInputSchema = z.object({ name: z.string() });

export const HelloOutputSchema = z.object({
	greeting: z.string(),
	peerId: z.string(),
});

export const ChatInputSchema = z.object({ message: z.string() });

export const ChatChunkSchema = z.object({ chunk: z.string() });
