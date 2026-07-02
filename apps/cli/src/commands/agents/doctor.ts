import { pingAcpAgent } from "@/core/acp/ping";
import { getAgent, listAgents } from "@/store/agents";
import { green, print, red } from "@/utils/style";
import type { AgentEntry } from "@/validators/agent";

type HealthResult = {
	healthy: boolean;
	error?: string;
};

async function checkAgent(entry: AgentEntry): Promise<HealthResult> {
	return (await pingAcpAgent(entry)).match<HealthResult>({
		ok: () => ({ healthy: true }),
		err: (error) => ({ healthy: false, error }),
	});
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
	entry.match({
		ok: async (agent) => {
			if (!agent) {
				print.error`agent "${name}" is not registered`;
				print.dim`Add it with \`cyrusd agents add ${name} --cmd <command>\`.`;
				process.exit(1);
			}

			const result = await checkAgent(agent);
			printHealth(name, result);
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
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}

export async function doctor(name?: string): Promise<void> {
	name ? await checkSingleAgentHealth(name) : await checkAllAgentsHealth();
}
