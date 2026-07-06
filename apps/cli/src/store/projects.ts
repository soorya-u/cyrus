// TODO: Delete this and store in turso
import { mkdirSync } from "node:fs";
import path from "node:path";
import { generateId } from "@/utils/identity";

export type Project = {
	id: string;
	cwd: string;
	name?: string;
};

export const DEFAULT_PROJECT_ID = "default";

const DEFAULT_CWD = "/tmp/cyrus-agent-test";

mkdirSync(DEFAULT_CWD, { recursive: true });

const projects = new Map<string, Project>();

export function listProjects(): Project[] {
	return [...projects.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function getProject(projectId: string): Project | undefined {
	return projects.get(projectId);
}

export function resolveProjectCwd(projectId: string): string {
	const project = getProject(projectId);
	if (!project) {
		throw new Error(`project not found: ${projectId}`);
	}
	mkdirSync(project.cwd, { recursive: true });
	return project.cwd;
}

export function createProject(name: string, cwd = ""): Project {
	const id = generateId();
	const resolvedCwd = cwd.trim() || path.join(DEFAULT_CWD, id);
	mkdirSync(resolvedCwd, { recursive: true });
	const project: Project = { id, cwd: resolvedCwd, name };
	projects.set(id, project);
	return project;
}

export function renameProject(projectId: string, name: string): Project {
	const project = projects.get(projectId);
	if (!project) {
		throw new Error(`project not found: ${projectId}`);
	}
	const updated = { ...project, name };
	projects.set(projectId, updated);
	return updated;
}

export function deleteProject(projectId: string): boolean {
	return projects.delete(projectId);
}
