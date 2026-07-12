import { checkAgentHealth } from "@/core/agents/health";
import { getAgent, listAgents } from "@/store/agents";
import { createSpinner } from "@/utils/spinner";
import { green, print, red } from "@/utils/style";
import type { AgentEntry } from "@/validators/agent";

async function checkAgent(registryId: string, entry: AgentEntry) {
	const spinner = createSpinner(`Checking ${registryId}…`);
	spinner.start();
	const result = await checkAgentHealth(registryId, entry);
	spinner.stop();
	return result;
}

function printHealth(
	registryId: string,
	result: Awaited<ReturnType<typeof checkAgentHealth>>
): void {
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

			const results = await Promise.all(
				entries.map(async ([registryId, entry]) => ({
					registryId,
					result: await checkAgent(registryId, entry),
				}))
			);

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
