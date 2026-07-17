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

export type CatalogField = "model" | "mode" | "effort" | "persona";

export type CatalogOpsDeps = {
	agentName: string;
	pool: AgentPool;
	sessions: ThreadSessionStore;
};

export type CatalogFieldValue = {
	model: ModelOption[];
	mode: SelectOption[];
	effort: SelectOption[];
	persona: SelectOption[];
};

export async function getCatalogField<F extends CatalogField>(
	deps: CatalogOpsDeps,
	field: F,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string
): Promise<CatalogFieldValue[F]> {
	await deps.sessions.ensureHealthyPool();
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	return readField(session, field);
}

export async function setCatalogField(
	deps: CatalogOpsDeps,
	field: CatalogField,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	value: string
): Promise<void> {
	await deps.sessions.ensureHealthyPool();
	switch (field) {
		case "model":
			await setModel(deps, threadId, projectId, cwd, sessionId, value);
			return;
		case "mode":
			await setMode(deps, threadId, projectId, cwd, sessionId, value);
			return;
		case "effort":
			await setEffort(deps, threadId, projectId, cwd, sessionId, value);
			return;
		case "persona":
			await setPersona(deps, threadId, projectId, cwd, sessionId, value);
			return;
		default: {
			const _exhaustive: never = field;
			throw new Error(`unsupported catalog field: ${_exhaustive}`);
		}
	}
}

export async function getAgentCapabilities(
	deps: CatalogOpsDeps
): Promise<Record<string, unknown>> {
	await deps.sessions.ensureHealthyPool();
	const runtime = await deps.pool.getRuntime(deps.agentName);
	return runtime.agentCapabilities ?? {};
}

function readField<F extends CatalogField>(
	session: RuntimeSession,
	field: F
): CatalogFieldValue[F] {
	switch (field) {
		case "model":
			return modelsFromSession(session) as CatalogFieldValue[F];
		case "mode":
			return modesFromSession(session) as CatalogFieldValue[F];
		case "effort":
			return effortsFromSession(session) as CatalogFieldValue[F];
		case "persona":
			return personasFromSession(session) as CatalogFieldValue[F];
		default: {
			const _exhaustive: never = field;
			return _exhaustive;
		}
	}
}

async function setModel(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	modelId: string
): Promise<void> {
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

async function setMode(
	deps: CatalogOpsDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	modeId: string
): Promise<void> {
	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	await session.setMode(modeId);
}

async function setEffort(
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

async function setPersona(
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
