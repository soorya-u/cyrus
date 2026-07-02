import { createAcpRuntime } from "@acp-kit/core";
import { nodeChildProcessTransport } from "@acp-kit/core/node";
import { Result } from "better-result";
import { agentEntryToProfile } from "@/core/agents/profile";
import { env } from "@/lib/env";
import { toMessage } from "@/utils/error";
import type { AgentEntry } from "@/validators/agent";
import { createDefaultHost } from "./host";

export type AcpPingSuccess = {
	agentName?: string;
	agentVersion?: string;
};

export async function pingAcpAgent(
	entry: AgentEntry
): Promise<Result<AcpPingSuccess, string>> {
	const executable = Bun.which(entry.command);
	if (!executable)
		return Result.err(`command not found on PATH: ${entry.command}`);

	const acp = createAcpRuntime({
		agent: {
			...agentEntryToProfile("doctor", entry),
			startupTimeoutMs: env.CYRUS_ACP_TIMEOUT_MS,
		},
		transport: nodeChildProcessTransport(),
		host: createDefaultHost(),
	});

	const ready = await Result.tryPromise({
		try: acp.ready,
		catch: (error) => toMessage(error),
	});

	await Result.tryPromise(acp.shutdown);

	return ready.map(() => ({
		agentName: acp.agentInfo?.name ?? undefined,
		agentVersion: acp.agentInfo?.version ?? undefined,
	}));
}
