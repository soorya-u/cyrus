import { controllerContract } from "@cyrus/connections/contracts/controller";
import type { RtcContext } from "@cyrus/connections/rtc/peer";
import type { ChatChunk } from "@cyrus/connections/schemas/rtc";
import { implement } from "@orpc/server";
import { print } from "@/utils/style";

const os = implement(controllerContract).$context<RtcContext>();

export const controllerRouter = {
	hello: os.hello.handler(({ input, context }) => ({
		greeting: `hello ${input.name}`,
		peerId: context.peerId,
	})),

	chat: os.chat.handler(async function* ({ input, context }) {
		print.line`← ${context.peerId}: ${input.message}`;
		print.dim`  streaming reply to all controllers…`;
		for (const chunk of input.message) {
			const c: ChatChunk = { chunk };
			yield c;
			context.broadcaster.broadcast(c, context.peerId);
			await Bun.sleep(25);
		}
	}),

	subscribe: os.subscribe.handler(async function* ({ context }) {
		for await (const event of context.broadcaster.subscribe(context.peerId)) {
			yield event as ChatChunk;
		}
	}),
};
