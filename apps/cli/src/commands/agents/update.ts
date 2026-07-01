import { getAgent, updateAgent } from "@/store/agents";
import { print } from "@/utils/style";
import type { AgentEntry } from "@/validators/agent";

type AgentUpdate = {
	command?: string;
	args?: string[];
};

export async function update(name: string, patch: AgentUpdate): Promise<void> {
	if (patch.command === undefined && patch.args === undefined) {
		print.error`provide --cmd or --args`;
		process.exit(1);
	}

	const existing = await getAgent(name);
	if (!existing) {
		print.error`agent "${name}" not found`;
		process.exit(1);
	}

	const entry: AgentEntry = {
		command: patch.command ?? existing.command,
		args: patch.args ?? existing.args,
	};

	const saved = await updateAgent(name, entry);
	saved.match({
		ok: () => {
			print.success`✓ updated agent "${name}"`;
			const args = entry.args.length > 0 ? ` ${entry.args.join(" ")}` : "";
			print.dim`  ${entry.command}${args}`;
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}
