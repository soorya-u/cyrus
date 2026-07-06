import type { AgentEvent } from "@cyrus/connections/schemas/chat";
import type {
	ConversationEntry,
	Thread,
} from "@cyrus/connections/schemas/threads";
import { generateId } from "@/utils/identity";
import { getProject } from "./projects";

const threads = new Map<string, Thread>();
const conversations = new Map<string, ConversationEntry[]>();

let conversationSeq = 0;

function nowISO(): string {
	return new Date().toISOString();
}

export function threadNameFromPrompt(message: string): string {
	const trimmed = message.trim();
	if (!trimmed) {
		return "New thread";
	}
	return trimmed.slice(0, 50);
}

export function ensureThread(
	id: string,
	projectId: string,
	options?: { agentName?: string; firstMessage?: string }
): Thread {
	if (!getProject(projectId)) {
		throw new Error(`project not found: ${projectId}`);
	}

	const existing = threads.get(id);
	if (existing) {
		const name =
			options?.firstMessage && existing.name === "New thread"
				? threadNameFromPrompt(options.firstMessage)
				: existing.name;
		const thread: Thread = {
			...existing,
			name,
			agentName: options?.agentName ?? existing.agentName,
			updatedAt: nowISO(),
		};
		threads.set(id, thread);
		return thread;
	}

	const thread: Thread = {
		id,
		projectId,
		name: options?.firstMessage
			? threadNameFromPrompt(options.firstMessage)
			: "New thread",
		agentName: options?.agentName,
		createdAt: nowISO(),
		updatedAt: nowISO(),
	};
	threads.set(id, thread);
	conversations.set(id, []);
	return thread;
}

export function createThread(projectId: string): Thread {
	return ensureThread(generateId(), projectId);
}

export function listThreads(projectId: string): Thread[] {
	return [...threads.values()]
		.filter((thread) => thread.projectId === projectId)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function appendConversation(
	threadId: string,
	event: AgentEvent
): ConversationEntry {
	const entry: ConversationEntry = {
		id: String(++conversationSeq),
		threadId,
		event,
		createdAt: nowISO(),
	};
	const list = conversations.get(threadId) ?? [];
	list.push(entry);
	conversations.set(threadId, list);

	const thread = threads.get(threadId);
	if (thread) {
		threads.set(threadId, { ...thread, updatedAt: nowISO() });
	}

	return entry;
}

export function getConversations(threadId: string): ConversationEntry[] {
	return [...(conversations.get(threadId) ?? [])];
}

export function deleteThread(threadId: string): boolean {
	conversations.delete(threadId);
	return threads.delete(threadId);
}

export function deleteThreadsForProject(projectId: string): void {
	for (const thread of threads.values()) {
		if (thread.projectId === projectId) {
			deleteThread(thread.id);
		}
	}
}

export function renameThread(threadId: string, name: string): Thread {
	const thread = threads.get(threadId);
	if (!thread) {
		throw new Error(`thread not found: ${threadId}`);
	}
	const updated = { ...thread, name, updatedAt: nowISO() };
	threads.set(threadId, updated);
	return updated;
}

export function getThread(threadId: string): Thread | undefined {
	return threads.get(threadId);
}
