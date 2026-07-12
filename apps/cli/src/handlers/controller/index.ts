import type { WorkerRuntime } from "@/core";
import { agentsHandlers } from "./agents";
import { effortHandlers } from "./catalog/effort";
import { modeHandlers } from "./catalog/mode";
import { modelHandlers } from "./catalog/model";
import { personaHandlers } from "./catalog/persona";
import { chatHandlers } from "./chat";
import { defineControllerOs } from "./deps";
import { dirHandlers } from "./dir";
import { projectsHandlers } from "./projects";
import { threadsHandlers } from "./threads";

export function createControllerRouter(runtime: WorkerRuntime) {
	const os = defineControllerOs();
	const deps = { os, runtime };

	return {
		...agentsHandlers(deps),
		...projectsHandlers(deps),
		...threadsHandlers(deps),
		...dirHandlers(os),
		...modelHandlers(deps),
		...modeHandlers(deps),
		...effortHandlers(deps),
		...personaHandlers(deps),
		...chatHandlers(deps),
	};
}
