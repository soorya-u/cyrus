import { mkdir } from "node:fs/promises";
import type { Project } from "@cyrus/schemas/rtc/projects";
import { ProjectSchema } from "@cyrus/schemas/rtc/projects";
import { randomId } from "@cyrus/utils/identity";
import { Result } from "better-result";
import { asc, eq } from "drizzle-orm";
import { connection } from "../connection";
import { projects } from "../models/projects";
import type { RepositoryError } from "../utils/error";
import { notFound, tryRepo } from "../utils/error";

export type { Project } from "@cyrus/schemas/rtc/projects";

export function listProjects(): Promise<Result<Project[], RepositoryError>> {
	return tryRepo(async () => {
		const rows = await connection.db
			.select()
			.from(projects)
			.orderBy(asc(projects.id));
		return rows.map((row) => ProjectSchema.parse(row));
	});
}

export function getProject(
	projectId: string
): Promise<Result<Project | undefined, RepositoryError>> {
	return tryRepo(async () => {
		const [row] = await connection.db
			.select()
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1);
		return row ? ProjectSchema.parse(row) : undefined;
	});
}

export async function resolveProjectCwd(
	projectId: string
): Promise<Result<string, RepositoryError>> {
	const project = await getProject(projectId);
	if (project.isErr()) return Result.err(project.error);
	if (!project.value) return Result.err(notFound("project", projectId));

	const cwd = project.value.cwd.trim();
	if (cwd) await mkdir(cwd, { recursive: true });

	return Result.ok(cwd);
}

export function createProject(
	name: string,
	cwd = ""
): Promise<Result<Project, RepositoryError>> {
	return tryRepo(async () => {
		const id = randomId();
		const resolvedCwd = cwd.trim();
		if (resolvedCwd) await mkdir(resolvedCwd, { recursive: true });

		await connection.db.insert(projects).values({
			id,
			cwd: resolvedCwd,
			name,
		});
		return ProjectSchema.parse({ id, cwd: resolvedCwd, name });
	});
}

export async function renameProject(
	projectId: string,
	name: string
): Promise<Result<Project, RepositoryError>> {
	const existing = await getProject(projectId);
	if (existing.isErr()) return Result.err(existing.error);
	if (!existing.value) {
		return Result.err(notFound("project", projectId));
	}
	const current = existing.value;

	return tryRepo(async () => {
		await connection.db
			.update(projects)
			.set({ name })
			.where(eq(projects.id, projectId));
		return ProjectSchema.parse({ ...current, name });
	});
}

export function deleteProject(
	projectId: string
): Promise<Result<boolean, RepositoryError>> {
	return tryRepo(async () => {
		const deleted = await connection.db
			.delete(projects)
			.where(eq(projects.id, projectId))
			.returning({ id: projects.id });
		return deleted.length > 0;
	});
}
