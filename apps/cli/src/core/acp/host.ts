import type { RuntimeHost } from "@acp-kit/core";
import { createInteractiveHost } from "./interactive";

/** Interactive ACP host (permissions block until respondApproval). */
export function createDefaultHost(
	onAgentExit?: RuntimeHost["onAgentExit"]
): RuntimeHost {
	return createInteractiveHost(onAgentExit);
}
