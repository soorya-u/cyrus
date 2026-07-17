import { Result } from "better-result";
import { useAgentCatalogStore } from "../stores/agent-catalog";

type PrefMutations = {
	setModel: (input: {
		agentName: string;
		modelId: string;
		projectId: string;
		threadId: string;
	}) => Promise<unknown>;
	setMode: (input: {
		agentName: string;
		modeId: string;
		projectId: string;
		threadId: string;
	}) => Promise<unknown>;
	setEffort: (input: {
		agentName: string;
		effortId: string;
		projectId: string;
		threadId: string;
	}) => Promise<unknown>;
	setPersona: (input: {
		agentName: string;
		personaId: string;
		projectId: string;
		threadId: string;
	}) => Promise<unknown>;
};

/** Apply locally-held draft preferences to a freshly bound session. */
export async function applyDraftPreferences(
	threadId: string,
	projectId: string,
	agentName: string,
	mutations: PrefMutations
): Promise<void> {
	const prefs =
		useAgentCatalogStore.getState().selectionByThread[threadId] ?? {};
	const tasks: Promise<unknown>[] = [];
	if (prefs.modelId) {
		tasks.push(
			mutations.setModel({
				agentName,
				modelId: prefs.modelId,
				projectId,
				threadId,
			})
		);
	}
	if (prefs.modeId) {
		tasks.push(
			mutations.setMode({
				agentName,
				modeId: prefs.modeId,
				projectId,
				threadId,
			})
		);
	}
	if (prefs.effortId) {
		tasks.push(
			mutations.setEffort({
				agentName,
				effortId: prefs.effortId,
				projectId,
				threadId,
			})
		);
	}
	if (prefs.personaId) {
		tasks.push(
			mutations.setPersona({
				agentName,
				personaId: prefs.personaId,
				projectId,
				threadId,
			})
		);
	}
	await Promise.all(tasks);
}

export async function bindDraftForSend(options: {
	isDraft: boolean;
	agentName: string;
	committedAgentName: string;
	threadId: string;
	projectId: string;
	bindAgent: (input: {
		threadId: string;
		projectId: string;
		agentName: string;
	}) => Promise<unknown>;
	mutations: PrefMutations;
}): Promise<Result<string, Error>> {
	if (!options.isDraft) {
		if (!options.committedAgentName) {
			return Result.err(new Error("no agent selected"));
		}
		return Result.ok(options.committedAgentName);
	}

	if (!options.agentName) {
		return Result.err(new Error("no agent selected"));
	}

	try {
		await options.bindAgent({
			threadId: options.threadId,
			projectId: options.projectId,
			agentName: options.agentName,
		});
		await applyDraftPreferences(
			options.threadId,
			options.projectId,
			options.agentName,
			options.mutations
		);
		return Result.ok(options.agentName);
	} catch (error) {
		return Result.err(
			error instanceof Error ? error : new Error(String(error))
		);
	}
}
