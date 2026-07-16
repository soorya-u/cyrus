import type { RuntimeSession } from "@acp-kit/core";
import type { ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { SelectOption } from "@cyrus/schemas/rtc/common";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import {
	effortsFromSession,
	findSelectConfigOptionId,
	modelsFromSession,
	modesFromSession,
	personasFromSession,
	reconcileInvalidSelectConfigOptions,
} from "./catalog";
import { setSessionConfigOption } from "./session-config";
import type { ThreadSessionStore } from "./sessions";

export type CatalogOpsDeps = {
	agentName: string;
	pool: AgentPool;
	sessions: ThreadSessionStore;
};

export async function getModels(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string
): Promise<ModelOption[]> {
	await deps.sessions.ensureHealthyPool();
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	return modelsFromSession(session);
}

export async function getModes(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string
): Promise<SelectOption[]> {
	await deps.sessions.ensureHealthyPool();
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	return modesFromSession(session);
}

export async function getEfforts(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string
): Promise<SelectOption[]> {
	await deps.sessions.ensureHealthyPool();
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	return effortsFromSession(session);
}

export async function getPersonas(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string
): Promise<SelectOption[]> {
	await deps.sessions.ensureHealthyPool();
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	return personasFromSession(session);
}

export async function getAgentCapabilities(
	deps: CatalogOpsDeps
): Promise<Record<string, unknown>> {
	await deps.sessions.ensureHealthyPool();
	const runtime = await deps.pool.getRuntime(deps.agentName);
	return runtime.agentCapabilities ?? {};
}

export async function setModel(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	modelId: string
): Promise<void> {
	await deps.sessions.ensureHealthyPool();
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	await session.setModel(modelId);
	// Model is already applied — reconcile is best-effort so a dependent
	// reset failure does not report setModel as failed (client refreshes on ok).
	await Result.tryPromise(() =>
		reconcileDependentConfigOptions(
			deps,
			threadId,
			projectId,
			cwd,
			sessionId,
			session
		)
	);
}

export async function setMode(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	modeId: string
): Promise<void> {
	await deps.sessions.ensureHealthyPool();
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	await session.setMode(modeId);
}

export async function setEffort(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	effortId: string
): Promise<void> {
	await setConfigOptionByCategory(
		deps,
		threadId,
		projectId,
		cwd,
		sessionId,
		"thought_level",
		effortId
	);
}

export async function setPersona(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	personaId: string
): Promise<void> {
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	const configId =
		findSelectConfigOptionId(
			session.transcript.session.configOptions,
			"persona"
		) ??
		session.transcript.session.configOptions.find(
			(option) =>
				option.type === "select" &&
				(option.category?.includes("persona") ||
					option.id.toLowerCase().includes("persona"))
		)?.id;

	if (!configId) {
		throw new Error(`agent ${deps.agentName} does not expose persona options`);
	}

	await setConfigOption(
		deps,
		threadId,
		projectId,
		cwd,
		sessionId,
		configId,
		personaId
	);
}

async function reconcileDependentConfigOptions(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	session: RuntimeSession
): Promise<void> {
	const resets = reconcileInvalidSelectConfigOptions(
		session.transcript.session.configOptions
	);
	for (const reset of resets) {
		await setConfigOption(
			deps,
			threadId,
			projectId,
			cwd,
			sessionId,
			reset.configId,
			reset.value
		);
	}
}

async function setConfigOptionByCategory(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	category: string,
	value: string
): Promise<void> {
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	const configId = findSelectConfigOptionId(
		session.transcript.session.configOptions,
		category
	);
	if (!configId) {
		throw new Error(
			`agent ${deps.agentName} does not expose ${category} options`
		);
	}
	await setConfigOption(
		deps,
		threadId,
		projectId,
		cwd,
		sessionId,
		configId,
		value
	);
}

async function setConfigOption(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	configId: string,
	value: string
): Promise<void> {
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);

	const connection = deps.pool.getSdkConnection(deps.agentName);
	if (!connection) {
		throw new Error(`agent ${deps.agentName} is not connected`);
	}

	await setSessionConfigOption(connection, session.sessionId, configId, value);
}
