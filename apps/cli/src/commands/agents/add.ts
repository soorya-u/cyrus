import {
	findRegistryAgent,
	preflightRegistryAgent,
	registryAgentToEntry,
} from "@/core/registry";
import { addAgent } from "@/store/agents";
import { print } from "@/utils/style";

export async function add(registryIds: string[]): Promise<void> {
	let failed = false;
	let unknownId = false;

	for (const registryId of registryIds) {
		const agent = await findRegistryAgent(registryId);
		if (!agent) {
			print.error`unknown registry id "${registryId}"`;
			failed = true;
			unknownId = true;
			continue;
		}

		const preflight = preflightRegistryAgent(agent);
		if (!preflight.ok) {
			print.error`${preflight.error}`;
			failed = true;
			continue;
		}

		const saved = await addAgent(registryId, registryAgentToEntry(agent));
		saved.match({
			ok: () => {
				print.success`✓ enabled agent "${registryId}" (${agent.name})`;
				for (const warning of preflight.warnings) print.line`  ⚠ ${warning}`;

				if (preflight.warnings.length > 0)
					print.dim`Run \`cyrusd agents doctor ${registryId}\` to verify.`;
			},
			err: (message) => {
				print.error`${message}`;
				failed = true;
			},
		});
	}

	if (unknownId) print.dim`Run \`cyrusd agents registry sync\` and try again.`;

	if (failed) process.exit(1);
}
