import { describe, expect, mock, test } from "bun:test";
import {
	type SessionConfigAgent,
	setSessionConfigOption,
} from "./session-config";

describe("setSessionConfigOption", () => {
	test("forwards sessionId, configId, and value to the agent", async () => {
		const setOption = mock(async () => ({}) as never);
		const agent: SessionConfigAgent = {
			setSessionConfigOption: setOption,
		};

		await setSessionConfigOption(agent, "session-1", "model", "gpt-4");

		expect(setOption).toHaveBeenCalledWith({
			sessionId: "session-1",
			configId: "model",
			value: "gpt-4",
		});
	});
});
