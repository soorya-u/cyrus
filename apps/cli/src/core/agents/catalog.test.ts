import { describe, expect, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import type { SessionConfigOption } from "@agentclientprotocol/sdk";
import {
	configOptionsToEfforts,
	configOptionsToModels,
	findSelectConfigOptionId,
	modelsFromSession,
	modesFromSession,
	reconcileInvalidSelectConfigOptions,
} from "./catalog";

function sessionWith(
	partial: Partial<RuntimeSession["transcript"]["session"]>
): RuntimeSession {
	return {
		sessionId: "s1",
		transcript: {
			session: {
				configOptions: [],
				commands: [],
				usage: {},
				...partial,
			},
		},
	} as unknown as RuntimeSession;
}

describe("modelsFromSession", () => {
	test("prefers availableModels when present", () => {
		const models = modelsFromSession(
			sessionWith({
				models: {
					currentModelId: "m1",
					availableModels: [
						{
							modelId: "m1",
							name: "Model 1",
							description: "desc",
						},
					],
				},
			})
		);
		expect(models).toEqual([
			{ id: "m1", name: "Model 1", description: "desc", context: null },
		]);
	});

	test("falls back to model config options", () => {
		const models = configOptionsToModels([
			{
				type: "select",
				id: "model",
				category: "model",
				name: "Model",
				currentValue: "a",
				options: [
					{ value: "a", name: "A" },
					{ value: "b", name: "B" },
				],
			},
		] as SessionConfigOption[]);
		expect(models.map((m) => m.id)).toEqual(["a", "b"]);
	});
});

describe("modesFromSession / efforts", () => {
	test("maps available modes", () => {
		const modes = modesFromSession(
			sessionWith({
				modes: {
					currentModeId: "ask",
					availableModes: [{ id: "ask", name: "Ask", description: "q" }],
				},
			})
		);
		expect(modes).toEqual([{ id: "ask", name: "Ask", description: "q" }]);
	});

	test("maps thought_level config options to efforts", () => {
		const efforts = configOptionsToEfforts([
			{
				type: "select",
				id: "effort",
				category: "thought_level",
				name: "Effort",
				currentValue: "low",
				options: [
					{ value: "low", name: "Low" },
					{ value: "high", name: "High" },
				],
			},
		] as SessionConfigOption[]);
		expect(efforts.map((e) => e.id)).toEqual(["low", "high"]);
	});
});

describe("findSelectConfigOptionId / reconcileInvalidSelectConfigOptions", () => {
	test("finds select option id by category", () => {
		const id = findSelectConfigOptionId(
			[
				{
					type: "select",
					id: "effort-id",
					category: "thought_level",
					name: "Effort",
					currentValue: "low",
					options: [{ value: "low", name: "Low" }],
				},
			] as SessionConfigOption[],
			"thought_level"
		);
		expect(id).toBe("effort-id");
	});

	test("reconciles invalid current values to the first valid option", () => {
		const resets = reconcileInvalidSelectConfigOptions([
			{
				type: "select",
				id: "model",
				category: "model",
				name: "Model",
				currentValue: "gone",
				options: [
					{ value: "a", name: "A" },
					{ value: "b", name: "B" },
				],
			},
			{
				type: "select",
				id: "mode",
				category: "mode",
				name: "Mode",
				currentValue: "ok",
				options: [{ value: "ok", name: "OK" }],
			},
		] as SessionConfigOption[]);

		expect(resets).toEqual([{ configId: "model", value: "a" }]);
	});
});
