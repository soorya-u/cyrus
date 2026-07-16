import type { RuntimeSession } from "@acp-kit/core";
import type { AvailableCommand } from "@agentclientprotocol/sdk";

export type ThreadSessionMetadata = {
	commands: AvailableCommand[];
	usage: {
		used?: number;
		limit?: number;
	};
};

export function commandsFromSession(
	session: RuntimeSession
): AvailableCommand[] {
	return session.transcript.session.commands ?? [];
}

export function usageFromSession(
	session: RuntimeSession
): ThreadSessionMetadata["usage"] {
	const usage = session.transcript.session.usage ?? {};
	return {
		used: usage.used ?? usage.totalTokens,
		limit: usage.size,
	};
}

export class SessionMetadataStore {
	private readonly metadataByThread = new Map<string, ThreadSessionMetadata>();
	private readonly sessionUnsubs = new Map<string, () => void>();

	getAvailableCommands(threadId: string): AvailableCommand[] {
		return this.metadataByThread.get(threadId)?.commands ?? [];
	}

	getContextUsage(threadId: string): { used?: number; limit?: number } | null {
		const usage = this.metadataByThread.get(threadId)?.usage;
		if (!usage || (usage.used === undefined && usage.limit === undefined))
			return null;

		return usage;
	}

	attach(threadId: string, session: RuntimeSession): void {
		this.detach(threadId);
		this.metadataByThread.set(threadId, {
			commands: commandsFromSession(session),
			usage: usageFromSession(session),
		});

		const unsub = session.on({
			sessionCommandsUpdated: (event) => {
				const current = this.metadataByThread.get(threadId);
				this.metadataByThread.set(threadId, {
					commands: event.commands,
					usage: current?.usage ?? {},
				});
			},
			sessionUsageUpdated: (event) => {
				const current = this.metadataByThread.get(threadId);
				this.metadataByThread.set(threadId, {
					commands: current?.commands ?? [],
					usage: {
						used: event.used ?? event.totalTokens,
						limit: event.size,
					},
				});
			},
		});
		this.sessionUnsubs.set(threadId, unsub);
	}

	detach(threadId: string): void {
		this.sessionUnsubs.get(threadId)?.();
		this.sessionUnsubs.delete(threadId);
		this.metadataByThread.delete(threadId);
	}

	clearAll(): void {
		for (const threadId of [...this.metadataByThread.keys()]) {
			this.detach(threadId);
		}
	}

	syncFromEvent(
		threadId: string,
		event: {
			type: string;
			commands?: AvailableCommand[];
			used?: number;
			size?: number;
			totalTokens?: number;
		}
	): void {
		if (event.type === "session.commands.updated") {
			const current = this.metadataByThread.get(threadId);
			this.metadataByThread.set(threadId, {
				commands: event.commands ?? [],
				usage: current?.usage ?? {},
			});
			return;
		}

		if (event.type === "session.usage.updated") {
			const current = this.metadataByThread.get(threadId);
			this.metadataByThread.set(threadId, {
				commands: current?.commands ?? [],
				usage: {
					used: event.used ?? event.totalTokens,
					limit: event.size,
				},
			});
		}
	}
}
