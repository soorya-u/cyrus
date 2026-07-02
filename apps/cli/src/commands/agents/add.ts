import { addAgent } from "@/store/agents";
import { print } from "@/utils/style";
import type { AgentEntry } from "@/validators/agent";

export async function add(name: string, entry: AgentEntry): Promise<void> {
	const saved = await addAgent(name, entry);
	saved.match({
		ok: () => {
			const args = entry.args.length > 0 ? ` ${entry.args.join(" ")}` : "";
			print.success`✓ added agent "${name}" with command ${entry.command}${args}`;
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}
