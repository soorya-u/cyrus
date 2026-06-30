import { workerContract } from "@cyrus/connections/contracts/worker";
import type { RtcContext } from "@cyrus/connections/rtc/peer";
import { implement } from "@orpc/server";

const os = implement(workerContract).$context<RtcContext>();

// TODO: worker-to-worker isn't needed yet; this handler is a stub
export const workerRouter = {
	hello: os.hello.handler(({ input, context }) => ({
		greeting: `hello ${input.name}`,
		peerId: context.peerId,
	})),
};
