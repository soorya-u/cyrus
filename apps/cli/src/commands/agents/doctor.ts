import { pingAcpAgent } from "@/acp/ping";
import { getAgent, listAgents } from "@/store/agents";
import { green, print, red } from "@/utils/style";
import type { AgentEntry } from "@/validators/agent";

type HealthResult = {
	healthy: boolean;
	error?: string;
};

async function checkAgent(entry: AgentEntry): Promise<HealthResult> {
	if (!Bun.which(entry.command))
		return {
			healthy: false,
			error: `command not found on PATH: ${entry.command}`,
		};

	const ping = await pingAcpAgent(entry);
	if (!ping.ok) {
		return { healthy: false, error: ping.error };
	}

	return { healthy: true };
}

function printHealth(name: string, result: HealthResult): void {
	const status = result.healthy ? green("healthy") : red("unhealthy");
	print.line`${name}: ${status}`;
	if (result.error) {
		print.line`  ${result.error}`;
	}
}

async function checkSingleAgentHealth(name: string) {
	const entry = await getAgent(name);
	if (!entry) {
		print.error`agent "${name}" is not registered`;
		print.dim`Add it with \`cyrusd agents add ${name} --cmd <command>\`.`;
		process.exit(1);
	}

	const result = await checkAgent(entry);
	printHealth(name, result);
	if (!result.healthy) process.exit(1);
}

async function checkAllAgentsHealth() {
	const agents = await listAgents();
	const entries = Object.entries(agents).sort(([a], [b]) => a.localeCompare(b));

	if (entries.length === 0) {
		print.dim`No agents registered. Add one with \`cyrusd agents add <name> --cmd <command>\`.`;
		process.exit(1);
	}

	const results = await Promise.all(
		entries.map(async ([name, entry]) => ({
			name,
			result: await checkAgent(entry),
		}))
	);

	for (const { name, result } of results) printHealth(name, result);

	if (results.some(({ result }) => !result.healthy)) process.exit(1);
}

export async function doctor(name?: string): Promise<void> {
	name ? await checkSingleAgentHealth(name) : await checkAllAgentsHealth();
}
