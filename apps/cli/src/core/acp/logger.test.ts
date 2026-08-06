import { describe, expect, spyOn, test } from "bun:test";
import { log } from "evlog";
import { createWireErrorLogger } from "./logger";

describe("createWireErrorLogger", () => {
	test("logs the originating request when a response carries an error", async () => {
		const errorSpy = spyOn(log, "error").mockImplementation(() => undefined);
		const middleware = createWireErrorLogger();
		const next = async () => undefined;

		await middleware(
			{
				direction: "in",
				frame: {
					jsonrpc: "2.0",
					id: 1,
					method: "session/request_permission",
					params: { toolCall: { toolCallId: "tool-1" } },
				},
			},
			next
		);
		await middleware(
			{
				direction: "out",
				frame: {
					jsonrpc: "2.0",
					id: 1,
					error: { code: -32_602, message: "Invalid params" },
				},
			},
			next
		);

		expect(errorSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "acp_wire_request_error",
				method: "session/request_permission",
				params: { toolCall: { toolCallId: "tool-1" } },
				error: { code: -32_602, message: "Invalid params" },
			})
		);
		errorSpy.mockRestore();
	});

	test("never drops a frame, even without a matching request", async () => {
		const errorSpy = spyOn(log, "error").mockImplementation(() => undefined);
		const middleware = createWireErrorLogger();
		let nextCalls = 0;
		const next = () => {
			nextCalls++;
			return Promise.resolve();
		};

		await middleware({ direction: "in", frame: { foo: "bar" } }, next);
		await middleware(
			{ direction: "out", frame: { jsonrpc: "2.0", id: 99, error: {} } },
			next
		);

		expect(nextCalls).toBe(2);
		errorSpy.mockRestore();
	});
});
