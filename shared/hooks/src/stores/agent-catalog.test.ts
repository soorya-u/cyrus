import { describe, expect, test } from "vitest";
import { useAgentCatalogStore } from "./agent-catalog";

describe("agent-catalog store: catalog arming", () => {
	test("armCatalog marks a thread as armed exactly once", () => {
		useAgentCatalogStore.setState({ catalogArmedByThread: {} });

		expect(
			useAgentCatalogStore.getState().catalogArmedByThread["draft-1"]
		).toBeUndefined();

		useAgentCatalogStore.getState().armCatalog("draft-1");

		expect(
			useAgentCatalogStore.getState().catalogArmedByThread["draft-1"]
		).toBe(true);
	});

	test("armCatalog does not affect other threads", () => {
		useAgentCatalogStore.setState({ catalogArmedByThread: {} });

		useAgentCatalogStore.getState().armCatalog("draft-1");

		expect(
			useAgentCatalogStore.getState().catalogArmedByThread["draft-2"]
		).toBeUndefined();
	});

	test("clearCatalogArmed removes the armed flag for a thread", () => {
		useAgentCatalogStore.setState({ catalogArmedByThread: {} });
		useAgentCatalogStore.getState().armCatalog("draft-1");

		useAgentCatalogStore.getState().clearCatalogArmed("draft-1");

		expect(
			"draft-1" in useAgentCatalogStore.getState().catalogArmedByThread
		).toBe(false);
	});
});
