import { controllerContract } from "@cyrus/connections/contracts/controller";
import type { RtcContext } from "@cyrus/connections/rtc/peer";
import type { ChatChunk } from "@cyrus/connections/schemas/rtc";
import { implement } from "@orpc/server";
import type { WorkerRuntime } from "@/acp/runtime";
import { env } from "@/lib/env";
import { listAvailableAgents } from "@/store/agents";

export function createControllerRouter(runtime: WorkerRuntime) {
	const os = implement(controllerContract).$context<RtcContext>();

	return {
		listAgents: os.listAgents.handler(async () => ({
			agents: await listAvailableAgents(),
		})),

		chat: os.chat.handler(async function* ({ input, context }) {
			const { agentName, threadId = Bun.randomUUIDv7(), message, cwd } = input;
			const gen = runtime.sessionRouter.prompt(
				agentName,
				threadId,
				cwd,
				message
			);
			for await (const chunk of gen) {
				const c: ChatChunk = { chunk: JSON.stringify(chunk) };
				context.broadcaster.broadcast(c, context.peerId);
				yield c;
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
