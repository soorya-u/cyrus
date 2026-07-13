import { mkdir } from "node:fs/promises";
import type { RepositoryError } from "@cyrus/errors/repository";
import { notFound } from "@cyrus/errors/repository";
import type { Project } from "@cyrus/schemas/rtc/projects";
import { ProjectSchema } from "@cyrus/schemas/rtc/projects";
import { randomId } from "@cyrus/utils/identity";
import { Result } from "better-result";
import { asc, eq } from "drizzle-orm";
import { connection } from "../connection";
import { projects } from "../models/projects";
import { repo, repoArgs } from "../utils/repo";

export type { Project } from "@cyrus/schemas/rtc/projects";

export const listProjects = repo(async () => {
	const rows = await connection.db
		.select()
		.from(projects)
		.orderBy(asc(projects.id));
	return rows.map((row) => ProjectSchema.parse(row));
});

export const getProject = repoArgs(async (projectId: string) => {
	const [row] = await connection.db
		.select()
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);
	return row ? ProjectSchema.parse(row) : undefined;
});

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

export const createProject = repoArgs<[name: string, cwd?: string], Project>(
	async (name, cwd = "") => {
		const id = randomId();
		const resolvedCwd = cwd.trim();
		if (resolvedCwd) await mkdir(resolvedCwd, { recursive: true });

		await connection.db.insert(projects).values({
			id,
			cwd: resolvedCwd,
			name,
		});
		return ProjectSchema.parse({ id, cwd: resolvedCwd, name });
	}
);

const writeProjectName = repoArgs(
	async (projectId: string, name: string, current: Project) => {
		await connection.db
			.update(projects)
			.set({ name })
			.where(eq(projects.id, projectId));
		return ProjectSchema.parse({ ...current, name });
	}
);

export async function renameProject(
	projectId: string,
	name: string
): Promise<Result<Project, RepositoryError>> {
	const existing = await getProject(projectId);
	if (existing.isErr()) return Result.err(existing.error);
	if (!existing.value) {
		return Result.err(notFound("project", projectId));
	}

	return writeProjectName(projectId, name, existing.value);
}

export const deleteProject = repoArgs(async (projectId: string) => {
	const deleted = await connection.db
		.delete(projects)
		.where(eq(projects.id, projectId))
		.returning({ id: projects.id });
	return deleted.length > 0;
});
