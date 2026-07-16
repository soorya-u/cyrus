import { createAcpRuntime } from "@acp-kit/core";
import { nodeChildProcessTransport } from "@acp-kit/core/node";
import { Result } from "better-result";
import { agentEntryToProfile } from "@/core/agents/profile";
import { env } from "@/lib/env";
import { toMessage } from "@/utils/error";
import type { AgentEntry } from "@/validators/agent";
import { createInteractiveHost } from "./interactive";

export type AcpPingSuccess = {
	agentName?: string;
	agentVersion?: string;
};

export async function pingAcpAgent(
	registryId: string,
	entry: AgentEntry
): Promise<Result<AcpPingSuccess, string>> {
	const profile = await agentEntryToProfile(registryId, entry);
	if (profile.isErr()) return Result.err(profile.error);

	const created = Result.try(() =>
		createAcpRuntime({
			agent: {
				...profile.value,
				startupTimeoutMs: env.CYRUS_ACP_TIMEOUT_MS,
			},
			transport: nodeChildProcessTransport(),
			host: createInteractiveHost(),
		})
	);
	if (created.isErr()) return Result.err(toMessage(created.error));
	const acp = created.value;

	const ready = await Result.tryPromise({
		try: () => acp.ready(),
		catch: (error) => toMessage(error),
	});

	await Result.tryPromise(() => acp.shutdown());

	return ready.map(() => ({
		agentName: acp.agentInfo?.name,
		agentVersion: acp.agentInfo?.version,
	}));
}
