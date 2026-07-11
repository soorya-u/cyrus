import { pingAcpAgent } from "@/core/acp/ping";
import { getAgent, listAgents } from "@/store/agents";
import { createSpinner } from "@/utils/spinner";
import { green, print, red } from "@/utils/style";
import type { AgentEntry } from "@/validators/agent";

type HealthResult = {
	healthy: boolean;
	error?: string;
};

async function checkAgent(
	registryId: string,
	entry: AgentEntry
): Promise<HealthResult> {
	const spinner = createSpinner(`Checking ${registryId}…`);
	spinner.start();
	const result = await pingAcpAgent(registryId, entry);
	spinner.stop();
	return result.match<HealthResult>({
		ok: () => ({ healthy: true }),
		err: (error) => ({ healthy: false, error }),
	});
}

function printHealth(registryId: string, result: HealthResult): void {
	const status = result.healthy ? green("healthy") : red("unhealthy");
	print.line`${registryId}: ${status}`;
	if (result.error) print.line`  ${result.error}`;
}

async function checkSingleAgentHealth(registryId: string) {
	const entry = await getAgent(registryId);
	entry.match({
		ok: async (agent) => {
			if (!agent) {
				print.error`agent "${registryId}" is not enabled`;
				print.dim`Add it with \`cyrusd agents add ${registryId}\`.`;
				process.exit(1);
			}

			const result = await checkAgent(registryId, agent);
			printHealth(registryId, result);
			if (!result.healthy) process.exit(1);
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}

async function checkAllAgentsHealth() {
	const agents = await listAgents();
	await agents.match({
		ok: async (registry) => {
			const entries = Object.entries(registry).sort(([a], [b]) =>
				a.localeCompare(b)
			);

			if (entries.length === 0) {
				print.dim`No agents enabled. Run \`cyrusd agents add <registry-id>\`.`;
				process.exit(1);
			}

			const results: { registryId: string; result: HealthResult }[] = [];
			for (const [registryId, entry] of entries) {
				results.push({
					registryId,
					result: await checkAgent(registryId, entry),
				});
			}

			for (const { registryId, result } of results) {
				printHealth(registryId, result);
			}

			if (results.some(({ result }) => !result.healthy)) process.exit(1);
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}

export async function doctor(registryId?: string): Promise<void> {
	registryId
		? await checkSingleAgentHealth(registryId)
		: await checkAllAgentsHealth();
}
