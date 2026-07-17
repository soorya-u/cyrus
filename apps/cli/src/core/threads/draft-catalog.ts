import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import {
	type CoordinatorError,
	coordinatorRepositoryError,
} from "@cyrus/errors/coordinator";
import type { GetDraftCatalogOutput } from "@cyrus/schemas/rtc/catalog";
import { Result } from "better-result";
import type { CoordinatorHost } from "./types";

export type DraftCatalog = Pick<
	GetDraftCatalogOutput,
	"capabilities" | "models" | "modes" | "efforts" | "personas" | "commands"
>;

/** Spawn a probe session at the project dir, capture catalog, close, return. */
export async function getDraftCatalog(
	host: CoordinatorHost,
	agentName: string,
	projectId: string
): Promise<Result<DraftCatalog, CoordinatorError>> {
	const cwd = await resolveProjectCwd(projectId);
	if (cwd.isErr()) {
		return Result.err(coordinatorRepositoryError(cwd.error));
	}

	return host.withRuntime(() =>
		host.getAgent(agentName).probeCatalog(cwd.value)
	);
}
