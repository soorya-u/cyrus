import { controllerContract } from "@cyrus/connections/contracts/controller";
import type { RtcContext } from "@cyrus/connections/rtc/peer";
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
		print.dim`  echoing back as a stream…`;
		for (const chunk of input.message) {
			yield { chunk };
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
	}),
};
