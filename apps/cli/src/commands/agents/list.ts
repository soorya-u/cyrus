import { listAgents } from "@/store/agents";
import { print } from "@/utils/style";

export async function list(): Promise<void> {
	const agents = await listAgents();
	const names = Object.keys(agents).sort();

	if (names.length === 0) {
		print.dim`No agents registered. Add one with \`cyrusd agents add <name> --cmd <command>\`.`;
		return;
	}

	for (const name of names) {
		const entry = agents[name];
		if (!entry) continue;
		const args = entry.args.length > 0 ? ` ${entry.args.join(" ")}` : "";
		print.line`${name}: ${entry.command}${args}`;
	}
}
