import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import { eventIterator, oc } from "@orpc/contract";
import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";
import { describe, expect, test } from "vitest";
import { z } from "zod";

// The worker serves watchGitFiles as a long-lived event iterator whose
// cleanup runs on `return()` or on the handler's abort signal. These tests pin
// that the oRPC peer layer delivers a controller-side close to the handler as
// an abort signal (the iterator's own return() is not called).
const contract = {
	watch: oc.output(eventIterator(z.object({}))),
};

function setup() {
	const state = { returned: false, aborted: false, started: false };
	const os = implement(contract);
	const router = os.router({
		watch: os.watch.handler(({ signal }) => {
			state.started = true;
			signal?.addEventListener("abort", () => {
				state.aborted = true;
			});
			let release:
				| ((result: IteratorResult<Record<string, never>>) => void)
				| undefined;
			const iterator: AsyncIteratorObject<
				Record<string, never>,
				unknown,
				void
			> = {
				next: () =>
					new Promise((resolve) => {
						release = resolve;
					}),
				return() {
					state.returned = true;
					release?.({ done: true, value: undefined });
					return Promise.resolve({ done: true, value: undefined });
				},
				[Symbol.asyncIterator]() {
					return iterator;
				},
				async [Symbol.asyncDispose]() {
					await iterator.return?.();
				},
			};
			return iterator;
		}),
	});

	const channel = new MessageChannel();
	new RPCHandler(router).upgrade(channel.port1);
	channel.port1.start();
	const client = createORPCClient<{
		watch: () => Promise<AsyncIterableIterator<unknown>>;
	}>(new RPCLink({ port: channel.port2 }));
	channel.port2.start();
	return {
		state,
		client,
		close: () => {
			channel.port1.close();
			channel.port2.close();
		},
	};
}

async function until(predicate: () => boolean, ms = 2000) {
	const deadline = Date.now() + ms;
	while (!predicate() && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

describe("event iterator cancellation over the oRPC peer layer", () => {
	test("client return() aborts the server handler signal", async () => {
		const { state, client, close } = setup();
		const iterator = await client.watch();
		const pending = iterator.next();
		await until(() => state.started);

		await iterator.return?.(undefined);
		await until(() => state.aborted);

		expect(state.aborted).toBe(true);
		await Promise.race([pending, new Promise((r) => setTimeout(r, 200))]);
		close();
	});

	test("client abort signal aborts the server handler signal", async () => {
		const { state, client, close } = setup();
		const controller = new AbortController();
		const iterator = await (
			client.watch as (
				input?: unknown,
				options?: { signal: AbortSignal }
			) => Promise<AsyncIterableIterator<unknown>>
		)(undefined, { signal: controller.signal });
		iterator.next().catch(() => undefined);
		await until(() => state.started);

		controller.abort();
		await until(() => state.aborted);

		expect(state.aborted).toBe(true);
		close();
	});

	test("a dropped connection aborts the server handler signal", async () => {
		const { state, client, close } = setup();
		const iterator = await client.watch();
		iterator.next().catch(() => undefined);
		await until(() => state.started);

		close();
		await until(() => state.aborted);

		expect(state.aborted).toBe(true);
	});
});
