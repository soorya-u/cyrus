import { listAgents } from "@/store/agents";
import { print } from "@/utils/style";

export async function list(): Promise<void> {
	const agents = await listAgents();
	agents.match({
		ok: (registry) => {
			const ids = Object.keys(registry).sort();

			if (ids.length === 0) {
				print.dim`No agents enabled. Run \`cyrusd agents registry\` to browse, then \`cyrusd agents add <id>\`.`;
				return;
			}

			for (const id of ids) {
				const entry = registry[id];
				if (!entry) continue;
				print.line`${id}: ${entry.name}`;
				print.dim`  ${entry.icon}`;
			}
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}
