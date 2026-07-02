import { PermissionDecision, type RuntimeHost } from "@acp-kit/core";

export function createDefaultHost(
	onAgentExit?: RuntimeHost["onAgentExit"]
): RuntimeHost {
	return {
		requestPermission: (request) => {
			const allow =
				request.options.find((o) => o.kind === "allow_once") ??
				request.options.find((o) => o.kind === "allow_always") ??
				request.options[0];

			if (!allow?.optionId) return Promise.resolve(PermissionDecision.Deny);

			return Promise.resolve(
				allow.kind === "allow_always"
					? PermissionDecision.AllowAlways
					: PermissionDecision.AllowOnce
			);
		},
		onAgentExit,
	};
}
