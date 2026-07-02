import { controllerContract } from "@cyrus/connections/contracts/controller";
import type { RtcContext } from "@cyrus/connections/rtc/peer";
import { implement } from "@orpc/server";
import type { WorkerRuntime } from "@/core";
import { env } from "@/lib/env";
import { listProjects } from "@/mocks/projects";
import { listAvailableAgents } from "@/store/agents";

export function createControllerRouter(runtime: WorkerRuntime) {
	const os = implement(controllerContract).$context<RtcContext>();

	return {
		listAgents: os.listAgents.handler(async () => ({
			agents: await listAvailableAgents(),
		})),

		listProjects: os.listProjects.handler(async () => ({
			projects: listProjects(),
		})),

		getModels: os.getModels.handler(async ({ input }) => ({
			models: await runtime.threadCoordinator.getModels(input.agentName),
		})),

		getModes: os.getModes.handler(async ({ input }) => ({
			modes: await runtime.threadCoordinator.getModes(input.agentName),
		})),

		getEfforts: os.getEfforts.handler(async ({ input }) => ({
			efforts: await runtime.threadCoordinator.getEfforts(input.agentName),
		})),

		getPersona: os.getPersona.handler(async ({ input }) => ({
			personas: await runtime.threadCoordinator.getPersonas(input.agentName),
		})),

		setModel: os.setModel.handler(async ({ input }) => {
			await runtime.threadCoordinator.setModel(
				input.agentName,
				input.threadId,
				input.projectId,
				input.modelId
			);
			return {};
		}),

		setMode: os.setMode.handler(async ({ input }) => {
			await runtime.threadCoordinator.setMode(
				input.agentName,
				input.threadId,
				input.projectId,
				input.modeId
			);
			return {};
		}),

		setEffort: os.setEffort.handler(async ({ input }) => {
			await runtime.threadCoordinator.setEffort(
				input.agentName,
				input.threadId,
				input.projectId,
				input.effortId
			);
			return {};
		}),

		setPersona: os.setPersona.handler(async ({ input }) => {
			await runtime.threadCoordinator.setPersona(
				input.agentName,
				input.threadId,
				input.projectId,
				input.personaId
			);
			return {};
		}),

		chat: os.chat.handler(async function* ({ input, context }) {
			const {
				agentName,
				threadId = Bun.randomUUIDv7(),
				message,
				projectId,
			} = input;
			const gen = runtime.threadCoordinator.prompt(
				agentName,
				threadId,
				projectId,
				message
			);
			for await (const event of gen) {
				context.broadcaster.broadcast(event, context.peerId);
				yield event;
				await Bun.sleep(env.CYRUS_STREAM_THROTTLING_MS);
			}
		}),

		subscribe: os.subscribe.handler(async function* ({ context }) {
			for await (const event of context.broadcaster.subscribe(context.peerId)) {
				yield event;
			}
		}),
	};
}
