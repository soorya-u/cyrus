import { listEnabledAgents } from "@/store/agents";
import type { ControllerOs } from "./deps";

export function agentsHandlers(os: ControllerOs) {
	return {
		listAgents: os.listAgents.handler(async () => ({
			agents: await listEnabledAgents(),
		})),
	};
}
