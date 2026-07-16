import type { CoordinatorError } from "@cyrus/errors/coordinator";
import type { ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { SelectOption } from "@cyrus/schemas/rtc/common";
import { Result } from "better-result";
import type { CoordinatorHost } from "./types";

export async function getModels(
	host: CoordinatorHost,
	threadId: string
): Promise<Result<ModelOption[], CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.getModels(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
	);
}

export async function getModes(
	host: CoordinatorHost,
	threadId: string
): Promise<Result<SelectOption[], CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.getModes(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
	);
}

export async function getEfforts(
	host: CoordinatorHost,
	threadId: string
): Promise<Result<SelectOption[], CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.getEfforts(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
	);
}

export async function getPersonas(
	host: CoordinatorHost,
	threadId: string
): Promise<Result<SelectOption[], CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.getPersonas(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
	);
}

export async function setModel(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	modelId: string
): Promise<Result<void, CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId, projectId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.setModel(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				modelId
			)
	);
}

export async function setMode(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	modeId: string
): Promise<Result<void, CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId, projectId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.setMode(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				modeId
			)
	);
}

export async function setEffort(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	effortId: string
): Promise<Result<void, CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId, projectId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.setEffort(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				effortId
			)
	);
}

export async function setPersona(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	personaId: string
): Promise<Result<void, CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId, projectId);
	if (bound.isErr()) return Result.err(bound.error);
	return host.withRuntime(() =>
		host
			.getAgent(bound.value.agentName)
			.setPersona(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				personaId
			)
	);
}

export async function getContextUsage(
	host: CoordinatorHost,
	threadId: string
): Promise<Result<{ used?: number; limit?: number } | null, CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId);
	if (bound.isErr()) return Result.err(bound.error);
	return Result.ok(
		host.getAgent(bound.value.agentName).getContextUsage(threadId)
	);
}
