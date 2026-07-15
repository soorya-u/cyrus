import type { WorkerRuntime } from "@/core";
import { agentsHandlers } from "./agents";
import { contextHandlers } from "./catalog/context";
import { effortHandlers } from "./catalog/effort";
import { modeHandlers } from "./catalog/mode";
import { modelHandlers } from "./catalog/model";
import { personaHandlers } from "./catalog/persona";
import { chatHandlers } from "./chat";
import { defineControllerOs } from "./deps";
import { fsHandlers } from "./fs";
import { gitHandlers } from "./git";
import { interactiveHandlers } from "./interactive";
import { projectsHandlers } from "./projects";
import { threadsHandlers } from "./threads";

export function createControllerRouter(runtime: WorkerRuntime) {
	const os = defineControllerOs();
	const deps = { os, runtime };

	return {
		...agentsHandlers(deps),
		...projectsHandlers(deps),
		...threadsHandlers(deps),
		...fsHandlers(os),
		...gitHandlers(os),
		...modelHandlers(deps),
		...modeHandlers(deps),
		...effortHandlers(deps),
		...personaHandlers(deps),
		...contextHandlers(deps),
		...chatHandlers(deps),
		...interactiveHandlers(deps),
	};
}
