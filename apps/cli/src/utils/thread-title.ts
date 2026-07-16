import { getConversations } from "@cyrus/database/repositories/conversations";
import { applyAutoThreadTitle } from "@cyrus/database/repositories/threads";
import { fold } from "@cyrus/utils/conversations/fold";

export async function maybeApplyAutoThreadTitle(
	threadId: string,
	turnId: string
): Promise<void> {
	const conversations = await getConversations(threadId);
	if (conversations.isErr()) return;

	const completedTurns = conversations.value.filter(
		(entry) => entry.chunk.event.type === "turn_completed"
	);
	if (completedTurns.length !== 1) return;

	const folded = fold(conversations.value);
	if (folded.isErr()) return;

	const userMessage = folded.value.messages.find(
		(message) => message.role === "user" && message.turnId === turnId
	);
	const assistantMessage = folded.value.messages.find(
		(message) => message.role === "assistant" && message.turnId === turnId
	);

	await applyAutoThreadTitle(
		threadId,
		userMessage?.content ?? "",
		assistantMessage?.content
	);
}
