import { beforeEach, describe, expect, mock, test } from "bun:test";
import { useAgentCatalogStore } from "../stores/agent-catalog";
import { applyDraftPreferences, bindDraftForSend } from "./prepare-draft-send";

function createMutations() {
	return {
		setModel: mock(async () => undefined),
		setMode: mock(async () => undefined),
		setEffort: mock(async () => undefined),
		setPersona: mock(async () => undefined),
	};
}

describe("applyDraftPreferences", () => {
	beforeEach(() => {
		useAgentCatalogStore.setState({
			selectionByThread: {},
		});
	});

	test("applies locally held model/mode/effort/persona to the session", async () => {
		useAgentCatalogStore.getState().setModel("thread-1", "model-a");
		useAgentCatalogStore.getState().setMode("thread-1", "mode-a");
		useAgentCatalogStore.getState().setEffort("thread-1", "effort-a");
		useAgentCatalogStore.getState().setPersona("thread-1", "persona-a");

		const mutations = createMutations();
		await applyDraftPreferences(
			"thread-1",
			"project-1",
			"mock-agent",
			mutations
		);

		expect(mutations.setModel).toHaveBeenCalledWith({
			agentName: "mock-agent",
			modelId: "model-a",
			projectId: "project-1",
			threadId: "thread-1",
		});
		expect(mutations.setMode).toHaveBeenCalledWith({
			agentName: "mock-agent",
			modeId: "mode-a",
			projectId: "project-1",
			threadId: "thread-1",
		});
		expect(mutations.setEffort).toHaveBeenCalledWith({
			agentName: "mock-agent",
			effortId: "effort-a",
			projectId: "project-1",
			threadId: "thread-1",
		});
		expect(mutations.setPersona).toHaveBeenCalledWith({
			agentName: "mock-agent",
			personaId: "persona-a",
			projectId: "project-1",
			threadId: "thread-1",
		});
	});

	test("skips unset preferences", async () => {
		useAgentCatalogStore.getState().setModel("thread-1", "model-a");
		const mutations = createMutations();
		await applyDraftPreferences(
			"thread-1",
			"project-1",
			"mock-agent",
			mutations
		);

		expect(mutations.setModel).toHaveBeenCalledTimes(1);
		expect(mutations.setMode).not.toHaveBeenCalled();
		expect(mutations.setEffort).not.toHaveBeenCalled();
		expect(mutations.setPersona).not.toHaveBeenCalled();
	});
});

describe("bindDraftForSend", () => {
	beforeEach(() => {
		useAgentCatalogStore.setState({
			selectionByThread: {},
		});
	});

	test("binds then applies local prefs on a draft", async () => {
		useAgentCatalogStore.getState().setModel("thread-1", "model-a");
		useAgentCatalogStore.getState().setMode("thread-1", "mode-a");

		const bindAgent = mock(async () => undefined);
		const mutations = createMutations();

		const result = await bindDraftForSend({
			isDraft: true,
			agentName: "mock-agent",
			committedAgentName: "",
			threadId: "thread-1",
			projectId: "project-1",
			bindAgent,
			mutations,
		});

		expect(result.isOk()).toBe(true);
		if (result.isErr()) throw new Error("expected bind-at-send to succeed");
		expect(result.value).toBe("mock-agent");
		expect(bindAgent).toHaveBeenCalledWith({
			threadId: "thread-1",
			projectId: "project-1",
			agentName: "mock-agent",
		});
		expect(mutations.setModel).toHaveBeenCalled();
		expect(mutations.setMode).toHaveBeenCalled();
	});

	test("skips bind for committed threads", async () => {
		const bindAgent = mock(async () => undefined);
		const mutations = createMutations();

		const result = await bindDraftForSend({
			isDraft: false,
			agentName: "ignored",
			committedAgentName: "locked-agent",
			threadId: "thread-1",
			projectId: "project-1",
			bindAgent,
			mutations,
		});

		expect(result.isOk()).toBe(true);
		if (result.isErr()) throw new Error("expected committed send to succeed");
		expect(result.value).toBe("locked-agent");
		expect(bindAgent).not.toHaveBeenCalled();
		expect(mutations.setModel).not.toHaveBeenCalled();
	});

	test("returns an error value when bind fails", async () => {
		const bindAgent = mock(() => Promise.reject(new Error("bind failed")));
		const mutations = createMutations();

		const result = await bindDraftForSend({
			isDraft: true,
			agentName: "mock-agent",
			committedAgentName: "",
			threadId: "thread-1",
			projectId: "project-1",
			bindAgent,
			mutations,
		});

		expect(result.isErr()).toBe(true);
		if (result.isOk()) throw new Error("expected bind failure");
		expect(result.error.message).toBe("bind failed");
		expect(mutations.setModel).not.toHaveBeenCalled();
	});
});
